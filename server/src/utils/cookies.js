import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_MAX_AGE_SECONDS,
  ARTIST_SESSION_COOKIE,
  ARTIST_SESSION_MAX_AGE_SECONDS,
} from "#src/config/constants.js"
import { config } from "#src/config/env.js"

/**
 * Every value sent for `name` in a raw Cookie header, in order.
 * cookie-parser keeps only one value per name, but a browser can hold two
 * cookies with the same name (e.g. different Domain), so auth checks must try each.
 */
export function getAllCookieValues(cookieHeader, name) {
  if (!cookieHeader) return []
  const values = []
  for (const part of cookieHeader.split(";")) {
    const separator = part.indexOf("=")
    if (separator === -1 || part.slice(0, separator).trim() !== name) continue
    let value = part.slice(separator + 1).trim()
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1)
    try {
      values.push(decodeURIComponent(value))
    } catch {
      values.push(value)
    }
  }
  return values
}

function baseOptions(sameSite) {
  return {
    httpOnly: true,
    secure: config.isProduction,
    sameSite,
    path: "/",
    // Shared parent domain (".artistos.in") so the Next.js proxy can read it too.
    ...(config.cookieDomain ? { domain: config.cookieDomain } : {}),
  }
}

const ARTIST_COOKIE = { name: ARTIST_SESSION_COOKIE, maxAgeSeconds: ARTIST_SESSION_MAX_AGE_SECONDS, sameSite: "lax" }
const ADMIN_COOKIE = { name: ADMIN_SESSION_COOKIE, maxAgeSeconds: ADMIN_SESSION_MAX_AGE_SECONDS, sameSite: "strict" }

function setCookie(res, { name, maxAgeSeconds, sameSite }, value) {
  // Express takes maxAge in milliseconds.
  res.cookie(name, value, { ...baseOptions(sameSite), maxAge: maxAgeSeconds * 1000 })
}

function clearCookie(res, { name, sameSite }) {
  res.clearCookie(name, baseOptions(sameSite))
}

export const setSessionCookie = (res, token) => setCookie(res, ARTIST_COOKIE, token)
export const clearSessionCookie = (res) => clearCookie(res, ARTIST_COOKIE)
export const setAdminCookie = (res, token) => setCookie(res, ADMIN_COOKIE, token)
export const clearAdminCookie = (res) => clearCookie(res, ADMIN_COOKIE)
