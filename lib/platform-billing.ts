import type { SupabaseClient } from "@supabase/supabase-js"
import { getRazorpayClient, isRazorpayConfigured } from "@/lib/razorpay/client"
import { calculatePurchaseAmounts } from "@/lib/portfolio/billing"
import { createHmac, timingSafeEqual } from "crypto"
import {
  buildPlatformSubscriptionDates,
  resolveCompletedPlatformPaymentDates,
  unixSecondsToIso,
} from "@/lib/platform-billing-dates"

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

async function fetchRazorpaySubscriptionDates(rpSubscriptionId: string) {
  const razorpay = getRazorpayClient()
  const subscription = await razorpay.subscriptions.fetch(rpSubscriptionId)

  return buildPlatformSubscriptionDates(subscription)
}

export async function createPlatformPurchase(
  supabase: SupabaseClient,
  userId: number,
  planId: number
) {
  // 1. Get the plan details
  const { data: plan, error: planError } = await supabase
    .from("platform_subscriptions")
    .select("*")
    .eq("id", planId)
    .single()

  if (planError || !plan) throw new Error("Invalid platform plan")
  if (!plan.is_active) throw new Error("Plan is no longer active")

  if (!isRazorpayConfigured()) {
    throw new Error("Razorpay is not connected! Please add your API keys in the .env file to accept payments.")
  }

  // 2. Calculate amounts
  const planGstRate = plan.gst_percentage == null ? undefined : Number(plan.gst_percentage) / 100
  const { baseAmount, gstAmount, amount } = await calculatePurchaseAmounts(
    supabase,
    Number(plan.amount_inr),
    1, // quantity is always 1 for platform subscriptions
    planGstRate
  )

  // 3. Create a pending or completed payment record
  const { data: payment, error: paymentError } = await supabase
    .from("platform_payments")
    .insert({
      user_id: userId,
      plan_id: plan.id,
      plan_name: plan.name,
      base_amount: baseAmount,
      gst_amount: gstAmount,
      amount,
      status: amount === 0 ? "completed" : "pending",
    })
    .select("*")
    .single()

  if (paymentError) throw new Error(paymentError.message)

  if (amount === 0) {
    // Activate immediately
    await completePlatformPayment(supabase, payment.id)
    return { payment, free_plan: true }
  }

  // 4. Create Razorpay order/subscription
  const razorpay = getRazorpayClient()
  const amountPaise = Math.round(amount * 100)

  if (!plan.razorpay_plan_id) {
    await supabase
      .from("platform_payments")
      .update({
        status: "failed",
        error_description: "Platform subscription plan is missing Razorpay plan id",
      })
      .eq("id", payment.id)

    throw new Error("This platform plan is not linked to a Razorpay subscription plan")
  }

  const subscription = await razorpay.subscriptions.create({
    plan_id: plan.razorpay_plan_id,
    total_count: 120, // allow 10 years of monthly renewals
    customer_notify: 1,
    notes: {
      user_id: String(userId),
      payment_id: String(payment.id),
      plan_id: String(plan.id),
      type: "platform_subscription",
    },
  })

  await supabase
    .from("platform_payments")
    .update({ rp_subscription_id: subscription.id })
    .eq("id", payment.id)

  return {
    payment,
    checkout: {
      type: "subscription" as const,
      payment_id: payment.id,
      subscription_id: subscription.id,
      key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      amount: amountPaise,
      name: "ArtistOS Platform",
      description: `Subscription: ${plan.name}`,
    },
  }
}

