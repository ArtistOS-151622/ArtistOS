import { rateLimit } from "express-rate-limit"

import { RATE_LIMITS } from "#src/config/constants.js"

function createLimiter({ windowMs, limit }, message) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { error: message },
  })
}

/** Login, signup, OTP, admin login. */
export const authLimiter = createLimiter(RATE_LIMITS.auth, "Too many attempts. Please try again later.")
/** Unauthenticated public endpoints. */
export const publicLimiter = createLimiter(RATE_LIMITS.public, "Too many requests. Please slow down.")
/** Default for the whole API. */
export const apiLimiter = createLimiter(RATE_LIMITS.api, "Too many requests. Please slow down.")
