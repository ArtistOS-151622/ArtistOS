import { createDbClient, createPreferredClient } from "#src/integrations/supabase.js"
import {
  ADMIN_SECURITY_PHONE,
  generate6DigitOtp,
  hashOtp,
  OTP_EXPIRY_MINUTES,
  persistOtpInDatabase,
  sendAdminDeleteOtp,
  verifyOtpInDatabase,
} from "#src/shared/otp.js"
import { FREE_USER_STORAGE_BYTES, STORAGE_FREE_TIER_BYTES } from "#src/shared/portfolio/config.js"
import { deleteFromR2 } from "#src/shared/portfolio/files.js"
import { invalidateReadOnlyCache } from "#src/shared/subscription/read-only.js"
import { ApiError, badRequest, notFound } from "#src/utils/api-error.js"
import { logger } from "#src/utils/logger.js"

const log = logger.child({ module: "admin-users" })

const MB = 1024 * 1024
const GB = 1024 * MB
const DAY_MS = 86_400_000
const LEGACY_FREE_TIER_BYTES = 10 * MB

const USER_RELATIONS = `
  customers (count),
  bookings (id, status, created_at),
  booking_payments (amount),
  booking_expenses (amount),
  services (id),
  portfolio_storage_quotas (free_storage_bytes, purchase_storage_bytes, used_storage_bytes),
  portfolio_storage_purchases (status, amount, created_at),
  user_subscriptions (id, status, current_period_start, current_period_end, next_billing_at, platform_subscriptions (name, amount_inr, billing_period, storage_quota_mb))
`
const USER_COLUMNS = "id, phone, artist_name, studio_name, address, email, created_at, updated_at, is_test_user, is_free_user"

const firstOf = (value) => (Array.isArray(value) ? value[0] : value)
const sumAmounts = (rows) => (rows || []).reduce((sum, row) => sum + (Number(row.amount) || 0), 0)

function summariseUser(user, now) {
  const bookings = user.bookings || []
  const counts = { pending: 0, confirmed: 0, completed: 0, cancelled: 0 }
  let lastBookingDate = null
  for (const booking of bookings) {
    if (Object.hasOwn(counts, booking.status)) counts[booking.status] += 1
    if (!lastBookingDate || new Date(booking.created_at) > new Date(lastBookingDate)) lastBookingDate = booking.created_at
  }

  const totalRevenue = sumAmounts(user.booking_payments)
  const totalExpenses = sumAmounts(user.booking_expenses)

  const quota = firstOf(user.portfolio_storage_quotas) || {
    free_storage_bytes: LEGACY_FREE_TIER_BYTES,
    purchase_storage_bytes: 0,
    used_storage_bytes: 0,
  }
  const purchases = user.portfolio_storage_purchases || []

  // Current platform subscription: active/pending and in period, else any active one.
  const subs = user.user_subscriptions || []
  const activeSub =
    subs.find((s) => {
      const end = s.next_billing_at || s.current_period_end
      return (s.status === "active" || s.status === "pending") && (!end || new Date(end) > now)
    }) ??
    subs.find((s) => s.status === "active") ??
    null
  const plan = firstOf(activeSub?.platform_subscriptions)
  const endDateStr = activeSub?.next_billing_at || activeSub?.current_period_end
  const daysLeft = endDateStr ? Math.max(0, Math.ceil((new Date(endDateStr).getTime() - now.getTime()) / DAY_MS)) : null

  const expectedTierBytes = user.is_free_user
    ? FREE_USER_STORAGE_BYTES
    : plan
      ? (Number(plan.storage_quota_mb) || (plan.name?.toLowerCase().includes("pro") ? 500 : 100)) * MB
      : STORAGE_FREE_TIER_BYTES
  const hasExplicitCustom =
    user.custom_storage_bytes !== null && user.custom_storage_bytes !== undefined && Number(user.custom_storage_bytes) > 0
  const customBytes = hasExplicitCustom ? Number(user.custom_storage_bytes) : null

  return {
    id: user.id,
    profile: {
      artist_name: user.artist_name,
      studio_name: user.studio_name,
      phone: user.phone,
      email: user.email,
      address: user.address,
      created_at: user.created_at,
      updated_at: user.updated_at,
      is_test_user: user.is_test_user || false,
      is_free_user: user.is_free_user || false,
    },
    customers: { total: user.customers?.[0]?.count || 0 },
    bookings: { total: bookings.length, ...counts, last_booking_date: lastBookingDate },
    financials: {
      total_revenue: totalRevenue,
      total_expenses: totalExpenses,
      net_profit: totalRevenue - totalExpenses,
      services_offered: user.services?.length || 0,
    },
    storage: {
      free_quota: customBytes !== null ? customBytes : expectedTierBytes,
      purchased_quota: Number(quota.purchase_storage_bytes || 0),
      used: Number(quota.used_storage_bytes || 0),
      custom_storage_bytes: customBytes,
      is_custom: Boolean(hasExplicitCustom),
      active_plans: purchases.filter((p) => p.status === "active").length,
      total_spent: sumAmounts(purchases),
    },
    subscription: activeSub
      ? {
          status: activeSub.status,
          plan_name: plan?.name ?? "Unknown",
          amount_inr: Number(plan?.amount_inr ?? 0),
          billing_period: plan?.billing_period ?? "",
          current_period_start: activeSub.current_period_start,
          current_period_end: activeSub.current_period_end,
          next_billing_at: activeSub.next_billing_at,
          days_left: daysLeft,
        }
      : null,
  }
}