export async function verifyAndCompletePlatformPayment(
  supabase: SupabaseClient,
  userId: number,
  params: {
    paymentId: number
    razorpayOrderId?: string
    razorpaySubscriptionId?: string
    razorpayPaymentId: string
    razorpaySignature: string
  }
) {
  // 1. Fetch the pending payment
  const { data: payment, error: paymentError } = await supabase
    .from("platform_payments")
    .select("*, platform_subscriptions(*)")
    .eq("id", params.paymentId)
    .eq("user_id", userId)
    .maybeSingle()

  if (paymentError) throw new Error(paymentError.message)
  if (!payment) throw new Error("Payment not found")
  if (payment.status === "completed") return false // already processed

  if (params.razorpayOrderId) {
    if (payment.rp_order_id !== params.razorpayOrderId) {
      throw new Error("Payment order does not match")
    }

    const payload = `${params.razorpayOrderId}|${params.razorpayPaymentId}`
    if (!verifyRazorpaySignature(payload, params.razorpaySignature)) {
      throw new Error("Invalid payment signature")
    }
  } else if (params.razorpaySubscriptionId) {
    if (payment.rp_subscription_id !== params.razorpaySubscriptionId) {
      throw new Error("Payment subscription does not match")
    }

    const payload = `${params.razorpayPaymentId}|${params.razorpaySubscriptionId}`
    if (!verifyRazorpaySignature(payload, params.razorpaySignature)) {
      throw new Error("Invalid payment signature")
    }
  } else {
    throw new Error("Missing Razorpay order or subscription ID")
  }

  // 3. Complete the purchase
  return completePlatformPayment(supabase, params.paymentId, {
    rp_payment_id: params.razorpayPaymentId,
    rp_subscription_id: params.razorpaySubscriptionId,
  })
}

export async function completePlatformPayment(
  supabase: SupabaseClient,
  paymentId: number,
  paymentMeta?: {
    rp_payment_id?: string
    rp_subscription_id?: string
    rp_event_id?: string
    payment_method?: string
  }
): Promise<boolean> {
  // Prevent duplicate webhook processing
  if (paymentMeta?.rp_event_id) {
    const { data: existingEvent } = await supabase
      .from("razorpay_webhook_events")
      .select("id")
      .eq("event_id", paymentMeta.rp_event_id)
      .maybeSingle()

    if (existingEvent) return false

    await supabase.from("razorpay_webhook_events").insert({
      event_id: paymentMeta.rp_event_id,
      event_type: "platform_payment",
    })
  }

  // Fetch the payment
  const { data: payment, error: fetchError } = await supabase
    .from("platform_payments")
    .select("*, platform_subscriptions(*)")
    .eq("id", paymentId)
    .single()

  if (fetchError || !payment || payment.status === "completed") return false

  const plan = payment.platform_subscriptions
  if (!plan) throw new Error("Plan details not found")

  const rpSubId = paymentMeta?.rp_subscription_id ?? payment.rp_subscription_id

  // Update payment status and generate an invoice number. The status condition
  // makes browser verification and Razorpay webhooks safe if they arrive together.
  const invoiceNumber = `INV-PLT-${payment.id}-${Math.floor(1000 + Math.random() * 9000)}`

  const { data: completedPayment, error: completeError } = await supabase
    .from("platform_payments")
    .update({
      status: "completed",
      rp_payment_id: paymentMeta?.rp_payment_id ?? payment.rp_payment_id,
      rp_subscription_id: paymentMeta?.rp_subscription_id ?? payment.rp_subscription_id,
      rp_event_id: paymentMeta?.rp_event_id ?? payment.rp_event_id,
      payment_method: paymentMeta?.payment_method ?? null,
      invoice_number: invoiceNumber,
    })
    .eq("id", paymentId)
    .eq("status", "pending")
    .select("id")
    .maybeSingle()

  if (completeError) throw new Error(`Failed to complete payment: ${completeError.message}`)
  if (!completedPayment) return false

  let activeSub = null

  if (rpSubId) {
    const { data: matchingSub } = await supabase
      .from("user_subscriptions")
      .select("*")
      .eq("user_id", payment.user_id)
      .eq("rp_subscription_id", rpSubId)
      .order("current_period_end", { ascending: false })
      .limit(1)
      .maybeSingle()

    activeSub = matchingSub
  }

  if (!activeSub) {
    const { data: latestActiveSub } = await supabase
      .from("user_subscriptions")
      .select("*")
      .eq("user_id", payment.user_id)
      .in("status", ["active", "pending", "halted"])
      .order("current_period_end", { ascending: false })
      .limit(1)
      .maybeSingle()

    activeSub = latestActiveSub
  }

  let razorpayDates = null

  if (rpSubId) {
    try {
      razorpayDates = await fetchRazorpaySubscriptionDates(rpSubId)
    } catch (err) {
      console.error("Failed to fetch Razorpay subscription for end date:", err)
    }
  }

  const {
    currentPeriodStart,
    currentPeriodEnd,
    nextBillingAt,
    subscriptionEndAt,
  } = resolveCompletedPlatformPaymentDates({
    amount: Number(payment.amount),
    rpSubscriptionId: rpSubId,
    rpOrderId: payment.rp_order_id,
    razorpayDates,
  })

  if (activeSub) {
    // Update existing subscription
    const { error: updateError } = await supabase
      .from("user_subscriptions")
      .update({
        plan_id: plan.id,
        status: "active",
        ...(currentPeriodStart ? { current_period_start: currentPeriodStart } : {}),
        current_period_end: currentPeriodEnd,
        rp_subscription_id: rpSubId ?? activeSub.rp_subscription_id,
        next_billing_at: nextBillingAt,
        subscription_end_at: subscriptionEndAt,
      })
      .eq("id", activeSub.id)

    if (updateError) {
      console.error("Failed to update user_subscription:", updateError)
      throw new Error(`Failed to update subscription: ${updateError.message}`)
    }
  } else {
    // Create new subscription
    const { error: insertError } = await supabase
      .from("user_subscriptions")
      .insert({
        user_id: payment.user_id,
        plan_id: plan.id,
        status: "active",
        current_period_start: currentPeriodStart,
        current_period_end: currentPeriodEnd,
        rp_subscription_id: rpSubId ?? null,
        next_billing_at: nextBillingAt,
        subscription_end_at: subscriptionEndAt,
      })

    if (insertError) {
      console.error("Failed to insert user_subscription:", insertError)
      throw new Error(`Failed to create subscription: ${insertError.message}`)
    }
  }

  return true
}

