import type { SupabaseClient } from "@supabase/supabase-js"
import { createHmac, timingSafeEqual } from "crypto"

// GST rate will be fetched dynamically from platform_settings
import { getOrCreateQuota, QuotaService } from "@/lib/portfolio/quota"
import type { StoragePlanRow } from "@/lib/portfolio/types"
import { getRazorpayClient, isRazorpayConfigured } from "@/lib/razorpay/client"

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

export async function getGlobalGstRate(supabase: SupabaseClient): Promise<number> {
  const { data } = await supabase
    .from("platform_settings")
    .select("value")
    .eq("key", "global_gst_rate")
    .maybeSingle()
  
  return data?.value ? parseFloat(data.value) : 0.18
}

export async function calculatePurchaseAmounts(supabase: SupabaseClient, priceInr: number, quantity: number) {
  const gstRate = await getGlobalGstRate(supabase)
  const baseAmount = Math.round(priceInr * quantity * 100) / 100
  const gstAmount = Math.round(baseAmount * gstRate * 100) / 100
  const amount = Math.round((baseAmount + gstAmount) * 100) / 100
  return { baseAmount, gstAmount, amount }
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
  const { baseAmount, gstAmount, amount } = await calculatePurchaseAmounts(
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
      gst_amount: gstAmount,
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
  if (paymentMeta?.rp_event_id) {
    const { data: existingEvent } = await supabase
      .from("razorpay_webhook_events")
      .select("id")
      .eq("event_id", paymentMeta.rp_event_id)
      .maybeSingle()

    if (existingEvent) return false

    await supabase.from("razorpay_webhook_events").insert({
      event_id: paymentMeta.rp_event_id,
      event_type: "payment",
    })
  }

  const { data: purchase } = await supabase
    .from("portfolio_storage_purchases")
    .select("*, storage_plans(*)")
    .eq("id", purchaseId)
    .single()

  if (!purchase || purchase.status === "completed") return false

  const plan = purchase.storage_plans as StoragePlanRow | null
  if (!plan) throw new Error("Plan not found for purchase")

  await supabase
    .from("portfolio_storage_purchases")
    .update({
      status: "completed",
      rp_payment_id: paymentMeta?.rp_payment_id ?? purchase.rp_payment_id,
      rp_subscription_id: paymentMeta?.rp_subscription_id ?? purchase.rp_subscription_id,
      rp_event_id: paymentMeta?.rp_event_id ?? purchase.rp_event_id,
      payment_method: paymentMeta?.payment_method ?? null,
    })
    .eq("id", purchaseId)

  const quotaRow = await getOrCreateQuota(supabase, purchase.user_id)
  const quota = QuotaService.fromRow(quotaRow)
  const isAddon = quota.isActive() || quota.isInGracePeriod()

  const { applyPurchaseToQuota } = await import("@/lib/portfolio/quota")
  await applyPurchaseToQuota(
    supabase,
    purchase.user_id,
    Number(purchase.storage_bytes),
    plan.expires_in_days,
    isAddon
  )

  return true
}
