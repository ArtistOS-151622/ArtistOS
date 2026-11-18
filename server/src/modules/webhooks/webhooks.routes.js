import express, { Router } from "express"

import { config } from "#src/config/env.js"
import { verifyWebhookSignature } from "#src/integrations/razorpay/verify-signature.js"
import { createAdminClient } from "#src/integrations/supabase.js"
import { processRazorpayWebhook } from "#src/modules/subscriptions/webhook.service.js"
import { portfolioError, sendPortfolio, useEnvelopeErrors } from "#src/shared/portfolio/response.js"

// Razorpay payloads are small; this only caps abuse of an unauthenticated endpoint.
const WEBHOOK_BODY_LIMIT = "1mb"

/**
 * POST /api/webhooks/razorpay. Thin: raw body + HMAC check + event id, then the
 * subscriptions module applies the event. Envelope responses, as before.
 */
async function razorpayWebhook(req, res) {
  if (!config.razorpay.webhookSecret) throw portfolioError("Razorpay webhook secret is not configured", 500)

  // express.raw leaves req.body unset ({}) when there is no body at all.
  const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0)
  if (!verifyWebhookSignature(rawBody, req.get("x-razorpay-signature") ?? "")) {
    throw portfolioError("Invalid webhook signature", 401)
  }

  // Razorpay sends the event id only as this header and retries for 24 h on any
  // non-2xx or 5 s timeout. The id is what makes those retries idempotent, so an
  // event we can't identify is refused rather than risk double-crediting.
  // https://razorpay.com/docs/webhooks/best-practices/
  const eventId = req.get("x-razorpay-event-id")
  if (!eventId) throw portfolioError("Missing x-razorpay-event-id header", 400)

  let payload
  try {
    payload = JSON.parse(rawBody.toString("utf8"))
  } catch {
    throw portfolioError("Invalid webhook payload", 400)
  }

  let eventType
  try {
    eventType = await processRazorpayWebhook(createAdminClient(), payload, eventId)
  } catch (err) {
    throw portfolioError(err instanceof Error ? err.message : "Webhook failed", 500)
  }
  sendPortfolio(res, "Webhook processed", { event: eventType })
}

/** Mounted under /api/webhooks, before the JSON parser (the signature covers the raw bytes). */
export const razorpayWebhookRouter = Router()

razorpayWebhookRouter.post(
  "/",
  useEnvelopeErrors,
  // Any content type: the bytes must reach the HMAC check untouched.
  express.raw({ type: () => true, limit: WEBHOOK_BODY_LIMIT }),
  razorpayWebhook
)
