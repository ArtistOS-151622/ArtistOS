import { getRazorpayClient, getRazorpayPublicKeyId, isRazorpayConfigured } from "#src/integrations/razorpay/client.js"
import { verifyCheckoutSignature } from "#src/integrations/razorpay/verify-signature.js"
import {
  buildPlatformSubscriptionDates,
  resolveCompletedPlatformPaymentDates,
  unixSecondsToIso,
} from "#src/modules/subscriptions/platform/billing-dates.js"
import { calculatePurchaseAmounts } from "#src/modules/subscriptions/storage/storage-purchase.service.js"
import { claimWebhookEvent, releaseWebhookEvent } from "#src/modules/subscriptions/webhook-events.js"
import { syncUserStorageQuota } from "#src/shared/subscription/plan-features.js"
import { invalidateReadOnlyCache } from "#src/shared/subscription/read-only.js"
import { logger } from "#src/utils/logger.js"

/*
 * Platform (ArtistOS plan) subscriptions via Razorpay Subscriptions.
 * platform_payments: one row per checkout or renewal invoice.
 * user_subscriptions: the artist's current plan and paid-through dates.
 * The webhook is the source of truth for payment state; browser /verify is a fast path.
 */

const log = logger.child({ module: "platform-billing" })

const MB = 1024 * 1024
const RAZORPAY_NOT_CONNECTED =
  "Razorpay is not connected! Please add your API keys in the .env file to accept payments."
const OPEN_SUBSCRIPTION_STATUSES = ["active", "pending", "halted"]
// 10 years of billing cycles.
const YEARLY_TOTAL_COUNT = 10
const MONTHLY_TOTAL_COUNT = 120

const isYearly = (plan) => Boolean(plan.billing_period?.includes("year"))
const invoiceSuffix = () => Math.floor(1000 + Math.random() * 9000)

async function fetchRazorpaySubscriptionDates(rpSubscriptionId) {
  const subscription = await getRazorpayClient().subscriptions.fetch(rpSubscriptionId)
  return buildPlatformSubscriptionDates(subscription)
}

/** The artist's subscription row for this Razorpay subscription, else their latest open one. */
async function findSubscriptionRow(supabase, userId, rpSubscriptionId) {
  if (rpSubscriptionId) {
    const { data } = await supabase
      .from("user_subscriptions")
      .select("*")
      .eq("user_id", userId)
      .eq("rp_subscription_id", rpSubscriptionId)
      .order("current_period_end", { ascending: false })
      .limit(1)
      .maybeSingle()
    if (data) return data
  }

  const { data } = await supabase
    .from("user_subscriptions")
    .select("*")
    .eq("user_id", userId)
    .in("status", OPEN_SUBSCRIPTION_STATUSES)
    .order("current_period_end", { ascending: false })
    .limit(1)
    .maybeSingle()
  return data
}

/**
 * Starts a plan purchase: a platform_payments row, then (for paid plans) a Razorpay
 * subscription for checkout. Creates the Razorpay plan on first use. Free plans
 * activate immediately. → { payment, free_plan: true } | { payment, checkout }
 */
