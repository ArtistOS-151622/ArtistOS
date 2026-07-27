import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  const supabase = await createClient()

  try {
    const [
      { count: usersCount },
      { count: paymentsCount },
      { count: storagePurchasesCount },
    ] = await Promise.all([
      supabase.from("users").select("*", { count: "exact", head: true }),
      supabase.from("booking_payments").select("*", { count: "exact", head: true }),
      supabase.from("portfolio_storage_purchases").select("*", { count: "exact", head: true }),
    ])

    return NextResponse.json({
      users: usersCount || 0,
      payments: paymentsCount || 0,
      storagePurchases: storagePurchasesCount || 0,
    })
  } catch (error) {
    console.error("Error fetching admin stats:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