export async function extendPlatformSubscriptionToDate(
  supabase: SupabaseClient,
  userId: number,
  currentEndUnix: number,
  currentStartUnix?: number,
  chargeAtUnix?: number,
  endAtUnix?: number,
  rpSubscriptionId?: string
) {
  let activeSub = null

  if (rpSubscriptionId) {
    const { data: matchingSub } = await supabase
      .from("user_subscriptions")
      .select("*")
      .eq("user_id", userId)
      .eq("rp_subscription_id", rpSubscriptionId)
      .order("current_period_end", { ascending: false })
      .limit(1)
      .maybeSingle()

    activeSub = matchingSub
  }

  if (!activeSub) {
    const { data: latestActiveSub } = await supabase
      .from("user_subscriptions")
      .select("*")
      .eq("user_id", userId)
      .in("status", ["active", "pending", "halted"])
      .order("current_period_end", { ascending: false })
      .limit(1)
      .maybeSingle()

    activeSub = latestActiveSub
  }

  if (!activeSub) return

  await supabase
    .from("user_subscriptions")
    .update({
      status: "active",
      ...(currentStartUnix ? { current_period_start: unixSecondsToIso(currentStartUnix) } : {}),
      current_period_end: unixSecondsToIso(currentEndUnix),
      next_billing_at: unixSecondsToIso(chargeAtUnix) ?? unixSecondsToIso(currentEndUnix),
      ...(endAtUnix ? { subscription_end_at: unixSecondsToIso(endAtUnix) } : {}),
      ...(rpSubscriptionId ? { rp_subscription_id: rpSubscriptionId } : {}),
    })
    .eq("id", activeSub.id)
}

