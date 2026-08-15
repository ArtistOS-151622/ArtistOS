import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()

  try {
    const resolvedParams = await params
    const id = parseInt(resolvedParams.id)
    if (isNaN(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 })

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
      .update({
        name,
        description,
        amount_inr,
        compare_at_amount_inr: compare_at_amount_inr || null,
        discount_percentage: discount_percentage || null,
        gst_percentage: gst_percentage ?? 18,
        billing_period,
        features: features || [],
        is_active,
        is_featured,
        display_order
      })
      .eq("id", id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ status: true, data })
  } catch (error) {
    console.error("Error updating platform subscription:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()

  try {
    const resolvedParams = await params
    const id = parseInt(resolvedParams.id)
    if (isNaN(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 })

    const { error } = await supabase
      .from("platform_subscriptions")
      .delete()
      .eq("id", id)

    if (error) throw error

    return NextResponse.json({ status: true, message: "Subscription deleted successfully" })
  } catch (error) {
    console.error("Error deleting platform subscription:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
