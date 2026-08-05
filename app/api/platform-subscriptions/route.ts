import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  const supabase = await createClient()

  try {
    const { data: plans, error } = await supabase
      .from("platform_subscriptions")
      .select("*")
      .eq("is_active", true)
      .order("display_order", { ascending: true })
      .order("id", { ascending: true })

    if (error) throw error

    return NextResponse.json(plans)
  } catch (error) {
    console.error("Error fetching platform subscriptions:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
