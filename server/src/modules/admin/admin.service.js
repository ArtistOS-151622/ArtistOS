import { createDbClient } from "#src/integrations/supabase.js"
import { STORAGE_FREE_TIER_BYTES } from "#src/shared/portfolio/config.js"
import { badRequest } from "#src/utils/api-error.js"
import { logger } from "#src/utils/logger.js"

/*
 * Admin dashboard reads and catalogue edits (plans, storage plans, settings, tickets).
 * Unexpected database errors surface as 500 "Internal server error" (the error handler's
 * default), the same message the Next.js routes returned.
 */

const log = logger.child({ module: "admin" })
const MB = 1024 * 1024

async function rows(query) {
  const { data, error } = await query
  if (error) throw error
  return data
}

// --- overview -----------------------------------------------------------------------------

export async function getStats() {
  const supabase = createDbClient()
  const now = new Date().toISOString()
  const count = (query) => query.then(({ count: n }) => n || 0)

  const [users, payments, storagePurchases, paidUsers] = await Promise.all([
    count(supabase.from("users").select("*", { count: "exact", head: true })),
    count(supabase.from("booking_payments").select("*", { count: "exact", head: true })),
    count(supabase.from("portfolio_storage_purchases").select("*", { count: "exact", head: true })),
    count(
      supabase
        .from("user_subscriptions")
        .select("user_id", { count: "exact", head: true })
        .eq("status", "active")
        .gt("next_billing_at", now)
    ),
  ])
  return { users, payments, storagePurchases, paidUsers }
}

export async function listPlatformPayments() {
  const data = await rows(
    createDbClient()
      .from("platform_payments")
      .select(`
        id,
        user_id,
        plan_name,
        base_amount,
        amount,
        status,
        invoice_number,
        created_at,
        users (artist_name, studio_name, phone)
      `)
      .order("created_at", { ascending: false })
  )
  return data ?? []
}

/** Per-artist storage: free/purchased/used bytes and completed purchase history. */
export async function listStorageUsage() {
  const users = await rows(
    createDbClient()
      .from("users")
      .select(`
        id, artist_name, studio_name, phone, email, is_free_user,
        portfolio_storage_quotas (free_storage_bytes, purchase_storage_bytes, used_storage_bytes),
        portfolio_storage_purchases (
          id, storage_bytes, base_amount, amount, status, created_at, payment_method, quantity,
          rp_order_id, rp_payment_id, rp_subscription_id,
          storage_plans (name)
        )
      `)
      .order("created_at", { ascending: false })
  )

  return users.map((user) => {
    const rawQuota = user.portfolio_storage_quotas
    const quota = (Array.isArray(rawQuota) ? rawQuota[0] : rawQuota) || {
      free_storage_bytes: 10 * MB,
      purchase_storage_bytes: 0,
      used_storage_bytes: 0,
    }
    const history = (user.portfolio_storage_purchases || [])
      .filter((p) => p.status === "completed" || p.status === "active")
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    return {
      id: user.id,
      artist: { name: user.artist_name, studio: user.studio_name, phone: user.phone, email: user.email },
      storage: {
        free: user.is_free_user ? 100 * MB : Math.max(Number(quota.free_storage_bytes || 0), STORAGE_FREE_TIER_BYTES),
        purchased: Number(quota.purchase_storage_bytes || 0),
        used: Number(quota.used_storage_bytes || 0),
      },
      // "pending" here means the artist has never bought storage.
      status: history.length > 0 ? "active" : "pending",
      total_spent: history.reduce((sum, p) => sum + (Number(p.amount) || 0), 0),
      history,
    }
  })
}

// --- settings -------------------------------------------------------------------------------

/** platform_settings as { key: value }. */
export async function getSettings() {
  const settings = await rows(createDbClient().from("platform_settings").select("*").order("id", { ascending: true }))
  return Object.fromEntries(settings.map((s) => [s.key, s.value]))
}

/**
 * Updates existing settings (string values only; failures are logged, not fatal).
 * Note: the Next.js app's maintenance-mode cache (proxy.ts) can't be cleared from here,
 * so a toggle takes effect there within its 30 s TTL.
 */
