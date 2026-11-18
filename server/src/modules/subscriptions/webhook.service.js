import {
  completePlatformPayment,
  processPlatformRenewal,
} from "#src/modules/subscriptions/platform/platform.service.js"
import { completePurchase } from "#src/modules/subscriptions/storage/storage-purchase.service.js"
import { extendSubscriptionPeriodToDate } from "#src/shared/portfolio/quota.js"
import { invalidateReadOnlyCache } from "#src/shared/subscription/read-only.js"

/*
 * Razorpay webhook events → billing state. The webhook is the source of truth
 * for payments. Idempotency comes from the x-razorpay-event-id header: the
 * complete/renew services claim each (suffixed) event id exactly once.
 *
 * Payload: { event, payload: { payment?: { entity }, subscription?: { entity } } }
 * Entities carry { id, notes, method, subscription_id, current_start, current_end, charge_at, end_at }.
 */

const SUBSCRIPTION_STATUS_BY_EVENT = Object.freeze({
  "subscription.cancelled": "cancelled",
  "subscription.halted": "halted",
  "subscription.pending": "pending",
  "subscription.paused": "paused",
  "subscription.resumed": "active",
})

const PLATFORM_SUBSCRIPTION_TYPE = "platform_subscription"

/** Subscription notes overlaid with payment notes (renewal payments often carry empty notes). */
export function getRazorpayWebhookNotes(payload) {
  return {
    ...(payload?.payload?.subscription?.entity?.notes ?? {}),
    ...(payload?.payload?.payment?.entity?.notes ?? {}),
  }
}

export function getRazorpayWebhookSubscriptionId(payload) {
  return payload?.payload?.subscription?.entity?.id ?? payload?.payload?.payment?.entity?.subscription_id
}

/** The platform_payments row the event belongs to: by notes.payment_id, else latest for the subscription. */
async function findPlatformPayment(supabase, payload) {
  const notePaymentId = Number(getRazorpayWebhookNotes(payload).payment_id)
  let query = supabase.from("platform_payments").select("id, status")

  if (notePaymentId) {
    query = query.eq("id", notePaymentId)
  } else {
    const subscriptionId = getRazorpayWebhookSubscriptionId(payload)
    if (!subscriptionId) return null
    query = query.eq("rp_subscription_id", subscriptionId).order("created_at", { ascending: false }).limit(1)
  }

  const { data } = await query.maybeSingle()
  return data ? { id: Number(data.id), status: String(data.status) } : null
}

/** Platform plan (vs storage plan) event: tagged in notes, or a subscription we created a platform payment for. */
async function isPlatformEvent(supabase, payload, notes) {
  if (notes.type === PLATFORM_SUBSCRIPTION_TYPE) return true

  const subscriptionId = getRazorpayWebhookSubscriptionId(payload)
  if (!subscriptionId) return false

  const { data } = await supabase
    .from("platform_payments")
    .select("id")
    .eq("rp_subscription_id", subscriptionId)
    .limit(1)
    .maybeSingle()
  return Boolean(data)
}

/** payment.captured / subscription.activated */
async function handleActivation(supabase, payload, eventId, notes) {
  const payment = payload.payload?.payment?.entity
  const subscription = payload.payload?.subscription?.entity

  if (await isPlatformEvent(supabase, payload, notes)) {
    const platformPayment = await findPlatformPayment(supabase, payload)
    if (!platformPayment) return

    const completed = await completePlatformPayment(supabase, platformPayment.id, {
      rp_payment_id: payment?.id,
      rp_subscription_id: subscription?.id ?? payment?.subscription_id,
      rp_event_id: eventId,
      payment_method: payment?.method,
    })

    // Already completed + a captured subscription payment → it's a renewal.
    if (!completed && payment?.subscription_id) {
      await processPlatformRenewal(supabase, platformPayment.id, {
        rp_payment_id: payment.id,
        rp_subscription_id: payment.subscription_id,
        rp_event_id: `${eventId}-captured-renewal`,
        payment_method: payment.method,
      })
    }
    return
  }

  const purchaseId = Number(notes.purchase_id)
  if (purchaseId) {
    await completePurchase(supabase, purchaseId, {
      rp_payment_id: payment?.id,
      rp_subscription_id: subscription?.id,
      rp_event_id: eventId,
      payment_method: payment?.method,
    })
  }
}

/** subscription.charged: first charge completes the payment, later ones renew it. */
async function handleCharged(supabase, payload, eventId, notes) {
  const payment = payload.payload?.payment?.entity
  const subscription = payload.payload?.subscription?.entity

  if (await isPlatformEvent(supabase, payload, notes)) {
    const platformPayment = await findPlatformPayment(supabase, payload)
    if (!platformPayment) return

    const meta = {
      rp_payment_id: payment?.id,
      rp_subscription_id: subscription?.id ?? payment?.subscription_id,
      payment_method: payment?.method,
    }
    if (platformPayment.status !== "completed") {
      await completePlatformPayment(supabase, platformPayment.id, { ...meta, rp_event_id: `${eventId}-initial` })
    } else {
      await processPlatformRenewal(supabase, platformPayment.id, {
        ...meta,
        rp_event_id: `${eventId}-renewal`,
        current_start: subscription?.current_start,
        current_end: subscription?.current_end,
        charge_at: subscription?.charge_at,
        end_at: subscription?.end_at,
      })
    }
    return
  }

  // Storage plan renewal.
  const userId = Number(notes.user_id)
  const planId = Number(notes.plan_id)
  if (userId && planId) {
    const { data: plan } = await supabase.from("storage_plans").select("*").eq("id", planId).single()
    if (plan && subscription?.current_end) {
      await extendSubscriptionPeriodToDate(supabase, userId, subscription.current_end)
    }
  }

  const purchaseId = Number(notes.purchase_id)
  if (purchaseId) {
    await completePurchase(supabase, purchaseId, {
      rp_subscription_id: subscription?.id,
      rp_event_id: `${eventId}-renewal`,
    })
  }
}

/** cancelled / halted / pending / paused / resumed → user_subscriptions.status (platform plans only). */
async function handleStatusChange(supabase, payload, eventType, notes) {
  if (!(await isPlatformEvent(supabase, payload, notes))) return

  const subscription = payload.payload?.subscription?.entity
  const userId = Number(notes.user_id)
  const status = SUBSCRIPTION_STATUS_BY_EVENT[eventType] ?? "active"

  if (subscription?.id) {
    let query = supabase.from("user_subscriptions").update({ status }).eq("rp_subscription_id", subscription.id)
    if (userId) query = query.eq("user_id", userId)
    await query
  } else if (userId) {
    await supabase.from("user_subscriptions").update({ status }).eq("user_id", userId)
  }

  if (userId) invalidateReadOnlyCache(userId)
}

/** Applies one verified webhook event. Unknown event types are acknowledged and ignored. */
export async function processRazorpayWebhook(supabase, payload, eventId) {
  const eventType = payload?.event
  const notes = getRazorpayWebhookNotes(payload)

  if (eventType === "payment.captured" || eventType === "subscription.activated") {
    await handleActivation(supabase, payload, eventId, notes)
  } else if (eventType === "subscription.charged") {
    await handleCharged(supabase, payload, eventId, notes)
  } else if (Object.hasOwn(SUBSCRIPTION_STATUS_BY_EVENT, eventType)) {
    await handleStatusChange(supabase, payload, eventType, notes)
  }

  return eventType
}
