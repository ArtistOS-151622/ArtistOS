import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  const supabase = await createClient()

  try {
    const { data: plans, error } = await supabase
      .from("platform_subscriptions")
      .select("*")
      .order("display_order", { ascending: true })
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
    const {
      name,
      description,
      amount_inr,
      compare_at_amount_inr,
      discount_percentage,
      gst_percentage,
      billing_period,
      features,
      is_active,
      is_featured,
      display_order,
    } = body

    const { data, error } = await supabase
      .from("platform_subscriptions")
      .insert([
        {
          name,
          description,
          amount_inr,
          compare_at_amount_inr: compare_at_amount_inr || null,
          discount_percentage: discount_percentage || null,
          gst_percentage: gst_percentage ?? 18,
          billing_period,
          features: features || [],
          is_active: is_active ?? true,
          is_featured: is_featured ?? false,
          display_order: display_order ?? 0
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
