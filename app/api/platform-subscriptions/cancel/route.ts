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
        // The subscription is still live at Razorpay and will keep billing, so
        // leave the payment pending: it is the only record tying this artist to
        // that subscription, and the webhook still needs it to reconcile.
        console.error("Failed to cancel pending Razorpay subscription:", err)
        return NextResponse.json(
          { status: false, message: "Could not cancel the subscription with Razorpay" },
          { status: 502 }
        )
      }
    }

    // Mark, never delete -- ondismiss can fire while a capture is in flight, and
    // a deleted row leaves the webhook with nothing to reconcile against.
    await supabase
      .from("platform_payments")
      .update({ status: "cancelled" })
      .eq("id", paymentId)
      .eq("user_id", session.id)
      .eq("status", "pending")

    return NextResponse.json({ status: true, message: "Payment cancelled" })
  } catch {
    return NextResponse.json({ status: false, message: "Failed to cancel" }, { status: 500 })
  }
}
