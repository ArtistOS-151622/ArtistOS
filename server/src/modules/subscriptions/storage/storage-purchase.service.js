import { getRazorpayClient, getRazorpayPublicKeyId, isRazorpayConfigured } from "#src/integrations/razorpay/client.js"
import { verifyCheckoutSignature } from "#src/integrations/razorpay/verify-signature.js"
import { claimWebhookEvent, releaseWebhookEvent } from "#src/modules/subscriptions/webhook-events.js"
import { getOrCreateQuota, QuotaService } from "#src/shared/portfolio/quota.js"
import { logger } from "#src/utils/logger.js"

/*
 * Extra portfolio storage, sold as Razorpay orders (one-off) or subscriptions (when
 * the storage plan has a razorpay_plan_id). Crediting the quota happens in the
 * complete_storage_purchase SQL function, in one transaction.
 */

const log = logger.child({ module: "storage-billing" })

const RAZORPAY_NOT_CONNECTED =
  "Razorpay is not connected! Please add your API keys in the .env file to accept payments."
const MAX_QUANTITY = 100
const SUBSCRIPTION_TOTAL_COUNT = 12

/** No tax is added today: amount equals the base price × quantity (2-decimal rounding). */
export function calculatePurchaseAmounts(priceInr, quantity) {
  const baseAmount = Math.round(priceInr * quantity * 100) / 100
  return { baseAmount, amount: baseAmount }
}

async function getActivePlans(supabase) {
  const { data, error } = await supabase
    .from("storage_plans")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
  if (error) throw new Error(error.message)
  return data ?? []
}

/** At least enough units to cover current over-quota usage; 1–100. */
async function computeMinimumQuantity(supabase, userId, plan, requestedQuantity) {
  let quantity = Math.max(1, requestedQuantity)
  const quota = QuotaService.fromRow(await getOrCreateQuota(supabase, userId))
  const overage = Math.max(0, quota.getUsedStorageBytes() - quota.getTotalAvailableBytes())
  if (overage > 0 && plan.storage_bytes > 0) quantity = Math.max(quantity, Math.ceil(overage / plan.storage_bytes))
  return Math.min(quantity, MAX_QUANTITY)
}

/**
 * Creates a pending storage purchase and its Razorpay order or subscription.
 * → { purchase, demo_mode: false, checkout }
 */
export async function createStoragePurchase(supabase, userId, planId, quantity) {
  const plans = await getActivePlans(supabase)
  const plan = plans.find((p) => p.id === planId)
  if (!plan) throw new Error("Invalid storage plan")
  if (!isRazorpayConfigured()) throw new Error(RAZORPAY_NOT_CONNECTED)

  const finalQuantity = await computeMinimumQuantity(supabase, userId, plan, quantity)
  const { baseAmount, amount } = calculatePurchaseAmounts(Number(plan.price_inr), finalQuantity)

  const { data: purchase, error } = await supabase
    .from("portfolio_storage_purchases")
    .insert({
      user_id: userId,
      storage_bytes: plan.storage_bytes * finalQuantity,
      base_amount: baseAmount,
      amount,
      quantity: finalQuantity,
      plan_id: plan.id,
      status: "pending",
    })
    .select("*")
    .single()
  if (error) throw new Error(error.message)

  const razorpay = getRazorpayClient()
  const amountPaise = Math.round(amount * 100)
  const notes = { user_id: String(userId), purchase_id: String(purchase.id), plan_id: String(plan.id) }
  const checkoutBase = {
    purchase_id: purchase.id,
    key: getRazorpayPublicKeyId(),
    amount: amountPaise,
    name: "ArtistOS Storage",
    description: plan.name,
  }

  if (plan.razorpay_plan_id) {
    const subscription = await razorpay.subscriptions.create({
      plan_id: plan.razorpay_plan_id,
      total_count: SUBSCRIPTION_TOTAL_COUNT,
      quantity: finalQuantity,
      customer_notify: 1,
      notes,
    })
    await supabase.from("portfolio_storage_purchases").update({ rp_subscription_id: subscription.id }).eq("id", purchase.id)
    return {
      purchase,
      demo_mode: false,
      checkout: { type: "subscription", purchase_id: purchase.id, subscription_id: subscription.id, ...checkoutBase },
    }
  }

  const order = await razorpay.orders.create({ amount: amountPaise, currency: "INR", notes })
  await supabase.from("portfolio_storage_purchases").update({ rp_order_id: order.id }).eq("id", purchase.id)
  return {
    purchase,
    demo_mode: false,
    checkout: { type: "order", purchase_id: purchase.id, order_id: order.id, ...checkoutBase },
  }
}

