import type { SupabaseClient } from "@supabase/supabase-js"
import { createHmac, timingSafeEqual } from "crypto"

import { getOrCreateQuota, QuotaService } from "@/lib/portfolio/quota"
import type { StoragePlanRow } from "@/lib/portfolio/types"
import { getRazorpayClient, isRazorpayConfigured } from "@/lib/razorpay/client"
import { claimWebhookEvent, releaseWebhookEvent } from "@/lib/razorpay/webhook-events"

function getRazorpayKeySecret(): string {
  const secret = process.env.RAZORPAY_KEY_SECRET
  if (!secret) throw new Error("Razorpay key secret is not configured")
  return secret
}

function verifyRazorpaySignature(payload: string, signature: string): boolean {
  const expected = createHmac("sha256", getRazorpayKeySecret()).update(payload).digest("hex")
  const expectedBuffer = Buffer.from(expected)
  const signatureBuffer = Buffer.from(signature)
  return (
    expectedBuffer.length === signatureBuffer.length &&
    timingSafeEqual(expectedBuffer, signatureBuffer)
  )
}

export async function getActivePlans(supabase: SupabaseClient): Promise<StoragePlanRow[]> {
  const { data, error } = await supabase
    .from("storage_plans")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })

  if (error) throw new Error(error.message)
  return (data ?? []) as StoragePlanRow[]
}



export async function calculatePurchaseAmounts(
  supabase: SupabaseClient,
  priceInr: number,
  quantity: number
) {
  const baseAmount = Math.round(priceInr * quantity * 100) / 100
  const amount = baseAmount
  return { baseAmount, amount }
}

export async function computeMinimumQuantity(
  supabase: SupabaseClient,
  userId: number,
  plan: StoragePlanRow,
  requestedQuantity: number
): Promise<number> {
  let quantity = Math.max(1, requestedQuantity)

  const quotaRow = await getOrCreateQuota(supabase, userId)
  const quota = QuotaService.fromRow(quotaRow)
  const overage = Math.max(0, quota.getUsedStorageBytes() - quota.getTotalAvailableBytes())

  if (overage > 0 && plan.storage_bytes > 0) {
    const minForOverage = Math.ceil(overage / plan.storage_bytes)
    quantity = Math.max(quantity, minForOverage)
  }

  return Math.min(quantity, 100)
}

export async function hasCompletedPurchase(
  supabase: SupabaseClient,
  userId: number
): Promise<boolean> {
  const { count } = await supabase
    .from("portfolio_storage_purchases")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "completed")

  return (count ?? 0) > 0
}

export async function createStoragePurchase(
  supabase: SupabaseClient,
  userId: number,
  planId: number,
  quantity: number
) {
  const plans = await getActivePlans(supabase)
  const planIndex = plans.findIndex((p) => p.id === planId)
  if (planIndex < 0) throw new Error("Invalid storage plan")
  if (!isRazorpayConfigured()) {
    throw new Error("Razorpay is not connected! Please add your API keys in the .env file to accept payments.")
  }

  const plan = plans[planIndex]
  const finalQuantity = await computeMinimumQuantity(
    supabase,
    userId,
    plan,
    quantity
  )

  const storageBytes = plan.storage_bytes * finalQuantity
  const { baseAmount, amount } = await calculatePurchaseAmounts(
    supabase,
    Number(plan.price_inr),
    finalQuantity
  )

  const { data: purchase, error: purchaseError } = await supabase
    .from("portfolio_storage_purchases")
    .insert({
      user_id: userId,
      storage_bytes: storageBytes,
      base_amount: baseAmount,
      amount,
      quantity: finalQuantity,
      plan_id: plan.id,
      status: "pending",
    })
    .select("*")
    .single()

  if (purchaseError) throw new Error(purchaseError.message)

  const razorpay = getRazorpayClient()
  const amountPaise = Math.round(amount * 100)

  if (plan.razorpay_plan_id) {
    const subscription = await razorpay.subscriptions.create({
      plan_id: plan.razorpay_plan_id,
      total_count: 12,
      quantity: finalQuantity,
      customer_notify: 1,
      notes: {
        user_id: String(userId),
        purchase_id: String(purchase.id),
        plan_id: String(plan.id),
      },
    })

    await supabase
      .from("portfolio_storage_purchases")
      .update({ rp_subscription_id: subscription.id })
      .eq("id", purchase.id)

    return {
      purchase,
      demo_mode: false,
      checkout: {
        type: "subscription" as const,
        purchase_id: purchase.id,
        subscription_id: subscription.id,
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: amountPaise,
        name: "ArtistOS Storage",
        description: plan.name,
      },
    }
  }

  const order = await razorpay.orders.create({
    amount: amountPaise,
    currency: "INR",
    notes: {
      user_id: String(userId),
      purchase_id: String(purchase.id),
      plan_id: String(plan.id),
    },
  })

  await supabase
    .from("portfolio_storage_purchases")
    .update({ rp_order_id: order.id })
    .eq("id", purchase.id)

  return {
    purchase,
    demo_mode: false,
    checkout: {
      type: "order" as const,
      purchase_id: purchase.id,
      order_id: order.id,
      key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      amount: amountPaise,
      name: "ArtistOS Storage",
      description: plan.name,
    },
  }
}

