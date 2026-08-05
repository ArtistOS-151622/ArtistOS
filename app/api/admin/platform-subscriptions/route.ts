import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  const supabase = await createClient()

  try {
    const { data: plans, error } = await supabase
      .from("platform_subscriptions")
      .select("*")
      .order("id", { ascending: true })

    if (error) throw error

    return NextResponse.json(plans)
  } catch (error) {
    console.error("Error fetching platform subscriptions:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const supabase = await createClient()

  try {
    const body = await req.json()
    const { name, description, amount_inr, billing_period, features, is_active, is_featured } = body

    const { data, error } = await supabase
      .from("platform_subscriptions")
      .insert([
        {
          name,
          description,
          amount_inr,
          billing_period,
          features: features || [],
          is_active: is_active ?? true,
          is_featured: is_featured ?? false
        }
      ])
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ status: true, data })
  } catch (error) {
    console.error("Error creating platform subscription:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
