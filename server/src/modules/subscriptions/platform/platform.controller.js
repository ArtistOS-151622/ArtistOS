import { createAdminClient, createDbClient } from "#src/integrations/supabase.js"
import { getArtistSession } from "#src/middlewares/require-artist.js"
import * as platformService from "#src/modules/subscriptions/platform/platform.service.js"
import { portfolioError, sendPortfolio } from "#src/shared/portfolio/response.js"
import { bodyOf } from "#src/utils/request.js"

/** { status, message } without `data`, the shape the failed/cancel endpoints always used. */
const bare = (res, status, ok, message) => res.status(status).json({ status: ok, message })

/** GET /api/platform-subscriptions: public plan list (empty for free accounts). */
export async function listPlans(req, res) {
  try {
    res.json(await platformService.listPlans(createDbClient(), getArtistSession(req)))
  } catch (err) {
    req.log.error({ err }, "failed to fetch platform subscriptions")
    res.status(500).json({ error: "Internal server error" })
  }
}

/** POST /purchase. Any failure is a 500 envelope with Razorpay's description when there is one. */
export async function purchase(req, res) {
  const planId = Number(bodyOf(req).plan_id)
  if (Number.isNaN(planId)) throw portfolioError("plan_id is required", 400)

  try {
    sendPortfolio(res, "Purchase initiated", await platformService.createPlatformPurchase(createAdminClient(), req.artist.id, planId), 201)
  } catch (err) {
    req.log.error({ statusCode: err?.statusCode || 500, errorCode: err?.error?.code }, "platform purchase failed")
    throw portfolioError(err?.error?.description || (err instanceof Error ? err.message : "Purchase failed"), 500)
  }
}

export async function verify(req, res) {
  const body = bodyOf(req)
  const paymentId = Number(body.payment_id)
  const razorpayPaymentId = String(body.razorpay_payment_id ?? "")
  const razorpaySignature = String(body.razorpay_signature ?? "")
  const razorpayOrderId = body.razorpay_order_id ? String(body.razorpay_order_id) : undefined
  const razorpaySubscriptionId = body.razorpay_subscription_id ? String(body.razorpay_subscription_id) : undefined

  if (!paymentId || !razorpayPaymentId || !razorpaySignature || (!razorpayOrderId && !razorpaySubscriptionId)) {
    throw portfolioError("Missing payment verification fields", 400)
  }

  try {
    const completed = await platformService.verifyAndCompletePlatformPayment(createAdminClient(), req.artist.id, {
      paymentId,
      razorpayOrderId,
      razorpaySubscriptionId,
      razorpayPaymentId,
      razorpaySignature,
    })
    sendPortfolio(res, "Payment verified", { completed })
  } catch (err) {
    throw portfolioError(err instanceof Error ? err.message : "Payment verification failed", 400)
  }
}

export async function failed(req, res) {
  const artist = getArtistSession(req)
  if (!artist) return bare(res, 401, false, "Unauthorized")

  const body = bodyOf(req)
  const paymentId = Number(body.payment_id)
  if (!paymentId) return bare(res, 400, false, "payment_id required")

  try {
    await platformService.markPaymentFailed(createAdminClient(), artist.id, paymentId, body.error_description || "Payment failed")
    bare(res, 200, true, "Payment marked as failed")
  } catch {
    bare(res, 500, false, "Failed to update status")
  }
}

export async function cancel(req, res) {
  const artist = getArtistSession(req)
  if (!artist) return bare(res, 401, false, "Unauthorized")

  const paymentId = Number(bodyOf(req).payment_id)
  if (!paymentId) return bare(res, 400, false, "payment_id required")

  try {
    const cancelled = await platformService.cancelPendingPayment(createAdminClient(), artist.id, paymentId)
    if (!cancelled) return bare(res, 502, false, "Could not cancel the subscription with Razorpay")
    bare(res, 200, true, "Payment cancelled")
  } catch {
    bare(res, 500, false, "Failed to cancel")
  }
}
