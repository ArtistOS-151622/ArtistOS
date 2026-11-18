import { TEST_CRON_SECRET } from "../helpers/env.js"

import assert from "node:assert/strict"
import { after, before, test } from "node:test"

import { createApp } from "#src/app.js"
import { createArtistToken } from "#src/utils/session-token.js"
import { listen } from "../helpers/http.js"

/*
 * Auth and validation for the phase 3.8–3.10 routes, up to the point where they
 * would touch Supabase/R2/Razorpay (none are configured in tests). Data paths
 * are covered by the side-by-side parity run against the dev database.
 */

let server
before(async () => {
  server = await listen(createApp())
})
after(() => server.close())

const artistCookie = `artist_session=${createArtistToken({ id: 1, phone: "9999999999", artist_name: "T", studio_name: "S" })}`

function call(method, path, { headers = {}, body } = {}) {
  return fetch(`${server.url}${path}`, {
    method,
    headers: { ...(body === undefined ? {} : { "Content-Type": "application/json" }), ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

test("artist routes return 401 { error } without a session", async () => {
  const routes = [
    ["GET", "/api/dashboard"],
    ["GET", "/api/badges"],
    ["GET", "/api/reports/customers"],
    ["GET", "/api/reports/services"],
    ["GET", "/api/reports/payments"],
    ["GET", "/api/notifications"],
    ["PATCH", "/api/notifications"],
    ["POST", "/api/push/subscribe"],
    ["POST", "/api/push/unsubscribe"],
    ["POST", "/api/push/test"],
    ["GET", "/api/whatsapp/templates"],
    ["POST", "/api/whatsapp/templates"],
    ["POST", "/api/whatsapp/templates/upload"],
    ["DELETE", "/api/whatsapp/templates/1"],
  ]
  for (const [method, path] of routes) {
    const res = await call(method, path)
    assert.equal(res.status, 401, `${method} ${path}`)
    assert.deepEqual(await res.json(), { error: "Unauthorized" }, `${method} ${path}`)
  }
})

test("push routes validate their body before touching the database", async () => {
  const headers = { Cookie: artistCookie }

  let res = await call("POST", "/api/push/subscribe", { headers, body: { endpoint: "https://push", keys: {} } })
  assert.equal(res.status, 400)
  assert.deepEqual(await res.json(), { error: "Invalid push subscription" })

  res = await call("POST", "/api/push/unsubscribe", { headers, body: {} })
  assert.equal(res.status, 400)
  assert.deepEqual(await res.json(), { error: "Endpoint is required" })

  // VAPID keys are unset in tests: the configuration check comes before the body check.
  res = await call("POST", "/api/push/test", { headers, body: {} })
  assert.equal(res.status, 503)
  assert.deepEqual(await res.json(), { error: "Push notifications are not configured" })
})

test("deleting a template needs a numeric id", async () => {
  const res = await call("DELETE", "/api/whatsapp/templates/abc", { headers: { Cookie: artistCookie } })
  assert.equal(res.status, 400)
  assert.deepEqual(await res.json(), { error: "Invalid template ID" })
})

test("cron routes need the CRON_SECRET bearer token", async () => {
  for (const [method, path] of [
    ["GET", "/api/cron/notifications/scan-bookings"],
    ["POST", "/api/cron/notifications/scan-bookings"],
    ["GET", "/api/cron/notifications/dispatch"],
    ["GET", "/api/cron/notifications/daily-agenda"],
    ["POST", "/api/cron/notifications/daily-agenda"],
  ]) {
    for (const authorization of [undefined, "Bearer wrong-secret", TEST_CRON_SECRET]) {
      const res = await call(method, path, { headers: authorization ? { Authorization: authorization } : {} })
      assert.equal(res.status, 401, `${method} ${path} with ${authorization}`)
      assert.deepEqual(await res.json(), { error: "Unauthorized" })
    }
  }
})

test("expire-shares keeps the portfolio envelope, including its 401", async () => {
  const res = await call("GET", "/api/cron/portfolio/expire-shares", {
    headers: { Authorization: "Bearer wrong-secret" },
  })
  assert.equal(res.status, 401)
  assert.deepEqual(await res.json(), { status: false, message: "Unauthorized", data: null })
})

test("a valid cron token reaches the job (dispatch reports push as unconfigured)", async () => {
  const res = await call("GET", "/api/cron/notifications/dispatch", {
    headers: { Authorization: `Bearer ${TEST_CRON_SECRET}` },
  })
  assert.equal(res.status, 503)
  assert.deepEqual(await res.json(), { error: "Push notifications are not configured" })
})

test("the Razorpay webhook refuses everything while its secret is unset", async () => {
  const res = await call("POST", "/api/webhooks/razorpay", { body: { event: "payment.captured" } })
  assert.equal(res.status, 500)
  assert.deepEqual(await res.json(), {
    status: false,
    message: "Razorpay webhook secret is not configured",
    data: null,
  })
})
