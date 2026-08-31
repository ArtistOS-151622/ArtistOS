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

    // Mark, never delete. This runs from Razorpay's ondismiss handler, which can
    // fire while a capture is still in flight -- deleting the row would leave the
    // webhook with no purchase to credit and the artist charged for nothing.
    // A late capture can still complete a cancelled row, which is what we want.
    const { error } = await supabase
      .from("portfolio_storage_purchases")
      .update({ status: "cancelled" })
      .eq("id", purchase_id)
      .eq("user_id", session.id)
      .eq("status", "pending")

    if (error) {
      console.error("Error cancelling purchase:", error)
      return NextResponse.json({ status: false, message: "Failed to cancel purchase" }, { status: 500 })
    }

    return NextResponse.json({ status: true, message: "Purchase cancelled successfully" })
  } catch (error) {
    console.error("Purchase cancel error:", error)
    return NextResponse.json(
      { status: false, message: "Internal server error" },
      { status: 500 }
    )
  }
}
