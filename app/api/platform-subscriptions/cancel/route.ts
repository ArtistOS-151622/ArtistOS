import { type NextRequest, NextResponse } from "next/server"
import { getArtistSession } from "@/lib/auth/session"
import { getRazorpayClient } from "@/lib/razorpay/client"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(request: NextRequest) {
  const session = getArtistSession(request)
  if (!session) return NextResponse.json({ status: false, message: "Unauthorized" }, { status: 401 })

  const body = await request.json()
  const paymentId = Number(body.payment_id)

  if (!paymentId) return NextResponse.json({ status: false, message: "payment_id required" }, { status: 400 })

  const supabase = createAdminClient()

  try {
    const { data: payment } = await supabase
      .from("platform_payments")
      .select("id, rp_subscription_id")
      .eq("id", paymentId)
      .eq("user_id", session.id)
      .eq("status", "pending")
      .maybeSingle()

    if (payment?.rp_subscription_id) {
      try {
        const razorpay = getRazorpayClient()
        await razorpay.subscriptions.cancel(payment.rp_subscription_id, false)
      } catch (err) {
        console.error("Failed to cancel pending Razorpay subscription:", err)
      }
    }

    await supabase
      .from("platform_payments")
      .delete()
      .eq("id", paymentId)
      .eq("user_id", session.id)
      .eq("status", "pending")

    return NextResponse.json({ status: true, message: "Payment cancelled" })
  } catch {
    return NextResponse.json({ status: false, message: "Failed to cancel" }, { status: 500 })
  }
}
