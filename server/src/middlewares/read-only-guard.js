import {
  MUTATING_METHODS,
  READ_ONLY_ERROR_MESSAGE,
  READ_ONLY_EXEMPT_PREFIXES,
} from "#src/config/constants.js"
import { getArtistSession } from "#src/middlewares/require-artist.js"
import { ApiError } from "#src/utils/api-error.js"
import { logger } from "#src/utils/logger.js"

/**
 * Port of the read-only subscription gate from proxy.ts: an artist whose
 * subscription has lapsed can read but not write.
 *
 * Like proxy.ts it runs for EVERY mutating /api request that carries a valid
 * artist session (not only routes that require one), so it is mounted once,
 * globally. `isReadOnly(artistId)` is injected to keep this free of module code.
 *
 * Deliberately fails open, like proxy.ts: a database blip should not stop
 * paying artists from writing.
 */
export function createReadOnlyGuard(isReadOnly) {
  return async function readOnlyGuard(req, _res, next) {
    if (!MUTATING_METHODS.includes(req.method)) return next()

    const path = req.originalUrl.split("?")[0]
    if (READ_ONLY_EXEMPT_PREFIXES.some((prefix) => path.startsWith(prefix))) return next()

    const artist = req.artist ?? getArtistSession(req)
    if (!artist) return next()

    try {
      if (await isReadOnly(artist.id)) {
        return next(new ApiError(403, READ_ONLY_ERROR_MESSAGE, { code: "READ_ONLY" }))
      }
    } catch (err) {
      ;(req.log ?? logger).warn({ err }, "read-only check failed; allowing request")
    }
    next()
  }
}
