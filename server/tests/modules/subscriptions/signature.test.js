import "../../helpers/env.js"

import assert from "node:assert/strict"
import { createHmac } from "node:crypto"
import { test } from "node:test"

process.env.RAZORPAY_KEY_SECRET = "test_key_secret_123"
process.env.RAZORPAY_WEBHOOK_SECRET = "test_webhook_secret_456"
const { verifyCheckoutSignature, verifyWebhookSignature } = await import("#src/integrations/razorpay/verify-signature.js")

const hmac = (secret, payload) => createHmac("sha256", secret).update(payload).digest("hex")

test("checkout signatures: order and subscription payloads", () => {
  const order = "order_ABC|pay_123"
  assert.equal(verifyCheckoutSignature(order, hmac("test_key_secret_123", order)), true)
  const sub = "pay_123|sub_XYZ"
  assert.equal(verifyCheckoutSignature(sub, hmac("test_key_secret_123", sub)), true)
})

test("checkout signatures: wrong secret, wrong payload, malformed, missing", () => {
  const payload = "order_ABC|pay_123"
  assert.equal(verifyCheckoutSignature(payload, hmac("other", payload)), false)
  assert.equal(verifyCheckoutSignature("order_ABC|pay_999", hmac("test_key_secret_123", payload)), false)
  assert.equal(verifyCheckoutSignature(payload, "abc"), false)
  assert.equal(verifyCheckoutSignature(payload, undefined), false)
})

test("webhook signatures use the webhook secret over the raw body", () => {
  const raw = Buffer.from('{"event":"payment.captured","payload":{}}')
  assert.equal(verifyWebhookSignature(raw, hmac("test_webhook_secret_456", raw)), true)
  // Same body signed with the checkout key secret is not accepted.
  assert.equal(verifyWebhookSignature(raw, hmac("test_key_secret_123", raw)), false)
  // A re-serialised body (whitespace change) no longer matches.
  assert.equal(verifyWebhookSignature(Buffer.from('{"event": "payment.captured","payload":{}}'), hmac("test_webhook_secret_456", raw)), false)
})
