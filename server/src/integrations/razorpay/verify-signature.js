import { createHmac, timingSafeEqual } from "node:crypto"

import { config } from "#src/config/env.js"

function safeEqualHex(expected, actual) {
  const a = Buffer.from(expected)
  const b = Buffer.from(String(actual ?? ""))
  return a.length === b.length && timingSafeEqual(a, b)
}

/**
 * Checkout signature: HMAC-SHA256(key secret) of "order_id|payment_id" (orders)
 * or "payment_id|subscription_id" (subscriptions), hex.
 */
export function verifyCheckoutSignature(payload, signature) {
  if (!config.razorpay.keySecret) throw new Error("Razorpay key secret is not configured")
  return safeEqualHex(createHmac("sha256", config.razorpay.keySecret).update(payload).digest("hex"), signature)
}

/** Webhook signature: HMAC-SHA256(webhook secret) of the raw request body, hex. */
export function verifyWebhookSignature(rawBody, signature) {
  if (!config.razorpay.webhookSecret) throw new Error("Razorpay webhook secret is not configured")
  return safeEqualHex(createHmac("sha256", config.razorpay.webhookSecret).update(rawBody).digest("hex"), signature)
}
