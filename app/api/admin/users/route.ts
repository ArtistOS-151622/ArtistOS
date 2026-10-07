import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { deleteFromR2 } from "@/lib/portfolio/files"
import { STORAGE_FREE_TIER_BYTES } from "@/lib/portfolio/config"
import { verifyOtpInDatabase, ADMIN_SECURITY_PHONE } from "@/lib/auth/otp"

export async function GET() {
  const supabase = await createClient()

  try {
    const { data: users, error } = await supabase
      .from("users")
      .select(`
        id, phone, artist_name, studio_name, address, email, created_at, updated_at, is_test_user, is_free_user,
        customers (count),
        bookings (id, status, created_at),
        booking_payments (amount),
        booking_expenses (amount),
        services (id),
        portfolio_storage_quotas (free_storage_bytes, purchase_storage_bytes, used_storage_bytes),
        portfolio_storage_purchases (status, amount, created_at),
        user_subscriptions (id, status, current_period_start, current_period_end, next_billing_at, platform_subscriptions (name, amount_inr, billing_period))
      `)
      .order("created_at", { ascending: false })

    if (error) throw error

    const now = new Date()

    const formattedUsers = users.map((user: any) => {
      // Customers
      const customer_count = user.customers?.[0]?.count || 0

      // Bookings
      const bookings = user.bookings || []
      let pending = 0, confirmed = 0, completed = 0, cancelled = 0
      let last_booking_date: string | null = null
      bookings.forEach((b: any) => {
        if (b.status === 'pending') pending++
        if (b.status === 'confirmed') confirmed++
        if (b.status === 'completed') completed++
        if (b.status === 'cancelled') cancelled++
        if (!last_booking_date || new Date(b.created_at) > new Date(last_booking_date)) {
          last_booking_date = b.created_at
        }
      })

      // Financials
      const payments = user.booking_payments || []
      const total_revenue = payments.reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0)
      
      const expenses = user.booking_expenses || []
      const total_expenses = expenses.reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0)
      
      const services_offered = user.services?.length || 0

      // Storage
      const rawQuota = user.portfolio_storage_quotas
      const quota = Array.isArray(rawQuota) ? rawQuota[0] : rawQuota
      const finalQuota = quota || { free_storage_bytes: 10485760, purchase_storage_bytes: 0, used_storage_bytes: 0 }
      
      const purchases = user.portfolio_storage_purchases || []
      const active_plans = purchases.filter((p: any) => p.status === 'active').length
      const total_storage_spent = purchases.reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0)

      // Platform subscription
      const allSubs: any[] = user.user_subscriptions || []
      const activeSub = allSubs.find((s: any) => {
        const endDateStr = s.next_billing_at
        return s.status === 'active' && (!endDateStr || new Date(endDateStr) > now)
      }) ?? null
      const plan = activeSub?.platform_subscriptions ?? null
      const endDateStr = activeSub?.next_billing_at
      const daysLeft = endDateStr
        ? Math.max(0, Math.ceil((new Date(endDateStr).getTime() - now.getTime()) / 86400000))
        : null

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
        customers: {
          total: customer_count
        },
        bookings: {
          total: bookings.length,
          pending,
          confirmed,
          completed,
          cancelled,
          last_booking_date
        },
        financials: {
          total_revenue,
          total_expenses,
          net_profit: total_revenue - total_expenses,
          services_offered
        },
        storage: {
          free_quota: user.is_free_user
            ? 100 * 1024 * 1024
            : Math.max(Number(finalQuota.free_storage_bytes || 0), STORAGE_FREE_TIER_BYTES),
          purchased_quota: Number(finalQuota.purchase_storage_bytes || 0),
          used: Number(finalQuota.used_storage_bytes || 0),
          active_plans,
          total_spent: total_storage_spent
        },
        subscription: activeSub ? {
          status: activeSub.status,
          plan_name: plan?.name ?? 'Unknown',
          amount_inr: Number(plan?.amount_inr ?? 0),
          billing_period: plan?.billing_period ?? '',
          current_period_start: activeSub.current_period_start,
          current_period_end: activeSub.current_period_end,
          next_billing_at: activeSub.next_billing_at,
          days_left: daysLeft,
        } : null
      }
    })

    return NextResponse.json(formattedUsers)
  } catch (error) {
    console.error("Error fetching admin users:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  const supabase = await createClient()

  try {
    const body = await request.json()
    const { id, is_test_user, is_free_user } = body

    if (!id || (typeof is_test_user !== 'boolean' && typeof is_free_user !== 'boolean')) {
      return NextResponse.json({ error: "Invalid request payload" }, { status: 400 })
    }

    const updates: Record<string, boolean> = {}
    if (typeof is_test_user === 'boolean') updates.is_test_user = is_test_user
    if (typeof is_free_user === 'boolean') {
      updates.is_free_user = is_free_user
      // Automatically sync portfolio storage quota to 100MB (free user) or 10MB
      const targetQuotaBytes = is_free_user ? 100 * 1024 * 1024 : 10 * 1024 * 1024
      await supabase
        .from("portfolio_storage_quotas")
        .upsert(
          {
            user_id: id,
            free_storage_bytes: targetQuotaBytes,
          },
          { onConflict: "user_id" }
        )
    }

    const { data, error } = await supabase
      .from("users")
      .update(updates)
      .eq("id", id)
      .select("id, is_test_user, is_free_user")
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, user: data })
  } catch (error) {
    console.error("Error updating user status:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  // Use admin client with service role to bypass RLS and perform full cascade deletion
  const supabase = process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createAdminClient()
    : await createClient()

  try {
    let id: number | null = null
    let otp: string | null = null
    const url = new URL(request.url)
    const queryId = url.searchParams.get("id")
    const queryOtp = url.searchParams.get("otp")
    if (queryId) {
      id = Number(queryId)
      otp = queryOtp ? String(queryOtp).trim() : null
    } else {
      try {
        const body = await request.json()
        id = Number(body.id)
        otp = body.otp ? String(body.otp).trim() : null
      } catch {}
    }

    if (!id || Number.isNaN(id)) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 })
    }

    if (!otp || otp.length !== 6 || !/^\d{6}$/.test(otp)) {
      return NextResponse.json(
        { error: `Security OTP required. Please enter the 6-digit OTP sent to admin WhatsApp (+91 ${ADMIN_SECURITY_PHONE}).` },
        { status: 400 }
      )
    }

    // Verify OTP against ADMIN_SECURITY_PHONE in database
    const otpVerification = await verifyOtpInDatabase(ADMIN_SECURITY_PHONE, otp)
    if (!otpVerification.valid) {
      return NextResponse.json(
        {
          error: otpVerification.reason || "Invalid security OTP. Action blocked.",
          isLocked: otpVerification.isLocked,
          needsResend: otpVerification.needsResend,
          attemptsRemaining: otpVerification.attemptsRemaining,
        },
        { status: otpVerification.isLocked ? 429 : 403 }
      )
    }

    // Check user exists
    const { data: user, error: userErr } = await supabase
      .from("users")
      .select("id, phone")
      .eq("id", id)
      .maybeSingle()

    if (userErr || !user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // 1. Delete all portfolio files from Cloudflare R2
    const { data: files } = await supabase
      .from("portfolio_files")
      .select("storage_path")
      .eq("user_id", id)

    const r2Keys = (files || []).map((f) => f.storage_path).filter(Boolean)
    if (r2Keys.length > 0) {
      try {
        await deleteFromR2(r2Keys)
      } catch (err) {
        console.warn("[Admin Delete] Failed to delete some R2 keys:", err)
      }
    }

    // 2. Unlink circular avatar/logo file references from users table
    await supabase
      .from("users")
      .update({ avatar_file_id: null, studio_logo_file_id: null })
      .eq("id", id)

    // 3. Delete portfolio child records
    await supabase.from("portfolio_files").delete().eq("user_id", id)
    await supabase.from("portfolio_folders").delete().eq("user_id", id)
    await supabase.from("portfolio_storage_purchases").delete().eq("user_id", id)
    await supabase.from("portfolio_storage_quotas").delete().eq("user_id", id)

    // 4. Delete bookings related child records
    const { data: bookings } = await supabase
      .from("bookings")
      .select("id")
      .eq("user_id", id)
    const bookingIds = (bookings || []).map((b) => b.id)

    if (bookingIds.length > 0) {
      await supabase.from("booking_services").delete().in("booking_id", bookingIds)
      await supabase.from("booking_additional_charges").delete().in("booking_id", bookingIds)
    }

    await supabase.from("booking_payments").delete().eq("user_id", id)
    await supabase.from("booking_expenses").delete().eq("user_id", id)
    await supabase.from("expenses").delete().eq("user_id", id)
    await supabase.from("bookings").delete().eq("user_id", id)

    // 5. Delete inquiries
    const { data: inquiries } = await supabase
      .from("inquiries")
      .select("id")
      .eq("user_id", id)
    const inquiryIds = (inquiries || []).map((i) => i.id)
    if (inquiryIds.length > 0) {
      await supabase.from("inquiry_services").delete().in("inquiry_id", inquiryIds)
    }
    await supabase.from("inquiries").delete().eq("user_id", id)

    // 6. Delete courses, students, and student_installments
    const { data: students } = await supabase
      .from("students")
      .select("id")
      .eq("user_id", id)
    const studentIds = (students || []).map((s) => s.id)
    if (studentIds.length > 0) {
      await supabase.from("student_installments").delete().in("student_id", studentIds)
    }
    await supabase.from("students").delete().eq("user_id", id)
    await supabase.from("courses").delete().eq("user_id", id)

    // 7. Delete services and customers
    await supabase.from("services").delete().eq("user_id", id)
    await supabase.from("customers").delete().eq("user_id", id)

    // 8. Delete notifications, pushes, broadcasts, support, settings, subscriptions
    await supabase.from("notification_events").delete().eq("user_id", id)
    await supabase.from("push_subscriptions").delete().eq("user_id", id)
    await supabase.from("whatsapp_broadcast_logs").delete().eq("user_id", id)
    await supabase.from("whatsapp_broadcast_templates").delete().eq("user_id", id)
    await supabase.from("support_messages").delete().eq("sender_id", id)
    await supabase.from("support_tickets").delete().eq("user_id", id)
    await supabase.from("user_settings").delete().eq("user_id", id)
    await supabase.from("user_subscriptions").delete().eq("user_id", id)
    await supabase.from("platform_payments").delete().eq("user_id", id)

    // 9. Delete whatsapp_otps by user phone
    if (user.phone) {
      await supabase.from("whatsapp_otps").delete().eq("phone", user.phone)
    }

    // 10. Delete the user row itself
    const { error: delErr } = await supabase.from("users").delete().eq("id", id)
    if (delErr) throw delErr

    return NextResponse.json({ success: true, deletedId: id })
  } catch (error) {
    console.error("Error deleting artist:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete artist" },
      { status: 500 }
    )
  }
}
