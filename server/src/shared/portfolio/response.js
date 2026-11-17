import { ApiError } from "#src/utils/api-error.js"

/*
 * Portfolio-style endpoints (portfolio, storage, course/booking portfolio tabs,
 * subscriptions) answer with an envelope instead of { error }:
 *   success → { status: true,  message, data }
 *   failure → { status: false, message, data: null }
 * The frontend reads `status`/`message`, so these routes keep that shape.
 */

export function sendPortfolio(res, message, data, status = 200) {
  res.status(status).json({ status: true, message, data })
}

/** Throw from envelope routes; rendered as { status: false, message, data: null }. Default 403, like the original. */
export function portfolioError(message, status = 403) {
  return new ApiError(status, message, { envelope: true })
}

/** Router middleware: every error on this router (incl. 401s from requireArtist) uses the envelope. */
export function useEnvelopeErrors(_req, res, next) {
  res.locals.errorEnvelope = true
  next()
}