/** Every artist with usage, revenue, storage and plan summaries (custom_storage_bytes when the column exists). */
export async function listUsers() {
  const supabase = createDbClient()
  const order = { ascending: false }

  const withCustom = await supabase
    .from("users")
    .select(`${USER_COLUMNS}, custom_storage_bytes,${USER_RELATIONS}`)
    .order("created_at", order)
  let data = withCustom.data
  // Older databases without users.custom_storage_bytes: retry without it.
  if (withCustom.error || !data) {
    const fallback = await supabase.from("users").select(`${USER_COLUMNS},${USER_RELATIONS}`).order("created_at", order)
    if (fallback.error) throw fallback.error
    data = fallback.data
  }

  const now = new Date()
  return (data || []).map((user) => summariseUser(user, now))
}

/** Storage the artist gets without an override: free user 500 MB, else their plan's, else the free tier. */
async function defaultFreeStorageBytes(supabase, userId) {
  const { data: user } = await supabase.from("users").select("is_free_user").eq("id", userId).maybeSingle()
  if (user?.is_free_user) return FREE_USER_STORAGE_BYTES

  const { data: activeSub } = await supabase
    .from("user_subscriptions")
    .select("platform_subscriptions(storage_quota_mb, has_whatsapp_automation)")
    .eq("user_id", userId)
    .in("status", ["active", "pending"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()
  const plan = activeSub?.platform_subscriptions
  return plan ? (Number(plan.storage_quota_mb) || (plan.has_whatsapp_automation ? 500 : 100)) * MB : STORAGE_FREE_TIER_BYTES
}

const setFreeStorage = (supabase, userId, bytes) =>
  supabase.from("portfolio_storage_quotas").upsert({ user_id: userId, free_storage_bytes: bytes }, { onConflict: "user_id" })

/**
 * Updates an artist's flags: is_test_user, is_free_user, and/or custom_storage_gb
 * (a positive number of GB, or null to reset to the plan default). → { success, user }
 */
export async function updateUser({ id, is_test_user, is_free_user, custom_storage_gb }) {
  if (
    !id ||
    (typeof is_test_user !== "boolean" && typeof is_free_user !== "boolean" && custom_storage_gb === undefined)
  ) {
    throw badRequest("Invalid request payload")
  }

  const supabase = createPreferredClient()
  const updates = {}
  if (typeof is_test_user === "boolean") updates.is_test_user = is_test_user
  if (typeof is_free_user === "boolean") updates.is_free_user = is_free_user

  if (custom_storage_gb !== undefined) {
    if (custom_storage_gb === null) {
      updates.custom_storage_bytes = null
      await setFreeStorage(supabase, id, await defaultFreeStorageBytes(supabase, id))
    } else {
      const gb = Number(custom_storage_gb)
      if (Number.isNaN(gb) || gb <= 0) throw badRequest("Storage quota must be a positive number of GB")
      updates.custom_storage_bytes = Math.round(gb * GB)
      await setFreeStorage(supabase, id, updates.custom_storage_bytes)
    }
  } else if (typeof is_free_user === "boolean") {
    // Toggling free status without an override: 500 MB or the legacy 10 MB.
    const { data: user } = await supabase.from("users").select("custom_storage_bytes").eq("id", id).maybeSingle()
    if (!user?.custom_storage_bytes) {
      await setFreeStorage(supabase, id, is_free_user ? FREE_USER_STORAGE_BYTES : LEGACY_FREE_TIER_BYTES)
    }
  }

  let updatedUser = null
  try {
    const { data, error } = await supabase.from("users").update(updates).eq("id", id).select().single()
    if (!error) {
      updatedUser = data
    } else if (error.message?.includes("custom_storage_bytes")) {
      // Older databases without the column: apply the rest.
      const { custom_storage_bytes: _omit, ...rest } = updates
      if (Object.keys(rest).length > 0) {
        const { data: fallback } = await supabase.from("users").update(rest).eq("id", id).select().single()
        updatedUser = fallback
      }
    } else {
      throw error
    }
  } catch (err) {
    log.warn({ message: err?.message }, "user table update notice")
  }

  invalidateReadOnlyCache(id)
  return { success: true, user: updatedUser }
}

/** Sends the delete-artist 2FA code to the admin's WhatsApp. */
export async function sendDeleteOtp() {
  const otp = generate6DigitOtp()
  const persisted = await persistOtpInDatabase(
    ADMIN_SECURITY_PHONE,
    hashOtp(otp),
    new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000)
  )
  if (!persisted.success) {
    throw new ApiError(persisted.isLocked ? 429 : 400, persisted.error || "Unable to send admin security OTP at this time.", {
      extra: { isLocked: persisted.isLocked, canResend: persisted.canResend, sendCount: persisted.sendCount },
    })
  }

  const sent = await sendAdminDeleteOtp(otp)
  if (!sent.success) {
    log.error({ error: sent.error }, "admin delete OTP delivery failed")
    throw new ApiError(500, sent.error || "Failed to deliver OTP to admin WhatsApp number")
  }

  return {
    success: true,
    message: `Security OTP sent to Admin WhatsApp (+91 ${ADMIN_SECURITY_PHONE})`,
    phone: ADMIN_SECURITY_PHONE,
    sendCount: persisted.sendCount,
    canResend: persisted.canResend,
  }
}

/**
 * Permanently deletes an artist and everything they own (R2 files first), after
 * checking the admin's WhatsApp 2FA code. → { success, deletedId }
 */
export async function deleteUser(rawId, rawOtp) {
  const id = Number(rawId)
  const otp = rawOtp ? String(rawOtp).trim() : null

  if (!id || Number.isNaN(id)) throw badRequest("Invalid user ID")
  if (!otp || !/^\d{6}$/.test(otp)) {
    throw badRequest(
      `Security OTP required. Please enter the 6-digit OTP sent to admin WhatsApp (+91 ${ADMIN_SECURITY_PHONE}).`
    )
  }

  const verification = await verifyOtpInDatabase(ADMIN_SECURITY_PHONE, otp)
  if (!verification.valid) {
    throw new ApiError(verification.isLocked ? 429 : 403, verification.reason || "Invalid security OTP. Action blocked.", {
      extra: {
        isLocked: verification.isLocked,
        needsResend: verification.needsResend,
        attemptsRemaining: verification.attemptsRemaining,
      },
    })
  }

  // Service role: removes rows regardless of RLS.
  const supabase = createPreferredClient()
  try {
    const { data: user, error: userError } = await supabase.from("users").select("id, phone").eq("id", id).maybeSingle()
    if (userError || !user) throw notFound("User not found")

    const { data: files } = await supabase.from("portfolio_files").select("storage_path").eq("user_id", id)
    const r2Keys = (files || []).map((f) => f.storage_path).filter(Boolean)
    if (r2Keys.length > 0) {
      try {
        await deleteFromR2(r2Keys)
      } catch (err) {
        log.warn({ err }, "failed to delete some R2 objects")
      }
    }

    // Avatar/logo reference the user's files: unlink first.
    await supabase.from("users").update({ avatar_file_id: null, studio_logo_file_id: null }).eq("id", id)

    const byUser = (table) => supabase.from(table).delete().eq("user_id", id)
    const idsOf = async (table) => ((await supabase.from(table).select("id").eq("user_id", id)).data || []).map((r) => r.id)

    for (const table of ["portfolio_files", "portfolio_folders", "portfolio_storage_purchases", "portfolio_storage_quotas"]) {
      await byUser(table)
    }

    const bookingIds = await idsOf("bookings")
    if (bookingIds.length > 0) {
      await supabase.from("booking_services").delete().in("booking_id", bookingIds)
      await supabase.from("booking_additional_charges").delete().in("booking_id", bookingIds)
    }
    for (const table of ["booking_payments", "booking_expenses", "expenses", "bookings"]) await byUser(table)

    const inquiryIds = await idsOf("inquiries")
    if (inquiryIds.length > 0) await supabase.from("inquiry_services").delete().in("inquiry_id", inquiryIds)
    await byUser("inquiries")

    const studentIds = await idsOf("students")
    if (studentIds.length > 0) await supabase.from("student_installments").delete().in("student_id", studentIds)
    for (const table of ["students", "courses", "services", "customers"]) await byUser(table)

    for (const table of ["notification_events", "push_subscriptions", "whatsapp_broadcast_logs", "whatsapp_broadcast_templates"]) {
      await byUser(table)
    }
    await supabase.from("support_messages").delete().eq("sender_id", id)
    for (const table of ["support_tickets", "user_settings", "user_subscriptions", "platform_payments"]) await byUser(table)

    if (user.phone) await supabase.from("whatsapp_otps").delete().eq("phone", user.phone)

    const { error: deleteError } = await supabase.from("users").delete().eq("id", id)
    if (deleteError) throw deleteError

    invalidateReadOnlyCache(id)
    return { success: true, deletedId: id }
  } catch (err) {
    if (err instanceof ApiError) throw err
    log.error({ err }, "failed to delete artist")
    throw new ApiError(500, err instanceof Error ? err.message : "Failed to delete artist")
  }
}
