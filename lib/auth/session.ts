import type { NextRequest } from "next/server"
import { createHmac, timingSafeEqual } from "crypto"

export type ArtistSession = {
  id: number
  phone?: string
  artist_name?: string
  studio_name?: string
}

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7

type JwtPayload = ArtistSession & {
  iat: number
  exp: number
}

function base64UrlEncode(value: Buffer | string): string {
  return Buffer.from(value)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
}

function base64UrlDecode(value: string): Buffer {
  const padded = value.padEnd(value.length + ((4 - (value.length % 4)) % 4), "=")
  return Buffer.from(padded.replace(/-/g, "+").replace(/_/g, "/"), "base64")
}

function getJwtSecret(): string {
  const secret =
    process.env.JWT_SECRET ||
    process.env.AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    (process.env.NODE_ENV === "production" ? "" : "artistos-local-dev-secret")

  if (!secret) throw new Error("JWT_SECRET is not configured")
  return secret
}

function signTokenPart(value: string): string {
  return base64UrlEncode(createHmac("sha256", getJwtSecret()).update(value).digest())
}

export function createArtistToken(session: ArtistSession): string {
  const now = Math.floor(Date.now() / 1000)
  const header = base64UrlEncode(JSON.stringify({ alg: "HS256", typ: "JWT" }))
  const payload = base64UrlEncode(
    JSON.stringify({
      ...session,
      iat: now,
      exp: now + SESSION_MAX_AGE_SECONDS,
    } satisfies JwtPayload)
  )
  const unsignedToken = `${header}.${payload}`
  return `${unsignedToken}.${signTokenPart(unsignedToken)}`
}

export function verifyArtistToken(token: string): ArtistSession | null {
  const parts = token.split(".")
  if (parts.length !== 3) return null

  const [header, payload, signature] = parts
  if (!header || !payload || !signature) return null

  const expected = signTokenPart(`${header}.${payload}`)
  const signatureBuffer = Buffer.from(signature)
  const expectedBuffer = Buffer.from(expected)

  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return null
  }

  try {
    const decoded = JSON.parse(base64UrlDecode(payload).toString("utf8")) as Partial<JwtPayload>
    const id = Number(decoded.id)
    const exp = Number(decoded.exp)

    if (!Number.isInteger(id)) return null
    if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return null

    return {
      id,
      phone: decoded.phone,
      artist_name: decoded.artist_name,
      studio_name: decoded.studio_name,
    }
  } catch {
    return null
  }
}

function getBearerToken(request: NextRequest): string | null {
  const authorization = request.headers.get("authorization")
  if (!authorization) return null

  const [scheme, token] = authorization.split(" ")
  if (scheme?.toLowerCase() !== "bearer" || !token) return null
  return token
}

export function getArtistSession(request: NextRequest): ArtistSession | null {
  const value = getBearerToken(request) ?? request.cookies.get("artist_session")?.value
  if (!value) return null

  return verifyArtistToken(value)
}

export { SESSION_MAX_AGE_SECONDS }
