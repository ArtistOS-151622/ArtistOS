import { createHmac, timingSafeEqual } from "node:crypto"

import { ADMIN_SESSION_MAX_AGE_SECONDS, ARTIST_SESSION_MAX_AGE_SECONDS } from "#src/config/constants.js"
import { config } from "#src/config/env.js"

/*
 * Session tokens: header.payload.signature, HMAC-SHA256, base64url.
 *
 * This MUST stay byte-compatible with lib/auth/session.ts in the Next.js app:
 * proxy.ts verifies tokens this server issues, and sessions issued by Next
 * before cutover must keep working here. tests/utils/session-token.test.js
 * checks both directions against the TypeScript implementation.
 */

const ADMIN_ROLE = "admin"
const HEADER = base64UrlEncode(JSON.stringify({ alg: "HS256", typ: "JWT" }))

function base64UrlEncode(value) {
  return Buffer.from(value).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_")
}

function base64UrlDecode(value) {
  const padded = value.padEnd(value.length + ((4 - (value.length % 4)) % 4), "=")
  return Buffer.from(padded.replace(/-/g, "+").replace(/_/g, "/"), "base64")
}

function sign(value) {
  return base64UrlEncode(createHmac("sha256", config.jwtSecret).update(value).digest())
}

const nowSeconds = () => Math.floor(Date.now() / 1000)

function encode(payload) {
  const unsigned = `${HEADER}.${base64UrlEncode(JSON.stringify(payload))}`
  return `${unsigned}.${sign(unsigned)}`
}

/** Verifies the signature and returns the decoded payload object, or null. Does not check `exp`. */
function decode(token) {
  if (typeof token !== "string") return null
  const parts = token.split(".")
  if (parts.length !== 3) return null

  const [header, payload, signature] = parts
  if (!header || !payload || !signature) return null

  const actual = Buffer.from(signature)
  const expected = Buffer.from(sign(`${header}.${payload}`))
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null

  try {
    const decoded = JSON.parse(base64UrlDecode(payload).toString("utf8"))
    return decoded && typeof decoded === "object" ? decoded : null
  } catch {
    return null
  }
}

const isUnexpired = (exp) => Number.isFinite(exp) && exp >= nowSeconds()

/**
 * @param {{ id: number, phone?: string, artist_name?: string, studio_name?: string }} session
 * Key order matters for byte-compatibility: session fields first, then iat, exp.
 */
export function createArtistToken(session) {
  const iat = nowSeconds()
  return encode({ ...session, iat, exp: iat + ARTIST_SESSION_MAX_AGE_SECONDS })
}

/** Returns `{ id, phone, artist_name, studio_name }` or null. Never accepts an admin token. */
export function verifyArtistToken(token) {
  const decoded = decode(token)
  if (!decoded || decoded.role === ADMIN_ROLE) return null

  const id = Number(decoded.id)
  if (!Number.isInteger(id) || !isUnexpired(Number(decoded.exp))) return null

  return {
    id,
    phone: decoded.phone,
    artist_name: decoded.artist_name,
    studio_name: decoded.studio_name,
  }
}

export function createAdminToken() {
  const iat = nowSeconds()
  return encode({ role: ADMIN_ROLE, iat, exp: iat + ADMIN_SESSION_MAX_AGE_SECONDS })
}

export function verifyAdminToken(token) {
  const decoded = decode(token)
  return Boolean(decoded && decoded.role === ADMIN_ROLE && isUnexpired(Number(decoded.exp)))
}
