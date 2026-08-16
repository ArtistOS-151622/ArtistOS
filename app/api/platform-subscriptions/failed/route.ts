import { type NextRequest, NextResponse } from "next/server"
import { getArtistSession } from "@/lib/auth/session"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(request: NextRequest) {
  const session = getArtistSession(request)
  if (!session) return NextResponse.json({ status: false, message: "Unauthorized" }, { status: 401 })

  const body = await request.json()
  const paymentId = Number(body.payment_id)
  const errorDescription = body.error_description || "Payment failed"

  if (!paymentId) return NextResponse.json({ status: false, message: "payment_id required" }, { status: 400 })

  const supabase = createAdminClient()

  try {
    await supabase
      .from("platform_payments")
      .update({
        status: "failed",
        error_description: errorDescription,
      })
      .eq("id", paymentId)
      .eq("user_id", session.id)
      .eq("status", "pending")

    return NextResponse.json({ status: true, message: "Payment marked as failed" })
  } catch {
    return NextResponse.json({ status: false, message: "Failed to update status" }, { status: 500 })
  }
}
