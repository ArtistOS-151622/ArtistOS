import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  const supabase = await createClient()

  try {
    const { data: users, error } = await supabase
      .from("users")
      .select(`
        id, phone, artist_name, studio_name, address, email, created_at, updated_at,
        customers (count),
        bookings (id, status, created_at),
        booking_payments (amount),
        booking_expenses (amount),
        services (id),
        portfolio_storage_quotas (free_storage_bytes, purchase_storage_bytes, used_storage_bytes),
        portfolio_storage_purchases (status, amount, created_at),
        user_subscriptions (id, status, current_period_start, current_period_end, platform_subscriptions (name, amount_inr, billing_period, duration_in_days))
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
      const finalQuota = quota || { free_storage_bytes: 10000000, purchase_storage_bytes: 0, used_storage_bytes: 0 }
      
      const purchases = user.portfolio_storage_purchases || []
      const active_plans = purchases.filter((p: any) => p.status === 'active').length
      const total_storage_spent = purchases.reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0)

      // Platform subscription
      const allSubs: any[] = user.user_subscriptions || []
      const activeSub = allSubs.find((s: any) =>
        s.status === 'active' &&
        (!s.current_period_end || new Date(s.current_period_end) > now)
      ) ?? null
      const plan = activeSub?.platform_subscriptions ?? null
      const daysLeft = activeSub?.current_period_end
        ? Math.max(0, Math.ceil((new Date(activeSub.current_period_end).getTime() - now.getTime()) / 86400000))
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
          free_quota: Number(finalQuota.free_storage_bytes || 0),
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
