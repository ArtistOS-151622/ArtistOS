import { type NextRequest, NextResponse } from "next/server"
import { getArtistSession } from "@/lib/auth/session"
import { createClient } from "@/lib/supabase/server"

export async function POST(req: NextRequest) {
  try {
    const session = getArtistSession(req)
    if (!session) {
      return NextResponse.json({ status: false, message: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { purchase_id } = body

    if (!purchase_id) {
      return NextResponse.json({ status: false, message: "Missing purchase_id" }, { status: 400 })
    }

    const supabase = await createClient()

    // Ensure we only delete if it belongs to the user and is still "pending"
    const { error } = await supabase
      .from("portfolio_storage_purchases")
      .delete()
      .eq("id", purchase_id)
      .eq("user_id", session.id)
      .eq("status", "pending")

    if (error) {
      console.error("Error deleting canceled purchase:", error)
      return NextResponse.json({ status: false, message: "Failed to cancel purchase" }, { status: 500 })
    }

    return NextResponse.json({ status: true, message: "Purchase canceled successfully" })
  } catch (error) {
    console.error("Purchase cancel error:", error)
    return NextResponse.json(
      { status: false, message: "Internal server error" },
      { status: 500 }
    )
  }
}
