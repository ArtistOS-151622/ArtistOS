import { NextResponse } from "next/server"
import { createHash, timingSafeEqual } from "crypto"

import { hasValidAdminCookie } from "@/lib/auth/session"

const LOGIN_MAX_FAILURES = 5
const LOGIN_WINDOW_MS = 15 * 60 * 1000

/** Any `admin_session` value that verifies (the browser can briefly hold two, see getAllCookieValues). */
export function isAdminRequest(request: Request): boolean {
  return hasValidAdminCookie(request.headers.get("cookie"))
}

/**
 * Guard for every admin API handler except login.
 * Returns a 401 response to return immediately, or null when the caller is the admin.
 */
export function requireAdmin(request: Request): NextResponse | null {
  if (isAdminRequest(request)) return null
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
}

/** Constant-time password check; hashing first makes both sides the same length. */
export function isAdminPasswordValid(submitted: string, expected: string): boolean {
  const a = createHash("sha256").update(submitted).digest()
  const b = createHash("sha256").update(expected).digest()
  return timingSafeEqual(a, b)
}

// Best-effort, per-instance limiter: serverless instances don't share memory.
const failedLogins = new Map<string, { count: number; resetAt: number }>()

export function getClientIp(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
}

export function isLoginRateLimited(ip: string): boolean {
  const entry = failedLogins.get(ip)
  if (!entry) return false
  if (entry.resetAt <= Date.now()) {
    failedLogins.delete(ip)
    return false
  }
  return entry.count >= LOGIN_MAX_FAILURES
}

export function recordFailedLogin(ip: string): void {
  const now = Date.now()
  const entry = failedLogins.get(ip)
  if (!entry || entry.resetAt <= now) {
    failedLogins.set(ip, { count: 1, resetAt: now + LOGIN_WINDOW_MS })
    return
  }
  entry.count += 1
}

export function clearFailedLogins(ip: string): void {
  failedLogins.delete(ip)
}
