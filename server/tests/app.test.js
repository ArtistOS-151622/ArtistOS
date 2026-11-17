import { TEST_ORIGIN } from "./helpers/env.js"

import assert from "node:assert/strict"
import { after, before, test } from "node:test"

import { createApp } from "#src/app.js"
import { listen } from "./helpers/http.js"

let server
before(async () => {
  server = await listen(createApp())
})
after(() => server.close())

test("GET /health returns ok", async () => {
  const res = await fetch(`${server.url}/health`)
  assert.equal(res.status, 200)
  assert.deepEqual(await res.json(), { status: "ok" })
})

test("every response carries a request id; a sane incoming one is reused", async () => {
  const res = await fetch(`${server.url}/health`, { headers: { "X-Request-Id": "abc12345-req" } })
  assert.equal(res.headers.get("x-request-id"), "abc12345-req")
  const generated = await fetch(`${server.url}/health`, { headers: { "X-Request-Id": "bad id!" } })
  assert.match(generated.headers.get("x-request-id"), /^[0-9a-f-]{36}$/)
})

test("unknown routes return 404 { error }", async () => {
  const res = await fetch(`${server.url}/api/does-not-exist?x=1`)
  assert.equal(res.status, 404)
  assert.deepEqual(await res.json(), { error: "Route not found: GET /api/does-not-exist" })
})

test("malformed JSON returns 400 { error }", async () => {
  const res = await fetch(`${server.url}/api/anything`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{not json",
  })
  assert.equal(res.status, 400)
  assert.deepEqual(await res.json(), { error: "Invalid JSON body" })
})

test("CORS allows the configured origin with credentials", async () => {
  const res = await fetch(`${server.url}/health`, { headers: { Origin: TEST_ORIGIN } })
  assert.equal(res.headers.get("access-control-allow-origin"), TEST_ORIGIN)
  assert.equal(res.headers.get("access-control-allow-credentials"), "true")
})

test("CORS rejects other origins with 403 { error }", async () => {
  const res = await fetch(`${server.url}/health`, { headers: { Origin: "https://evil.example" } })
  assert.equal(res.status, 403)
  assert.equal(res.headers.get("access-control-allow-origin"), null)
  assert.deepEqual(await res.json(), { error: "Origin not allowed" })
})

test("security headers are set and x-powered-by is hidden", async () => {
  const res = await fetch(`${server.url}/health`)
  assert.equal(res.headers.get("x-powered-by"), null)
  assert.equal(res.headers.get("x-content-type-options"), "nosniff")
  assert.equal(res.headers.get("cross-origin-resource-policy"), "same-site")
})
