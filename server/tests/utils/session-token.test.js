import { TEST_JWT_SECRET } from "../helpers/env.js"

import assert from "node:assert/strict"
import { createHmac } from "node:crypto"
import { test } from "node:test"

import * as js from "#src/utils/session-token.js"

// The TypeScript implementation used by the Next.js app (proxy.ts, old API routes).
// Node strips the types at load time; this file stays in lib/ after the migration.
const ts = await import("../../../lib/auth/session.ts")

const FIXED_NOW_MS = Date.UTC(2026, 10, 17, 10, 0, 0)
const artist = { id: 42, phone: "9876543210", artist_name: "Asha", studio_name: "Asha Mehndi" }

function b64url(value) {
  return Buffer.from(value).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_")
}

function signRaw(payload) {
  const unsigned = `${b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }))}.${b64url(JSON.stringify(payload))}`
  const sig = createHmac("sha256", TEST_JWT_SECRET).update(unsigned).digest("base64")
  return `${unsigned}.${sig.replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_")}`
}

test("artist tokens are byte-identical to the TypeScript implementation", (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: FIXED_NOW_MS })
  assert.equal(js.createArtistToken(artist), ts.createArtistToken(artist))
})

test("admin tokens are byte-identical to the TypeScript implementation", (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: FIXED_NOW_MS })
  assert.equal(js.createAdminToken(), ts.createAdminToken())
})

test("artist token issued by Next verifies here, and the reverse", () => {
  assert.deepEqual(js.verifyArtistToken(ts.createArtistToken(artist)), artist)
  assert.deepEqual(ts.verifyArtistToken(js.createArtistToken(artist)), artist)
})

test("admin token issued by Next verifies here, and the reverse", () => {
  assert.equal(js.verifyAdminToken(ts.createAdminToken()), true)
  assert.equal(ts.verifyAdminToken(js.createAdminToken()), true)
})

test("artist and admin tokens are never accepted as each other", () => {
  assert.equal(js.verifyAdminToken(js.createArtistToken(artist)), false)
  assert.equal(js.verifyArtistToken(js.createAdminToken()), null)
  const now = Math.floor(Date.now() / 1000)
  assert.equal(js.verifyArtistToken(signRaw({ role: "admin", id: 1, iat: now, exp: now + 60 })), null)
})

test("expired, tampered, malformed and foreign-secret tokens are rejected", () => {
  const now = Math.floor(Date.now() / 1000)
  assert.equal(js.verifyArtistToken(signRaw({ id: 1, iat: now - 100, exp: now - 1 })), null)
  assert.equal(js.verifyAdminToken(signRaw({ role: "admin", iat: now - 100, exp: now - 1 })), false)

  const [header, , signature] = js.createArtistToken(artist).split(".")
  const forged = b64url(JSON.stringify({ id: 1, iat: now, exp: now + 3600 }))
  assert.equal(js.verifyArtistToken(`${header}.${forged}.${signature}`), null)

  for (const bad of [undefined, null, "", "authenticated", "a.b", "a.b.c.d"]) {
    assert.equal(js.verifyArtistToken(bad), null)
    assert.equal(js.verifyAdminToken(bad), false)
  }

  const otherSecret = createHmac("sha256", "some-other-secret").update("x").digest("base64")
  assert.equal(js.verifyArtistToken(`${header}.${forged}.${otherSecret}`), null)
})

test("non-integer artist ids are rejected", () => {
  const now = Math.floor(Date.now() / 1000)
  assert.equal(js.verifyArtistToken(signRaw({ id: "abc", iat: now, exp: now + 60 })), null)
  assert.equal(js.verifyArtistToken(signRaw({ iat: now, exp: now + 60 })), null)
})

