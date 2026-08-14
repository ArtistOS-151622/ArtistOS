import { createHmac, timingSafeEqual } from "crypto"
import { type NextRequest } from "next/server"

import { completePurchase } from "@/lib/portfolio/billing"
import { extendSubscriptionPeriod } from "@/lib/portfolio/quota"
import { portfolioError, portfolioSuccess } from "@/lib/portfolio/response"
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

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get("x-razorpay-signature") ?? ""

  if (!process.env.RAZORPAY_WEBHOOK_SECRET) {
    return portfolioError("Razorpay webhook secret is not configured", 500)
  }

  if (!verifyWebhookSignature(body, signature)) {
    return portfolioError("Invalid webhook signature", 401)
  }

  const payload = JSON.parse(body)
  const eventType = payload.event as string
  const eventId = payload.event_id ?? payload.id

  const supabase = createAdminClient()

  try {
    if (eventType === "payment.captured" || eventType === "subscription.activated") {
      const notes =
        payload.payload?.payment?.entity?.notes ??
        payload.payload?.subscription?.entity?.notes ??
        {}

      const type = notes.type as string | undefined
      
      if (type === "platform_subscription") {
        const paymentId = Number(notes.payment_id)
        if (paymentId) {
          const { completePlatformPayment } = await import("@/lib/platform-billing")
          await completePlatformPayment(supabase, paymentId, {
            rp_payment_id: payload.payload?.payment?.entity?.id,
            rp_event_id: eventId,
            payment_method: payload.payload?.payment?.entity?.method,
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
        if (userId && planId) {
          const { data: plan } = await supabase
            .from("platform_subscriptions")
            .select("*")
            .eq("id", planId)
            .single()

          if (plan) {
            const { extendPlatformSubscription } = await import("@/lib/platform-billing")
            await extendPlatformSubscription(supabase, userId, plan.duration_in_days || 30)
          }
        }

        const paymentId = Number(notes.payment_id)
        if (paymentId) {
          const { completePlatformPayment } = await import("@/lib/platform-billing")
          await completePlatformPayment(supabase, paymentId, {
            rp_subscription_id: subscription?.id,
            rp_event_id: `${eventId}-renewal`,
          })
        }
      } else {
        if (userId && planId) {
          const { data: plan } = await supabase
            .from("storage_plans")
            .select("*")
            .eq("id", planId)
            .single()

          if (plan) {
            await extendSubscriptionPeriod(supabase, userId, plan.expires_in_days)
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

    return portfolioSuccess("Webhook processed", { event: eventType })
  } catch (err) {
    return portfolioError(err instanceof Error ? err.message : "Webhook failed", 500)
  }
}
