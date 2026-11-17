import { createHash, timingSafeEqual } from "node:crypto"

import { config } from "#src/config/env.js"
import { serviceUnavailable, unauthorized } from "#src/utils/api-error.js"

const digest = (value) => createHash("sha256").update(value).digest()

/**
 * Requires `Authorization: Bearer <CRON_SECRET>`.
 * Fails closed: if CRON_SECRET is not configured, every cron call is refused
 * (the old Next.js routes allowed everything when it was unset).
 */
export function requireCron(req, _res, next) {
  if (!config.cronSecret) return next(serviceUnavailable("Cron is not configured"))

  const [scheme, token] = (req.headers.authorization ?? "").split(" ")
  const valid =
    scheme?.toLowerCase() === "bearer" &&
    Boolean(token) &&
    timingSafeEqual(digest(token), digest(config.cronSecret))

  return valid ? next() : next(unauthorized())
}
