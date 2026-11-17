// Cookie names and lifetimes. Must match lib/auth/session.ts in the Next.js app.
export const ARTIST_SESSION_COOKIE = "artist_session"
export const ADMIN_SESSION_COOKIE = "admin_session"
export const ARTIST_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 365
export const ADMIN_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7

export const JSON_BODY_LIMIT = "1mb"

// Routes whose JSON body can legitimately be larger (base64 images). Next.js route
// handlers had no 1 MB cap, so these keep working.
export const LARGE_JSON_BODY_LIMIT = "10mb"
export const LARGE_JSON_ROUTES = Object.freeze(["/api/auth/register-profile"])

export const MUTATING_METHODS = Object.freeze(["POST", "PUT", "PATCH", "DELETE"])

// Paths (under /api) that skip the read-only subscription gate. Same list as proxy.ts.
export const READ_ONLY_EXEMPT_PREFIXES = Object.freeze([
  "/api/auth/",
  "/api/webhooks/",
  "/api/billing",
  "/api/platform-subscriptions/",
  "/api/portfolio/purchase-storage/",
  "/api/admin/",
  "/api/notifications/",
  "/api/support",
])

export const READ_ONLY_ERROR_MESSAGE =
  "Your account is in read-only mode. Please upgrade your subscription to make changes."

export const RATE_LIMITS = Object.freeze({
  // Login, signup, OTP, admin login.
  auth: { windowMs: 15 * 60 * 1000, limit: 20 },
  // Unauthenticated public endpoints (shared links, public inquiry form).
  public: { windowMs: 60 * 1000, limit: 60 },
  // Everything else, per IP.
  api: { windowMs: 60 * 1000, limit: 300 },
})

// How long to wait for in-flight requests and background tasks on SIGTERM.
export const SHUTDOWN_TIMEOUT_MS = 10_000
