import { createHmac, timingSafeEqual } from "crypto"
import { type NextRequest } from "next/server"

import { completePurchase } from "@/lib/portfolio/billing"
import { extendSubscriptionPeriodToDate } from "@/lib/portfolio/quota"
import { portfolioError, portfolioSuccess } from "@/lib/portfolio/response"
import {
  getRazorpayWebhookNotes,
  getRazorpayWebhookSubscriptionId,
  type RazorpayWebhookPayload,
} from "@/lib/razorpay-webhook-platform"
import { createAdminClient } from "@/lib/supabase/admin"

function verifyWebhookSignature(body: string, signature: string): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET
  if (!secret) return false

  const expected = createHmac("sha256", secret).update(body).digest("hex")
  const expectedBuffer = Buffer.from(expected)
  const signatureBuffer = Buffer.from(signature)
  return (
    expectedBuffer.length === signatureBuffer.length &&
    timingSafeEqual(expectedBuffer, signatureBuffer)
  )
}

async function findPlatformPaymentId(
  supabase: ReturnType<typeof createAdminClient>,
  payload: RazorpayWebhookPayload
) {
  const payment = await findPlatformPayment(supabase, payload)
  return payment?.id ?? null
}

async function findPlatformPayment(
  supabase: ReturnType<typeof createAdminClient>,
  payload: RazorpayWebhookPayload
) {
  const notes = getRazorpayWebhookNotes(payload)
  const notePaymentId = Number(notes.payment_id)
  if (notePaymentId) {
    const { data } = await supabase
      .from("platform_payments")
      .select("id, status")
      .eq("id", notePaymentId)
      .maybeSingle()

    return data ? { id: Number(data.id), status: String(data.status) } : null
  }

  const subscriptionId = getRazorpayWebhookSubscriptionId(payload)
  if (!subscriptionId) return null

  const { data } = await supabase
    .from("platform_payments")
    .select("id, status")
    .eq("rp_subscription_id", subscriptionId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  return data ? { id: Number(data.id), status: String(data.status) } : null
}

async function hasPlatformSubscription(
  supabase: ReturnType<typeof createAdminClient>,
  payload: RazorpayWebhookPayload
) {
  const notes = getRazorpayWebhookNotes(payload)
  if (notes.type === "platform_subscription") return true

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

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get("x-razorpay-signature") ?? ""

  if (!process.env.RAZORPAY_WEBHOOK_SECRET) {
    return portfolioError("Razorpay webhook secret is not configured", 500)
  }

  if (!verifyWebhookSignature(body, signature)) {
    return portfolioError("Invalid webhook signature", 401)
  }

  // Razorpay sends the event id as a request header, never in the body, and
  // retries delivery in exponential backoff for 24 hours on any non-2xx or
  // 5s timeout. This header is what makes those retries idempotent, so refuse
  // to process an event we cannot identify rather than risk double-crediting.
  // https://razorpay.com/docs/webhooks/best-practices/
  const eventId = request.headers.get("x-razorpay-event-id")

  if (!eventId) {
    return portfolioError("Missing x-razorpay-event-id header", 400)
  }

  const payload = JSON.parse(body) as RazorpayWebhookPayload
  const eventType = payload.event as string

  const supabase = createAdminClient()

  try {
    if (eventType === "payment.captured" || eventType === "subscription.activated") {
      const notes = getRazorpayWebhookNotes(payload)
      const type = notes.type as string | undefined
      
      if (type === "platform_subscription" || await hasPlatformSubscription(supabase, payload)) {
        const paymentId = await findPlatformPaymentId(supabase, payload)
        if (paymentId) {
          const subscription = payload.payload?.subscription?.entity
          const payment = payload.payload?.payment?.entity
          const { completePlatformPayment } = await import("@/lib/platform-billing")
          const completed = await completePlatformPayment(supabase, paymentId, {
            rp_payment_id: payment?.id,
            rp_subscription_id: subscription?.id ?? payment?.subscription_id,
            rp_event_id: eventId,
            payment_method: payment?.method,
          })

          if (!completed && payment?.subscription_id) {
            const { processPlatformRenewal } = await import("@/lib/platform-billing")
            await processPlatformRenewal(supabase, paymentId, {
              rp_payment_id: payment.id,
              rp_subscription_id: payment.subscription_id,
              rp_event_id: `${eventId}-captured-renewal`,
              payment_method: payment.method,
            })
          }
        }
      } else {
        const purchaseId = Number(notes.purchase_id)
        if (purchaseId) {
          await completePurchase(supabase, purchaseId, {
            rp_payment_id: payload.payload?.payment?.entity?.id,
            rp_subscription_id: payload.payload?.subscription?.entity?.id,
            rp_event_id: eventId,
            payment_method: payload.payload?.payment?.entity?.method,
          })
        }
      }
    }

    if (eventType === "subscription.charged") {
      const subscription = payload.payload?.subscription?.entity
      const notes = getRazorpayWebhookNotes(payload)
      const userId = Number(notes.user_id)
      const planId = Number(notes.plan_id)
      const type = notes.type as string | undefined

      if (type === "platform_subscription" || await hasPlatformSubscription(supabase, payload)) {
        const platformPayment = await findPlatformPayment(supabase, payload)
        if (platformPayment) {
          const payment = payload.payload?.payment?.entity
          const { completePlatformPayment, processPlatformRenewal } = await import("@/lib/platform-billing")

          if (platformPayment.status !== "completed") {
            await completePlatformPayment(supabase, platformPayment.id, {
              rp_payment_id: payment?.id,
              rp_subscription_id: subscription?.id ?? payment?.subscription_id,
              rp_event_id: `${eventId}-initial`,
              payment_method: payment?.method,
            })
          } else {
            await processPlatformRenewal(supabase, platformPayment.id, {
              rp_payment_id: payment?.id,
              rp_subscription_id: subscription?.id ?? payment?.subscription_id,
              rp_event_id: `${eventId}-renewal`,
              payment_method: payment?.method,
              current_start: subscription?.current_start,
              current_end: subscription?.current_end,
              charge_at: subscription?.charge_at,
              end_at: subscription?.end_at,
            })
          }
        }
      } else {
        if (userId && planId) {
          const { data: plan } = await supabase
            .from("storage_plans")
            .select("*")
            .eq("id", planId)
            .single()

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
    }

    if (
      eventType === "subscription.cancelled" ||
      eventType === "subscription.halted" ||
      eventType === "subscription.pending" ||
      eventType === "subscription.paused" ||
      eventType === "subscription.resumed"
    ) {
      const subscription = payload.payload?.subscription?.entity
      const notes = getRazorpayWebhookNotes(payload)
      const type = notes.type as string | undefined
      
      if (type === "platform_subscription" || await hasPlatformSubscription(supabase, payload)) {
        const userId = Number(notes.user_id)
        const statusByEvent: Record<string, string> = {
          "subscription.cancelled": "cancelled",
          "subscription.halted": "halted",
          "subscription.pending": "pending",
          "subscription.paused": "paused",
          "subscription.resumed": "active",
        }

        if (subscription?.id) {
          let query = supabase
            .from("user_subscriptions")
            .update({ status: statusByEvent[eventType] ?? "active" })
            .eq("rp_subscription_id", subscription.id)

          if (userId) query = query.eq("user_id", userId)

          await query
        } else if (userId) {
          await supabase
            .from("user_subscriptions")
            .update({ status: statusByEvent[eventType] ?? "active" })
            .eq("user_id", userId)
        }
      }
    }

    return portfolioSuccess("Webhook processed", { event: eventType })
  } catch (err) {
    return portfolioError(err instanceof Error ? err.message : "Webhook failed", 500)
  }
}
