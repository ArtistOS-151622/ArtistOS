import { ADMIN_SESSION_COOKIE } from "#src/config/constants.js"
import { unauthorized } from "#src/utils/api-error.js"
import { getAllCookieValues } from "#src/utils/cookies.js"
import { verifyAdminToken } from "#src/utils/session-token.js"

export function isAdminRequest(req) {
  return getAllCookieValues(req.headers.cookie, ADMIN_SESSION_COOKIE).some(verifyAdminToken)
}

/** Requires a valid signed admin session; sets `req.admin = true`. */
export function requireAdmin(req, _res, next) {
  if (!isAdminRequest(req)) return next(unauthorized())
  req.admin = true
  next()
}
