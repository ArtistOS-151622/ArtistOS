import "../../helpers/env.js"

import assert from "node:assert/strict"
import { createHmac } from "node:crypto"
import { after, before, test } from "node:test"

import { listen } from "../../helpers/http.js"

const WEBHOOK_SECRET = "test-webhook-secret"

let server
let url
before(async () => {
  // env.js reads process.env once, on first import: set these before loading the app.
  process.env.RAZORPAY_WEBHOOK_SECRET = WEBHOOK_SECRET
  // Never contacted: the events sent below make no database calls.
  process.env.SUPABASE_URL = "http://127.0.0.1:9"
  process.env.SUPABASE_ANON_KEY = "test-anon-key"
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key"
  const { createApp } = await import("#src/app.js")
  server = await listen(createApp())
  url = `${server.url}/api/webhooks/razorpay`
})
after(() => server.close())

const sign = (body) => createHmac("sha256", WEBHOOK_SECRET).update(body).digest("hex")

function post(body, headers = {}) {
  return fetch(url, { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body })
}

test("a missing or wrong signature is 401 (envelope)", async () => {
  const body = JSON.stringify({ event: "payment.captured" })
  for (const signature of [undefined, "deadbeef", sign(body + " ")]) {
    const res = await post(body, signature ? { "X-Razorpay-Signature": signature } : {})
    assert.equal(res.status, 401)
    assert.deepEqual(await res.json(), { status: false, message: "Invalid webhook signature", data: null })
  }
})

test("a valid signature without x-razorpay-event-id is 400", async () => {
  const body = JSON.stringify({ event: "payment.captured" })
  const res = await post(body, { "X-Razorpay-Signature": sign(body) })
  assert.equal(res.status, 400)
  assert.deepEqual(await res.json(), { status: false, message: "Missing x-razorpay-event-id header", data: null })
})

test("a signed body that isn't JSON is 400", async () => {
  const body = "{not json"
  const res = await post(body, { "X-Razorpay-Signature": sign(body), "X-Razorpay-Event-Id": "evt_bad" })
  assert.equal(res.status, 400)
  assert.deepEqual(await res.json(), { status: false, message: "Invalid webhook payload", data: null })
})

test("the signature is checked over the exact raw bytes", async () => {
  // Non-canonical JSON (spacing, key order, unicode): re-serialising would break the HMAC.
  const body = '{ "event":"refund.created",  "note":"मेहंदी" }'
  const res = await post(body, { "X-Razorpay-Signature": sign(body), "X-Razorpay-Event-Id": "evt_ok" })
  assert.equal(res.status, 200)
  assert.deepEqual(await res.json(), {
    status: true,
    message: "Webhook processed",
    data: { event: "refund.created" },
  })
})

test("the webhook is not subject to the read-only gate or the JSON body parser", async () => {
  // text/plain would be ignored by express.json; the raw parser must still hand over the bytes.
  const body = JSON.stringify({ event: "order.paid" })
  const res = await post(body, {
    "Content-Type": "text/plain",
    "X-Razorpay-Signature": sign(body),
    "X-Razorpay-Event-Id": "evt_plain",
  })
  assert.equal(res.status, 200)
})