/** Browser-side checkout confirmation: checks the Razorpay signature, then completes the purchase. */
export async function verifyAndCompleteCheckoutPayment(supabase, userId, params) {
  const { data: purchase, error } = await supabase
    .from("portfolio_storage_purchases")
    .select("id, user_id, rp_order_id, rp_subscription_id, status")
    .eq("id", params.purchaseId)
    .eq("user_id", userId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!purchase) throw new Error("Purchase not found")
  if (purchase.status === "completed") return false

  if (params.razorpayOrderId) {
    if (purchase.rp_order_id !== params.razorpayOrderId) throw new Error("Payment order does not match this purchase")
    if (!verifyCheckoutSignature(`${params.razorpayOrderId}|${params.razorpayPaymentId}`, params.razorpaySignature)) {
      throw new Error("Invalid payment signature")
    }
  } else if (params.razorpaySubscriptionId) {
    if (purchase.rp_subscription_id !== params.razorpaySubscriptionId) {
      throw new Error("Payment subscription does not match this purchase")
    }
    if (!verifyCheckoutSignature(`${params.razorpayPaymentId}|${params.razorpaySubscriptionId}`, params.razorpaySignature)) {
      throw new Error("Invalid payment signature")
    }
  } else {
    throw new Error("Missing Razorpay order or subscription ID")
  }

  return completePurchase(supabase, params.purchaseId, {
    rp_payment_id: params.razorpayPaymentId,
    rp_subscription_id: params.razorpaySubscriptionId,
  })
}

/**
 * Completes a storage purchase and credits the quota (exactly once, via the
 * complete_storage_purchase SQL function). With rp_event_id (webhook) the event is
 * claimed first and released on failure. → true when this call completed it.
 */
export async function completePurchase(supabase, purchaseId, paymentMeta) {
  const eventId = paymentMeta?.rp_event_id
  if (eventId && !(await claimWebhookEvent(supabase, eventId, "payment"))) return false

  try {
    return await applyCompletedPurchase(supabase, purchaseId, paymentMeta)
  } catch (err) {
    if (eventId) await releaseWebhookEvent(supabase, eventId)
    throw err
  }
}

async function applyCompletedPurchase(supabase, purchaseId, paymentMeta) {
  const { data: purchase } = await supabase
    .from("portfolio_storage_purchases")
    .select("user_id, status, storage_plans(id)")
    .eq("id", purchaseId)
    .maybeSingle()

  if (!purchase || purchase.status === "completed") return false
  if (!purchase.storage_plans) throw new Error("Plan not found for purchase")

  // Paid-through date from Razorpay (network call, so before the transaction).
  // Without a subscription the SQL function falls back to 30 days.
  let fallbackExpiresAt = null
  if (paymentMeta?.rp_subscription_id) {
    try {
      const rpSub = await getRazorpayClient().subscriptions.fetch(paymentMeta.rp_subscription_id)
      if (rpSub?.current_end) fallbackExpiresAt = new Date(rpSub.current_end * 1000).toISOString()
    } catch (err) {
      log.error({ err }, "failed to fetch Razorpay subscription for end date")
    }
  }

  // The SQL function needs the quota row (its free-tier size is app config).
  await getOrCreateQuota(supabase, purchase.user_id)

  const { data: completed, error } = await supabase.rpc("complete_storage_purchase", {
    p_purchase_id: purchaseId,
    p_rp_payment_id: paymentMeta?.rp_payment_id ?? null,
    p_rp_subscription_id: paymentMeta?.rp_subscription_id ?? null,
    p_rp_event_id: paymentMeta?.rp_event_id ?? null,
    p_payment_method: paymentMeta?.payment_method ?? null,
    p_fallback_expires_at: fallbackExpiresAt,
  })
  if (error) throw new Error(error.message)
  return completed === true
}

/** Checkout failed/dismissed in the browser: pending → `status` (never deleted). → error or null */
export async function closePendingPurchase(supabase, userId, purchaseId, status) {
  const { error } = await supabase
    .from("portfolio_storage_purchases")
    .update({ status })
    .eq("id", purchaseId)
    .eq("user_id", userId)
    .eq("status", "pending")
  return error ?? null
}
