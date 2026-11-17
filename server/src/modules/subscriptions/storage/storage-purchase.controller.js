import { createDbClient } from "#src/integrations/supabase.js"
import { getArtistSession } from "#src/middlewares/require-artist.js"
import * as storageService from "#src/modules/subscriptions/storage/storage-purchase.service.js"
import { portfolioError, sendPortfolio } from "#src/shared/portfolio/response.js"
import { checkIsReadOnly } from "#src/shared/subscription/read-only.js"
import { bodyOf } from "#src/utils/request.js"

const bare = (res, status, ok, message) => res.status(status).json({ status: ok, message })

export async function purchase(req, res) {
  const body = bodyOf(req)
  const planId = Number(body.plan_id ?? body.plan_index)
  const quantity = Number(body.quantity ?? 1)
  if (Number.isNaN(planId)) throw portfolioError("plan_id is required", 400)

  const supabase = createDbClient()
  if (await checkIsReadOnly(supabase, req.artist.id)) {
    throw portfolioError(
      "Your subscription has expired. Please upgrade your platform subscription before buying storage.",
      403
    )
  }

  try {
    sendPortfolio(res, "Purchase initiated", await storageService.createStoragePurchase(supabase, req.artist.id, planId, quantity), 201)
  } catch (err) {
    throw portfolioError(err instanceof Error ? err.message : "Purchase failed", 500)
  }
}

export async function verify(req, res) {
  const body = bodyOf(req)
  const purchaseId = Number(body.purchase_id)
  const razorpayPaymentId = String(body.razorpay_payment_id ?? "")
  const razorpaySignature = String(body.razorpay_signature ?? "")
  const razorpayOrderId = body.razorpay_order_id ? String(body.razorpay_order_id) : undefined
  const razorpaySubscriptionId = body.razorpay_subscription_id ? String(body.razorpay_subscription_id) : undefined

  if (!purchaseId || !razorpayPaymentId || !razorpaySignature) {
    throw portfolioError("Missing payment verification fields", 400)
  }

  try {
    const completed = await storageService.verifyAndCompleteCheckoutPayment(createDbClient(), req.artist.id, {
      purchaseId,
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

async function closePurchase(req, res, status, successMessage, failureMessage) {
  try {
    const artist = getArtistSession(req)
    if (!artist) return bare(res, 401, false, "Unauthorized")

    const purchaseId = bodyOf(req).purchase_id
    if (!purchaseId) return bare(res, 400, false, "Missing purchase_id")

    const error = await storageService.closePendingPurchase(createDbClient(), artist.id, purchaseId, status)
    if (error) {
      req.log.error({ error }, `failed to mark purchase ${status}`)
      return bare(res, 500, false, failureMessage)
    }
    bare(res, 200, true, successMessage)
  } catch (err) {
    req.log.error({ err }, `purchase ${status} error`)
    bare(res, 500, false, "Internal server error")
  }
}

export const failed = (req, res) =>
  closePurchase(req, res, "failed", "Purchase marked as failed", "Failed to update purchase status")

// Never deletes: ondismiss can fire while a capture is in flight, and a late capture
// must still find (and complete) the row.
export const cancel = (req, res) =>
  closePurchase(req, res, "cancelled", "Purchase cancelled successfully", "Failed to cancel purchase")