export async function createPlatformPurchase(supabase, userId, planId) {
  log.info({ planId, userId }, "looking up plan")
  const { data: plan, error: planError } = await supabase.from("platform_subscriptions").select("*").eq("id", planId).single()

  if (planError || !plan) {
    log.error({ planId, planError }, "failed to fetch plan")
    throw new Error(planError ? `Invalid platform plan: ${planError.message}` : "Invalid platform plan")
  }
  if (!plan.is_active) {
    log.error({ planId, name: plan.name }, "plan is inactive")
    throw new Error("Plan is no longer active")
  }
  if (!isRazorpayConfigured()) {
    log.error("Razorpay is not configured (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET)")
    throw new Error(RAZORPAY_NOT_CONNECTED)
  }

  const { baseAmount, amount } = calculatePurchaseAmounts(Number(plan.amount_inr), 1)
  log.info({ baseAmount, amount }, "amounts calculated")

  const { data: payment, error: paymentError } = await supabase
    .from("platform_payments")
    .insert({
      user_id: userId,
      plan_id: plan.id,
      plan_name: plan.name,
      base_amount: baseAmount,
      amount,
      status: amount === 0 ? "completed" : "pending",
    })
    .select("*")
    .single()

  if (paymentError) {
    log.error({ paymentError }, "failed to create platform_payments row")
    throw new Error(paymentError.message)
  }
  log.info({ paymentId: payment.id, status: payment.status }, "payment row created")

  if (amount === 0) {
    await completePlatformPayment(supabase, payment.id)
    return { payment, free_plan: true }
  }

  const razorpay = getRazorpayClient()
  const amountPaise = Math.round(amount * 100)
  const period = isYearly(plan) ? "yearly" : "monthly"

  let razorpayPlanId = plan.razorpay_plan_id
  if (!razorpayPlanId) {
    try {
      const rzpPlan = await razorpay.plans.create({
        period,
        interval: 1,
        item: {
          name: `${plan.name} (${period})`,
          amount: amountPaise,
          currency: "INR",
          description: plan.description || `ArtistOS ${plan.name} Plan`,
        },
      })
      razorpayPlanId = rzpPlan.id
      await supabase.from("platform_subscriptions").update({ razorpay_plan_id: razorpayPlanId }).eq("id", plan.id)
    } catch (err) {
      log.error({ err }, "failed to auto-create Razorpay plan")
    }
  }

  if (!razorpayPlanId) {
    await supabase
      .from("platform_payments")
      .update({ status: "failed", error_description: "Platform subscription plan is missing Razorpay plan id" })
      .eq("id", payment.id)
    throw new Error("This platform plan is not linked to a Razorpay subscription plan")
  }

  const subscription = await razorpay.subscriptions.create({
    plan_id: razorpayPlanId,
    total_count: isYearly(plan) ? YEARLY_TOTAL_COUNT : MONTHLY_TOTAL_COUNT,
    customer_notify: 1,
    notes: {
      user_id: String(userId),
      payment_id: String(payment.id),
      plan_id: String(plan.id),
      type: "platform_subscription",
    },
  })

  await supabase.from("platform_payments").update({ rp_subscription_id: subscription.id }).eq("id", payment.id)

  return {
    payment,
    checkout: {
      type: "subscription",
      payment_id: payment.id,
      subscription_id: subscription.id,
      key: getRazorpayPublicKeyId(),
      amount: amountPaise,
      name: "ArtistOS Platform",
      description: `Subscription: ${plan.name}`,
    },
  }
}

/** Browser-side checkout confirmation: checks the Razorpay signature, then completes the payment. */
export async function verifyAndCompletePlatformPayment(supabase, userId, params) {
  const { data: payment, error } = await supabase
    .from("platform_payments")
    .select("*, platform_subscriptions(*)")
    .eq("id", params.paymentId)
    .eq("user_id", userId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!payment) throw new Error("Payment not found")
  if (payment.status === "completed") return false

  if (params.razorpayOrderId) {
    if (payment.rp_order_id !== params.razorpayOrderId) throw new Error("Payment order does not match")
    if (!verifyCheckoutSignature(`${params.razorpayOrderId}|${params.razorpayPaymentId}`, params.razorpaySignature)) {
      throw new Error("Invalid payment signature")
    }
  } else if (params.razorpaySubscriptionId) {
    if (payment.rp_subscription_id !== params.razorpaySubscriptionId) {
      throw new Error("Payment subscription does not match")
    }
    if (!verifyCheckoutSignature(`${params.razorpayPaymentId}|${params.razorpaySubscriptionId}`, params.razorpaySignature)) {
      throw new Error("Invalid payment signature")
    }
  } else {
    throw new Error("Missing Razorpay order or subscription ID")
  }

  return completePlatformPayment(supabase, params.paymentId, {
    rp_payment_id: params.razorpayPaymentId,
    rp_subscription_id: params.razorpaySubscriptionId,
  })
}

/**
 * Marks a pending platform payment completed and activates/updates the artist's plan.
 * paymentMeta: { rp_payment_id?, rp_subscription_id?, rp_event_id?, payment_method? }.
 * With rp_event_id (webhook) the event is claimed first and released on failure.
 * Returns false when there was nothing to do (already completed / claimed elsewhere).
 */
export async function completePlatformPayment(supabase, paymentId, paymentMeta) {
  const eventId = paymentMeta?.rp_event_id
  if (eventId && !(await claimWebhookEvent(supabase, eventId, "platform_payment"))) return false

  try {
    return await applyCompletedPlatformPayment(supabase, paymentId, paymentMeta)
  } catch (err) {
    if (eventId) await releaseWebhookEvent(supabase, eventId)
    throw err
  }
}

