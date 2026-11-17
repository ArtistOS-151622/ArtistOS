import Razorpay from "razorpay"

import { config } from "#src/config/env.js"

let client = null

export function getRazorpayClient() {
  if (client) return client

  const { keyId, keySecret } = config.razorpay
  if (!keyId || !keySecret) throw new Error("Razorpay credentials are not configured")

  client = new Razorpay({ key_id: keyId, key_secret: keySecret })
  return client
}

/**
 * The Next.js version also required NEXT_PUBLIC_RAZORPAY_KEY_ID (the browser checkout key).
 * That is the same value as RAZORPAY_KEY_ID and is now returned to the browser by the API,
 * so the server only needs its own key pair.
 */
export function isRazorpayConfigured() {
  return Boolean(config.razorpay.keyId && config.razorpay.keySecret)
}

/** Public key id the browser checkout needs. */
export function getRazorpayPublicKeyId() {
  return config.razorpay.keyId
}
