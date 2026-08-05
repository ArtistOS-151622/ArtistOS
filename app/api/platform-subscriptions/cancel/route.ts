import { type NextRequest, NextResponse } from "next/server"
import { getArtistSession } from "@/lib/auth/session"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  const session = getArtistSession(request)
  if (!session) return NextResponse.json({ status: false, message: "Unauthorized" }, { status: 401 })

  const body = await request.json()
  const paymentId = Number(body.payment_id)

  if (!paymentId) return NextResponse.json({ status: false, message: "payment_id required" }, { status: 400 })

  const supabase = await createClient()

  try {
    await supabase
      .from("platform_payments")
      .delete()
      .eq("id", paymentId)
      .eq("user_id", session.id)
      .eq("status", "pending")

    return NextResponse.json({ status: true, message: "Payment cancelled" })
  } catch (err) {
    return NextResponse.json({ status: false, message: "Failed to cancel" }, { status: 500 })
  }
}
