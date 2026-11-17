import { createHash, timingSafeEqual } from "node:crypto"

import { config } from "#src/config/env.js"
import { ApiError, badRequest, tooManyRequests, unauthorized } from "#src/utils/api-error.js"
import { createAdminToken } from "#src/utils/session-token.js"

const LOGIN_MAX_FAILURES = 5
const LOGIN_WINDOW_MS = 15 * 60 * 1000

// ip → { count, resetAt }. One long-lived process on Render, so this is shared by all requests.
const failedLogins = new Map()

function isRateLimited(ip) {
  const entry = failedLogins.get(ip)
  if (!entry) return false
  if (entry.resetAt <= Date.now()) {
    failedLogins.delete(ip)
    return false
  }
  return entry.count >= LOGIN_MAX_FAILURES
}

function recordFailure(ip) {
  const now = Date.now()
  const entry = failedLogins.get(ip)
  if (!entry || entry.resetAt <= now) failedLogins.set(ip, { count: 1, resetAt: now + LOGIN_WINDOW_MS })
  else entry.count += 1
}

/** Constant-time compare; hashing first makes both sides the same length. */
function isPasswordValid(submitted, expected) {
  return timingSafeEqual(createHash("sha256").update(submitted).digest(), createHash("sha256").update(expected).digest())
}

/**
 * Admin password login. No fallback password (500 when ADMIN_PASSWORD is unset);
 * 5 failed attempts per IP per 15 minutes, then 429. → signed admin token
 */
export function login(ip, password) {
  if (!config.adminPassword) throw new ApiError(500, "Admin login is not configured")
  if (isRateLimited(ip)) throw tooManyRequests("Too many failed attempts. Please try again later.")
  if (typeof password !== "string" || !password) throw badRequest("Password is required")

  if (!isPasswordValid(password, config.adminPassword)) {
    recordFailure(ip)
    throw unauthorized("Invalid password")
  }

  failedLogins.delete(ip)
  return createAdminToken()
}
