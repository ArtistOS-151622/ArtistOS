import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// Get all storage plans
export async function GET() {
  const supabase = await createClient()

  try {
    const { data: plans, error } = await supabase
      .from("storage_plans")
      .select("*")
      .order("sort_order", { ascending: true })

    if (error) throw error

    return NextResponse.json(plans)
  } catch (error) {
    console.error("Error fetching storage plans:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Update a storage plan
export async function POST(req: Request) {
  const supabase = await createClient()

  try {
    const body = await req.json()
    const { id, name, storage_bytes, price_inr, is_active } = body

    if (!id) {
      return NextResponse.json({ error: "Plan ID is required" }, { status: 400 })
    }

    const { error } = await supabase
      .from("storage_plans")
      .update({
        name,
        storage_bytes,
        price_inr,
        is_active
      })
      .eq("id", id)

    if (error) throw error

    return NextResponse.json({ status: true, message: "Storage plan updated successfully" })
  } catch (error) {
    console.error("Error updating storage plan:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
