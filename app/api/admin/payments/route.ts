import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  const supabase = await createClient()

  try {
    const { data: payments, error } = await supabase
      .from("booking_payments")
      .select(`
        id,
        amount,
        payment_type,
        payment_method,
        payment_date,
        remark,
        created_at,
        users (id, artist_name, studio_name)
      `)
      .order("payment_date", { ascending: false })
      .order("created_at", { ascending: false })

    if (error) throw error

    return NextResponse.json(payments)
  } catch (error) {
    console.error("Error fetching admin payments:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