async function applyCompletedPlatformPayment(supabase, paymentId, paymentMeta) {
  const { data: payment, error: fetchError } = await supabase
    .from("platform_payments")
    .select("*, platform_subscriptions(*)")
    .eq("id", paymentId)
    .single()

  if (fetchError || !payment || payment.status === "completed") return false

  const plan = payment.platform_subscriptions
  if (!plan) throw new Error("Plan details not found")

  const rpSubId = paymentMeta?.rp_subscription_id ?? payment.rp_subscription_id

  let razorpayDates = null
  if (rpSubId) {
    try {
      razorpayDates = await fetchRazorpaySubscriptionDates(rpSubId)
    } catch (err) {
      log.error({ err }, "failed to fetch Razorpay subscription dates")
    }
  }

  const { currentPeriodStart, currentPeriodEnd, nextBillingAt, subscriptionEndAt } =
    resolveCompletedPlatformPaymentDates({
      amount: Number(payment.amount),
      rpSubscriptionId: rpSubId,
      rpOrderId: payment.rp_order_id,
      razorpayDates,
    })

  // The status condition makes a browser /verify racing the webhook safe.
  const { data: completed, error: completeError } = await supabase
    .from("platform_payments")
    .update({
      status: "completed",
      rp_payment_id: paymentMeta?.rp_payment_id ?? payment.rp_payment_id,
      rp_subscription_id: paymentMeta?.rp_subscription_id ?? payment.rp_subscription_id,
      rp_event_id: paymentMeta?.rp_event_id ?? payment.rp_event_id,
      payment_method: paymentMeta?.payment_method ?? payment.payment_method,
      invoice_number: `INV-PLT-${payment.id}-${invoiceSuffix()}`,
    })
    .eq("id", paymentId)
    .eq("status", "pending")
    .select("id")
    .maybeSingle()

  if (completeError) throw new Error(`Failed to complete payment: ${completeError.message}`)
  if (!completed) return false

  const activeSub = await findSubscriptionRow(supabase, payment.user_id, rpSubId)

  if (activeSub) {
    const { error } = await supabase
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
    if (error) {
      log.error({ error }, "failed to update user_subscription")
      throw new Error(`Failed to update subscription: ${error.message}`)
    }
  } else {
    const { error } = await supabase.from("user_subscriptions").insert({
      user_id: payment.user_id,
      plan_id: plan.id,
      status: "active",
      current_period_start: currentPeriodStart,
      current_period_end: currentPeriodEnd,
      rp_subscription_id: rpSubId ?? null,
      next_billing_at: nextBillingAt,
      subscription_end_at: subscriptionEndAt,
    })
    if (error) {
      log.error({ error }, "failed to insert user_subscription")
      throw new Error(`Failed to create subscription: ${error.message}`)
    }
  }

  const quotaBytes = (Number(plan.storage_quota_mb) || (plan.has_whatsapp_automation ? 100 : 10)) * MB
  try {
    await syncUserStorageQuota(supabase, payment.user_id, quotaBytes)
  } catch (err) {
    log.error({ err }, "failed to sync storage quota after subscription")
  }

  invalidateReadOnlyCache(payment.user_id)
  return true
}

/** Moves the artist's subscription to the given Razorpay period (unix seconds) and reactivates it. */
export async function extendPlatformSubscriptionToDate(
  supabase,
  userId,
  currentEndUnix,
  currentStartUnix,
  chargeAtUnix,
  endAtUnix,
  rpSubscriptionId
) {
  const activeSub = await findSubscriptionRow(supabase, userId, rpSubscriptionId)
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

  invalidateReadOnlyCache(userId)
}

/** Webhook dates, or Razorpay's current ones for any that are missing. */
async function resolveRenewalDates(paymentMeta, rpSubId, context) {
  const dates = {
    currentStart: paymentMeta.current_start,
    currentEnd: paymentMeta.current_end,
    chargeAt: paymentMeta.charge_at,
    endAt: paymentMeta.end_at,
  }
  if (dates.currentStart && dates.currentEnd && dates.chargeAt && dates.endAt) return dates
  if (!rpSubId) return dates

  try {
    const rpSub = await getRazorpayClient().subscriptions.fetch(rpSubId)
    if (rpSub?.current_start) dates.currentStart = rpSub.current_start
    if (rpSub?.current_end) dates.currentEnd = rpSub.current_end
    if (rpSub?.charge_at) dates.chargeAt = rpSub.charge_at
    if (rpSub?.end_at) dates.endAt = rpSub.end_at
  } catch (err) {
    log.error({ err }, `failed to fetch Razorpay subscription for ${context}`)
  }
  return dates
}

/**
 * Webhook: a recurring charge on a platform subscription. The first charge (same
 * payment id as the checkout) only syncs dates; later ones create a renewal invoice
 * row and extend the subscription. Event-claimed; released on failure.
 * paymentMeta: { rp_payment_id?, rp_subscription_id?, rp_event_id, payment_method?,
 *                current_start?, current_end?, charge_at?, end_at? }
 */