export async function updateSettings(body) {
  const supabase = createDbClient()
  for (const [key, value] of Object.entries(body)) {
    if (typeof value !== "string") continue
    const { error } = await supabase.from("platform_settings").update({ value }).eq("key", key)
    if (error) log.error({ key, error }, "failed to update setting")
  }
  return { status: true, message: "Settings updated successfully" }
}

// --- platform plans ---------------------------------------------------------------------------

export function listPlatformPlans() {
  return rows(
    createDbClient()
      .from("platform_subscriptions")
      .select("*")
      .order("display_order", { ascending: true })
      .order("id", { ascending: true })
  )
}

const planFields = (body) => ({
  name: body.name,
  description: body.description,
  amount_inr: body.amount_inr,
  compare_at_amount_inr: body.compare_at_amount_inr || null,
  discount_percentage: body.discount_percentage || null,
  billing_period: body.billing_period,
  features: body.features || [],
})

export async function createPlatformPlan(body) {
  const data = await rows(
    createDbClient()
      .from("platform_subscriptions")
      .insert([
        {
          ...planFields(body),
          is_active: body.is_active ?? true,
          is_featured: body.is_featured ?? false,
          display_order: body.display_order ?? 0,
          has_whatsapp_automation: Boolean(body.has_whatsapp_automation),
          storage_quota_mb: Number(body.storage_quota_mb) || 10,
        },
      ])
      .select()
      .single()
  )
  return { status: true, data }
}

export async function updatePlatformPlan(id, body) {
  const update = {
    ...planFields(body),
    is_active: body.is_active,
    is_featured: body.is_featured,
    display_order: body.display_order,
  }
  if (body.has_whatsapp_automation !== undefined) update.has_whatsapp_automation = Boolean(body.has_whatsapp_automation)
  if (body.storage_quota_mb !== undefined) update.storage_quota_mb = Number(body.storage_quota_mb) || 10

  const data = await rows(createDbClient().from("platform_subscriptions").update(update).eq("id", id).select().single())
  return { status: true, data }
}

export async function deletePlatformPlan(id) {
  const { error } = await createDbClient().from("platform_subscriptions").delete().eq("id", id)
  if (error) throw error
  return { status: true, message: "Subscription deleted successfully" }
}

// --- storage plans ----------------------------------------------------------------------------

export function listStoragePlans() {
  return rows(createDbClient().from("storage_plans").select("*").order("sort_order", { ascending: true }))
}

export async function updateStoragePlan({ id, name, storage_bytes, price_inr, is_active }) {
  if (!id) throw badRequest("Plan ID is required")
  const { error } = await createDbClient().from("storage_plans").update({ name, storage_bytes, price_inr, is_active }).eq("id", id)
  if (error) throw error
  return { status: true, message: "Storage plan updated successfully" }
}

// --- support tickets --------------------------------------------------------------------------

export function listTickets() {
  return rows(
    createDbClient()
      .from("support_tickets")
      .select("*, users(artist_name, studio_name, email, phone)")
      .order("created_at", { ascending: false })
  )
}

export async function setTicketStatus(id, status) {
  const { error } = await createDbClient().from("support_tickets").update({ status }).eq("id", id)
  if (error) throw error
  return { status: true, message: "Ticket updated" }
}

export function listTicketMessages(id) {
  return rows(createDbClient().from("support_ticket_messages").select("*").eq("ticket_id", id).order("created_at", { ascending: true }))
}

/** Admin reply; an "open" ticket moves to "in_progress" (waiting on the artist). */
export async function replyToTicket(id, message) {
  if (!message) throw badRequest("Message is required")
  const supabase = createDbClient()
  const { error } = await supabase.from("support_ticket_messages").insert({ ticket_id: Number(id), sender_type: "admin", message })
  if (error) throw error
  await supabase.from("support_tickets").update({ status: "in_progress" }).eq("id", id).eq("status", "open")
  return { status: true, message: "Reply sent" }
}
