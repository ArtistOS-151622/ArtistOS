import type { SupabaseClient } from "@supabase/supabase-js"
import { getRazorpayClient, isRazorpayConfigured } from "@/lib/razorpay/client"
import { getGlobalGstRate, calculatePurchaseAmounts } from "@/lib/portfolio/billing"
import { createHmac, timingSafeEqual } from "crypto"

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
  const { baseAmount, gstAmount, amount } = await calculatePurchaseAmounts(
    supabase,
    Number(plan.amount_inr),
    1 // quantity is always 1 for platform subscriptions
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

  if (plan.razorpay_plan_id) {
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

  const order = await razorpay.orders.create({
    amount: amountPaise,
    currency: "INR",
    notes: {
      user_id: String(userId),
      payment_id: String(payment.id),
      plan_id: String(plan.id),
      type: "platform_subscription",
    },
  })

  // 5. Update the payment with the order ID
  await supabase
    .from("platform_payments")
    .update({ rp_order_id: order.id })
    .eq("id", payment.id)

  return {
    payment,
    checkout: {
      type: "order" as const,
      payment_id: payment.id,
      order_id: order.id,
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

  // Update payment status and generate an invoice number
  // E.g. INV-PLT-<payment_id>-<random>
  const invoiceNumber = `INV-PLT-${payment.id}-${Math.floor(1000 + Math.random() * 9000)}`

  await supabase
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

  // Determine subscription end date based on duration_in_days
  // Default to 30 if not specified
  const durationDays = plan.duration_in_days || 30
  
  // Calculate new end date
  // We should check if they already have an active subscription and extend it,
  // or start from now if they don't.
  const { data: activeSub } = await supabase
    .from("user_subscriptions")
    .select("*")
    .eq("user_id", payment.user_id)
    .eq("status", "active")
    .order("current_period_end", { ascending: false })
    .limit(1)
    .maybeSingle()

  let newEnd = new Date()
  if (activeSub && activeSub.current_period_end) {
    const currentEnd = new Date(activeSub.current_period_end)
    if (currentEnd > newEnd) {
      newEnd = currentEnd
    }
  }

  // Add the duration
  newEnd.setDate(newEnd.getDate() + durationDays)

  if (activeSub) {
    // Update existing subscription
    await supabase
      .from("user_subscriptions")
      .update({
        plan_id: plan.id,
        current_period_end: newEnd.toISOString(),
        rp_subscription_id: paymentMeta?.rp_subscription_id ?? activeSub.rp_subscription_id,
      })
      .eq("id", activeSub.id)
  } else {
    // Create new subscription
    await supabase
      .from("user_subscriptions")
      .insert({
        user_id: payment.user_id,
        plan_id: plan.id,
        status: "active",
        current_period_start: new Date().toISOString(),
        current_period_end: newEnd.toISOString(),
        rp_subscription_id: paymentMeta?.rp_subscription_id ?? null,
      })
  }

  return true
}

export async function extendPlatformSubscription(
  supabase: SupabaseClient,
  userId: number,
  durationDays: number
) {
  const { data: activeSub } = await supabase
    .from("user_subscriptions")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("current_period_end", { ascending: false })
    .limit(1)
    .maybeSingle()

  let newEnd = new Date()
  if (activeSub && activeSub.current_period_end) {
    const currentEnd = new Date(activeSub.current_period_end)
    if (currentEnd > newEnd) {
      newEnd = currentEnd
    }
  }

  newEnd.setDate(newEnd.getDate() + durationDays)

  if (activeSub) {
    await supabase
      .from("user_subscriptions")
      .update({
        current_period_end: newEnd.toISOString(),
      })
      .eq("id", activeSub.id)
  }
}
