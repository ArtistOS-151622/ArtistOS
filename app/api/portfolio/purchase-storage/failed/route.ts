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
    const { purchase_id, error_description } = body

    if (!purchase_id) {
      return NextResponse.json({ status: false, message: "Missing purchase_id" }, { status: 400 })
    }

    const supabase = await createClient()

    // Update status to failed only if it belongs to the user and is still pending
    const { error } = await supabase
      .from("portfolio_storage_purchases")
      .update({
        status: "failed",
      })
      .eq("id", purchase_id)
      .eq("user_id", session.id)
      .eq("status", "pending")

    if (error) {
      console.error("Error updating failed purchase:", error)
      return NextResponse.json({ status: false, message: "Failed to update purchase status" }, { status: 500 })
    }

    return NextResponse.json({ status: true, message: "Purchase marked as failed" })
  } catch (error) {
    console.error("Purchase failed error:", error)
    return NextResponse.json(
      { status: false, message: "Internal server error" },
      { status: 500 }
    )
  }
}
