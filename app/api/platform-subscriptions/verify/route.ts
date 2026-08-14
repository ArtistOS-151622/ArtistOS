import { type NextRequest } from "next/server"
import { getArtistSession } from "@/lib/auth/session"
import { verifyAndCompletePlatformPayment } from "@/lib/platform-billing"
import { portfolioError, portfolioSuccess } from "@/lib/portfolio/response"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  const session = getArtistSession(request)
  if (!session) return portfolioError("Unauthorized", 401)

  const body = await request.json()
  const paymentId = Number(body.payment_id)
  const razorpayPaymentId = String(body.razorpay_payment_id ?? "")
  const razorpaySignature = String(body.razorpay_signature ?? "")
  const razorpayOrderId = body.razorpay_order_id ? String(body.razorpay_order_id) : undefined
  const razorpaySubscriptionId = body.razorpay_subscription_id ? String(body.razorpay_subscription_id) : undefined

  if (!paymentId || !razorpayPaymentId || !razorpaySignature || (!razorpayOrderId && !razorpaySubscriptionId)) {
    return portfolioError("Missing payment verification fields", 400)
  }

  const supabase = await createClient()

  try {
    const completed = await verifyAndCompletePlatformPayment(supabase, session.id, {
      paymentId,
      razorpayOrderId,
      razorpaySubscriptionId,
      razorpayPaymentId,
      razorpaySignature,
    })

    return portfolioSuccess("Payment verified", { completed })
  } catch (err) {
    return portfolioError(err instanceof Error ? err.message : "Payment verification failed", 400)
  }
}
