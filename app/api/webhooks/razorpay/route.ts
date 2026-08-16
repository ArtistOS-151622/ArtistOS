import { createHmac, timingSafeEqual } from "crypto"
import { type NextRequest } from "next/server"

import { completePurchase } from "@/lib/portfolio/billing"
import { extendSubscriptionPeriodToDate } from "@/lib/portfolio/quota"
import { portfolioError, portfolioSuccess } from "@/lib/portfolio/response"
import { createAdminClient } from "@/lib/supabase/admin"

type RazorpayNotes = Record<string, unknown>
type RazorpayEntity = {
  id?: string
  notes?: RazorpayNotes
  method?: string
  subscription_id?: string
  current_start?: number
  current_end?: number
  charge_at?: number
  end_at?: number
}
type RazorpayWebhookPayload = {
  event?: string
  event_id?: string
  id?: string
  payload?: {
    payment?: { entity?: RazorpayEntity }
    subscription?: { entity?: RazorpayEntity }
  }
}

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

function getNotes(payload: RazorpayWebhookPayload): RazorpayNotes {
  return (
    payload.payload?.payment?.entity?.notes ??
    payload.payload?.subscription?.entity?.notes ??
    {}
  )
}

async function findPlatformPaymentId(
  supabase: ReturnType<typeof createAdminClient>,
  payload: RazorpayWebhookPayload
) {
  const notes = getNotes(payload)
  const notePaymentId = Number(notes.payment_id)
  if (notePaymentId) return notePaymentId

  const subscriptionId =
    payload.payload?.subscription?.entity?.id ??
    payload.payload?.payment?.entity?.subscription_id

  if (!subscriptionId) return null

  const { data } = await supabase
    .from("platform_payments")
    .select("id")
    .eq("rp_subscription_id", subscriptionId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  return data?.id ? Number(data.id) : null
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

  const payload = JSON.parse(body) as RazorpayWebhookPayload
  const eventType = payload.event as string
  const eventId = payload.event_id ?? payload.id

  const supabase = createAdminClient()

  try {
    if (eventType === "payment.captured" || eventType === "subscription.activated") {
      const notes = getNotes(payload)
      const type = notes.type as string | undefined
      
      if (type === "platform_subscription") {
        const paymentId = await findPlatformPaymentId(supabase, payload)
        if (paymentId) {
          const subscription = payload.payload?.subscription?.entity
          const payment = payload.payload?.payment?.entity
          const { completePlatformPayment } = await import("@/lib/platform-billing")
          await completePlatformPayment(supabase, paymentId, {
            rp_payment_id: payment?.id,
            rp_subscription_id: subscription?.id ?? payment?.subscription_id,
            rp_event_id: eventId,
            payment_method: payment?.method,
          })
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
      const notes = subscription?.notes ?? {}
      const userId = Number(notes.user_id)
      const planId = Number(notes.plan_id)
      const type = notes.type as string | undefined

      if (type === "platform_subscription") {
        const paymentId = Number(notes.payment_id)
        if (paymentId) {
          const { processPlatformRenewal } = await import("@/lib/platform-billing")
          await processPlatformRenewal(supabase, paymentId, {
            rp_payment_id: payload.payload?.payment?.entity?.id,
            rp_subscription_id: subscription?.id,
            rp_event_id: `${eventId}-renewal`,
            current_start: subscription?.current_start,
            current_end: subscription?.current_end,
            charge_at: subscription?.charge_at,
            end_at: subscription?.end_at,
          })
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

    if (eventType === "subscription.cancelled" || eventType === "subscription.halted") {
      const subscription = payload.payload?.subscription?.entity
      const notes = subscription?.notes ?? {}
      const type = notes.type as string | undefined
      
      if (type === "platform_subscription") {
        const userId = Number(notes.user_id)
        if (userId && subscription?.id) {
          await supabase
            .from("user_subscriptions")
            .update({ status: eventType === "subscription.cancelled" ? "cancelled" : "halted" })
            .eq("user_id", userId)
            .eq("rp_subscription_id", subscription.id)
        }
      }
    }

    return portfolioSuccess("Webhook processed", { event: eventType })
  } catch (err) {
    return portfolioError(err instanceof Error ? err.message : "Webhook failed", 500)
  }
}