export async function verifyAndCompleteCheckoutPayment(
  supabase: SupabaseClient,
  userId: number,
  params: {
    purchaseId: number
    razorpayOrderId?: string
    razorpaySubscriptionId?: string
    razorpayPaymentId: string
    razorpaySignature: string
  }
) {
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
    if (purchase.rp_order_id !== params.razorpayOrderId) {
      throw new Error("Payment order does not match this purchase")
    }

    const payload = `${params.razorpayOrderId}|${params.razorpayPaymentId}`
    if (!verifyRazorpaySignature(payload, params.razorpaySignature)) {
      throw new Error("Invalid payment signature")
    }
  } else if (params.razorpaySubscriptionId) {
    if (purchase.rp_subscription_id !== params.razorpaySubscriptionId) {
      throw new Error("Payment subscription does not match this purchase")
    }

    const payload = `${params.razorpayPaymentId}|${params.razorpaySubscriptionId}`
    if (!verifyRazorpaySignature(payload, params.razorpaySignature)) {
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

export async function completePurchase(
  supabase: SupabaseClient,
  purchaseId: number,
  paymentMeta?: {
    rp_payment_id?: string
    rp_subscription_id?: string
    rp_event_id?: string
    payment_method?: string
  }
): Promise<boolean> {
  const eventId = paymentMeta?.rp_event_id

  if (eventId && !(await claimWebhookEvent(supabase, eventId, "payment"))) {
    return false
  }

  try {
    return await applyCompletedPurchase(supabase, purchaseId, paymentMeta)
  } catch (err) {
    // Hand the event back so Razorpay's retry can complete the purchase.
    if (eventId) await releaseWebhookEvent(supabase, eventId)
    throw err
  }
}

async function applyCompletedPurchase(
  supabase: SupabaseClient,
  purchaseId: number,
  paymentMeta?: {
    rp_payment_id?: string
    rp_subscription_id?: string
    rp_event_id?: string
    payment_method?: string
  }
): Promise<boolean> {
  const { data: purchase } = await supabase
    .from("portfolio_storage_purchases")
    .select("user_id, status, storage_plans(id)")
    .eq("id", purchaseId)
    .maybeSingle()

  if (!purchase || purchase.status === "completed") return false
  if (!purchase.storage_plans) throw new Error("Plan not found for purchase")

  // Resolve the paid-through date before the transaction, since it needs a
  // network call. Absent a subscription, the SQL side falls back to 30 days.
  let fallbackExpiresAt: string | null = null
  if (paymentMeta?.rp_subscription_id) {
    try {
      const razorpay = getRazorpayClient()
      const rpSub = await razorpay.subscriptions.fetch(paymentMeta.rp_subscription_id)
      if (rpSub && rpSub.current_end) {
        fallbackExpiresAt = new Date(rpSub.current_end * 1000).toISOString()
      }
    } catch (err) {
      console.error("Failed to fetch Razorpay subscription for end date:", err)
    }
  }

  // The free-tier size is app config, so the quota row can't be defaulted in
  // SQL. Create it here; complete_storage_purchase raises if it is missing.
  await getOrCreateQuota(supabase, purchase.user_id)

  // Claims the purchase and credits the quota in one transaction, so a browser
  // /verify racing the payment.captured webhook credits the storage exactly
  // once and a failed credit rolls the completion back.
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
