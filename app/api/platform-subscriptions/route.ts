import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getArtistSession } from "@/lib/auth/session"

export async function GET(request: NextRequest) {
  const supabase = await createClient()

  const session = getArtistSession(request)
  if (session) {
    const { data: user } = await supabase
      .from("users")
      .select("is_test_user")
      .eq("id", session.id)
      .single()
    
    if (user?.is_test_user) {
      return NextResponse.json([])
    }
  }

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