export async function processPlatformRenewal(
  supabase: SupabaseClient,
  originalPaymentId: number,
  paymentMeta: {
    rp_payment_id?: string
    rp_subscription_id?: string
    rp_event_id: string
    payment_method?: string
    current_start?: number
    current_end?: number
    charge_at?: number
    end_at?: number
  }
): Promise<boolean> {
  // 1. Prevent duplicate webhook processing
  const { data: existingEvent } = await supabase
    .from("razorpay_webhook_events")
    .select("id")
    .eq("event_id", paymentMeta.rp_event_id)
    .maybeSingle()

  if (existingEvent) return false

  // 2. Fetch the original payment to get plan and amount details
  const { data: originalPayment, error: fetchError } = await supabase
    .from("platform_payments")
    .select("*, platform_subscriptions(*)")
    .eq("id", originalPaymentId)
    .single()

  if (fetchError || !originalPayment) {
    console.error("Renewal failed: Original payment not found")
    return false
  }

  if (paymentMeta.rp_payment_id) {
    if (originalPayment.rp_payment_id === paymentMeta.rp_payment_id) return false

    const { data: existingPayment } = await supabase
      .from("platform_payments")
      .select("id")
      .eq("rp_payment_id", paymentMeta.rp_payment_id)
      .maybeSingle()

    if (existingPayment) return false
  }

  await supabase.from("razorpay_webhook_events").insert({
    event_id: paymentMeta.rp_event_id,
    event_type: "platform_renewal",
  })

  const plan = originalPayment.platform_subscriptions
  if (!plan) {
    console.error("Renewal failed: Plan details not found")
    return false
  }

  // 3. Create a NEW payment record for this renewal invoice
  const invoiceNumber = `INV-PLT-RNW-${Math.floor(Date.now() / 1000)}-${Math.floor(1000 + Math.random() * 9000)}`

  const { data: newPayment, error: insertError } = await supabase
    .from("platform_payments")
    .insert({
      user_id: originalPayment.user_id,
      plan_id: plan.id,
      plan_name: originalPayment.plan_name,
      base_amount: originalPayment.base_amount,
      gst_amount: originalPayment.gst_amount,
      amount: originalPayment.amount,
      status: "completed",
      rp_payment_id: paymentMeta.rp_payment_id,
      rp_subscription_id: paymentMeta.rp_subscription_id ?? originalPayment.rp_subscription_id,
      rp_event_id: paymentMeta.rp_event_id,
      payment_method: paymentMeta.payment_method,
      rp_order_id: null,
      invoice_number: invoiceNumber,
    })
    .select("id")
    .single()

  if (insertError || !newPayment) {
    console.error("Renewal failed: Could not create new payment invoice", insertError)
    return false
  }

  // 4. Use webhook payload dates if available, otherwise fallback to fetching from API
  let currentStartUnix = paymentMeta.current_start
  let currentEndUnix = paymentMeta.current_end
  let chargeAtUnix = paymentMeta.charge_at
  let endAtUnix = paymentMeta.end_at

  if (!currentStartUnix || !currentEndUnix || !chargeAtUnix || !endAtUnix) {
    const rpSubId = paymentMeta.rp_subscription_id ?? originalPayment.rp_subscription_id
    if (rpSubId) {
      try {
        const razorpay = getRazorpayClient()
        const rpSub = await razorpay.subscriptions.fetch(rpSubId)
        if (rpSub && rpSub.current_start) {
          currentStartUnix = rpSub.current_start
        }
        if (rpSub && rpSub.current_end) {
          currentEndUnix = rpSub.current_end
        }
        if (rpSub && rpSub.charge_at) {
          chargeAtUnix = rpSub.charge_at
        }
        if (rpSub && rpSub.end_at) {
          endAtUnix = rpSub.end_at
        }
      } catch (err) {
        console.error("Failed to fetch Razorpay subscription for renewal:", err)
      }
    }
  }

  // 5. Extend the subscription period
  if (currentEndUnix) {
    await extendPlatformSubscriptionToDate(
      supabase,
      originalPayment.user_id,
      currentEndUnix,
      currentStartUnix,
      chargeAtUnix,
      endAtUnix,
      paymentMeta.rp_subscription_id ?? originalPayment.rp_subscription_id
    )
  } else {
    throw new Error("Could not determine subscription end date from Razorpay")
  }

  return true
}
