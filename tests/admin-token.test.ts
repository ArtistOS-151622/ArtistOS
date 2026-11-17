import assert from "node:assert/strict"
import { createHmac } from "node:crypto"
import test from "node:test"

process.env.JWT_SECRET = "test-secret-for-admin-token-tests-0123456789"

const { createAdminToken, verifyAdminToken, createArtistToken, verifyArtistToken } = await import(
  "../lib/auth/session.ts"
)

function b64url(value: string): string {
  return Buffer.from(value).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_")
}

function signRaw(payload: Record<string, unknown>): string {
  const unsigned = `${b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }))}.${b64url(JSON.stringify(payload))}`
  const signature = createHmac("sha256", process.env.JWT_SECRET as string)
    .update(unsigned)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
  return `${unsigned}.${signature}`
}

test("admin token round-trips", () => {
  assert.equal(verifyAdminToken(createAdminToken()), true)
})

test("missing or forged admin values are rejected", () => {
  assert.equal(verifyAdminToken(undefined), false)
  assert.equal(verifyAdminToken(""), false)
  assert.equal(verifyAdminToken("authenticated"), false)
})

test("tampered admin token is rejected", () => {
  const [header, , signature] = createAdminToken().split(".")
  const forgedPayload = b64url(JSON.stringify({ role: "admin", iat: 0, exp: 9_999_999_999 }))
  assert.equal(verifyAdminToken(`${header}.${forgedPayload}.${signature}`), false)
})

test("expired admin token is rejected", () => {
  const now = Math.floor(Date.now() / 1000)
  assert.equal(verifyAdminToken(signRaw({ role: "admin", iat: now - 100, exp: now - 1 })), false)
})

test("artist token is not accepted as admin", () => {
  assert.equal(verifyAdminToken(createArtistToken({ id: 1, phone: "9999999999" })), false)
})

test("admin token is not accepted as artist, even with an id", () => {
  assert.equal(verifyArtistToken(createAdminToken()), null)
  const now = Math.floor(Date.now() / 1000)
  assert.equal(verifyArtistToken(signRaw({ role: "admin", id: 1, iat: now, exp: now + 60 })), null)
})

test("artist tokens still verify", () => {
  assert.equal(verifyArtistToken(createArtistToken({ id: 42, artist_name: "A" }))?.id, 42)
})