export async function processPlatformRenewal(supabase, originalPaymentId, paymentMeta) {
  // Fast path only; the claim below is what actually deduplicates.
  const { data: existingEvent } = await supabase
    .from("razorpay_webhook_events")
    .select("id")
    .eq("event_id", paymentMeta.rp_event_id)
    .maybeSingle()
  if (existingEvent) return false

  const { data: originalPayment, error: fetchError } = await supabase
    .from("platform_payments")
    .select("*, platform_subscriptions(*)")
    .eq("id", originalPaymentId)
    .single()

  if (fetchError || !originalPayment) {
    log.error({ originalPaymentId }, "renewal failed: original payment not found")
    return false
  }

  const rpSubId = paymentMeta.rp_subscription_id ?? originalPayment.rp_subscription_id

  if (paymentMeta.rp_payment_id) {
    if (originalPayment.rp_payment_id === paymentMeta.rp_payment_id) {
      // The initial charge: no new invoice, but sync the latest dates.
      const dates = await resolveRenewalDates(paymentMeta, rpSubId, "initial sync")
      if (dates.currentEnd) {
        await extendPlatformSubscriptionToDate(
          supabase,
          originalPayment.user_id,
          dates.currentEnd,
          dates.currentStart,
          dates.chargeAt,
          dates.endAt,
          rpSubId
        )
      }
      return true
    }

    const { data: existingPayment } = await supabase
      .from("platform_payments")
      .select("id")
      .eq("rp_payment_id", paymentMeta.rp_payment_id)
      .maybeSingle()
    if (existingPayment) return false
  }

  if (!(await claimWebhookEvent(supabase, paymentMeta.rp_event_id, "platform_renewal"))) return false

  try {
    const plan = originalPayment.platform_subscriptions
    if (!plan) {
      log.error("renewal failed: plan details not found")
      await releaseWebhookEvent(supabase, paymentMeta.rp_event_id)
      return false
    }

    const { data: newPayment, error: insertError } = await supabase
      .from("platform_payments")
      .insert({
        user_id: originalPayment.user_id,
        plan_id: plan.id,
        plan_name: originalPayment.plan_name,
        base_amount: originalPayment.base_amount,
        amount: originalPayment.amount,
        status: "completed",
        rp_payment_id: paymentMeta.rp_payment_id,
        rp_subscription_id: rpSubId,
        rp_event_id: paymentMeta.rp_event_id,
        payment_method: paymentMeta.payment_method,
        rp_order_id: null,
        invoice_number: `INV-PLT-RNW-${Math.floor(Date.now() / 1000)}-${invoiceSuffix()}`,
      })
      .select("id")
      .single()

    if (insertError || !newPayment) {
      log.error({ insertError }, "renewal failed: could not create the renewal invoice")
      await releaseWebhookEvent(supabase, paymentMeta.rp_event_id)
      return false
    }

    const dates = await resolveRenewalDates(paymentMeta, rpSubId, "renewal")
    if (!dates.currentEnd) throw new Error("Could not determine subscription end date from Razorpay")

    await extendPlatformSubscriptionToDate(
      supabase,
      originalPayment.user_id,
      dates.currentEnd,
      dates.currentStart,
      dates.chargeAt,
      dates.endAt,
      rpSubId
    )
    return true
  } catch (err) {
    await releaseWebhookEvent(supabase, paymentMeta.rp_event_id)
    throw err
  }
}

/** Active plans, ordered for display (empty for free/lifetime users, who can't buy). */
export async function listPlans(supabase, session) {
  if (session) {
    const { data: user } = await supabase.from("users").select("is_free_user").eq("id", session.id).single()
    if (user?.is_free_user) return []
  }

  const { data, error } = await supabase
    .from("platform_subscriptions")
    .select("*")
    .eq("is_active", true)
    .order("display_order", { ascending: true })
    .order("id", { ascending: true })
  if (error) throw error
  return data
}

/** Checkout failed in the browser: pending → failed. */
export async function markPaymentFailed(supabase, userId, paymentId, errorDescription) {
  await supabase
    .from("platform_payments")
    .update({ status: "failed", error_description: errorDescription })
    .eq("id", paymentId)
    .eq("user_id", userId)
    .eq("status", "pending")
}

/**
 * Checkout dismissed: cancels the pending Razorpay subscription, then pending → cancelled
 * (never deleted: a late capture still needs the row). → false if Razorpay refused.
 */
export async function cancelPendingPayment(supabase, userId, paymentId) {
  const { data: payment } = await supabase
    .from("platform_payments")
    .select("id, rp_subscription_id")
    .eq("id", paymentId)
    .eq("user_id", userId)
    .eq("status", "pending")
    .maybeSingle()

  if (payment?.rp_subscription_id) {
    try {
      await getRazorpayClient().subscriptions.cancel(payment.rp_subscription_id, false)
    } catch (err) {
      // Still live at Razorpay (and billing): keep the row pending so the webhook can reconcile.
      log.error({ err }, "failed to cancel pending Razorpay subscription")
      return false
    }
  }

  await supabase
    .from("platform_payments")
    .update({ status: "cancelled" })
    .eq("id", paymentId)
    .eq("user_id", userId)
    .eq("status", "pending")
  return true
}
