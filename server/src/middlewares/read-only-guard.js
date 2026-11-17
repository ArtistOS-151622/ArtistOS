import {
  MUTATING_METHODS,
  READ_ONLY_ERROR_MESSAGE,
  READ_ONLY_EXEMPT_PREFIXES,
} from "#src/config/constants.js"
import { ApiError } from "#src/utils/api-error.js"
import { logger } from "#src/utils/logger.js"

/**
 * Port of the read-only subscription gate from proxy.ts: an artist whose
 * subscription has lapsed can read but not write.
 *
 * `isReadOnly(artistId)` is injected (the subscriptions module provides it), so
 * this middleware has no dependency on module code. Mount it after requireArtist.
 *
 * Deliberately fails open, like proxy.ts: a database blip should not stop
 * paying artists from writing.
 */
export function createReadOnlyGuard(isReadOnly) {
  return async function readOnlyGuard(req, _res, next) {
    if (!MUTATING_METHODS.includes(req.method) || !req.artist) return next()

    const path = req.originalUrl.split("?")[0]
    if (READ_ONLY_EXEMPT_PREFIXES.some((prefix) => path.startsWith(prefix))) return next()

    try {
      if (await isReadOnly(req.artist.id)) {
        return next(new ApiError(403, READ_ONLY_ERROR_MESSAGE, { code: "READ_ONLY" }))
      }
    } catch (err) {
      ;(req.log ?? logger).warn({ err }, "read-only check failed; allowing request")
    }
    next()
  }
}
