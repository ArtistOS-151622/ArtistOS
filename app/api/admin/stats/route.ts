import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  const supabase = await createClient()

  try {
    const now = new Date().toISOString()

    const [
      { count: usersCount },
      { count: paymentsCount },
      { count: storagePurchasesCount },
      { count: paidUsersCount },
    ] = await Promise.all([
      supabase.from("users").select("*", { count: "exact", head: true }),
      supabase.from("booking_payments").select("*", { count: "exact", head: true }),
      supabase.from("portfolio_storage_purchases").select("*", { count: "exact", head: true }),
      supabase
        .from("user_subscriptions")
        .select("user_id", { count: "exact", head: true })
        .eq("status", "active")
        .gt("current_period_end", now),
    ])

    return NextResponse.json({
      users: usersCount || 0,
      payments: paymentsCount || 0,
      storagePurchases: storagePurchasesCount || 0,
      paidUsers: paidUsersCount || 0,
    })
  } catch (error) {
    console.error("Error fetching admin stats:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
