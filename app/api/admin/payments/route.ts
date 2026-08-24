import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  const supabase = await createClient()

  try {
    const { data: payments, error } = await supabase
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

    if (error) throw error

    return NextResponse.json(payments ?? [])
  } catch (error) {
    console.error("Error fetching admin payments:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
