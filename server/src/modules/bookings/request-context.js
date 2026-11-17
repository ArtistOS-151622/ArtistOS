import { randomUUID } from "node:crypto"

const REQUEST_ID_HEADER = "x-booking-request-id"
const VALID_REQUEST_ID = /^[a-zA-Z0-9_-]{1,80}$/

/**
 * Booking create/update correlation id: reuses a valid client-supplied
 * x-booking-request-id, echoes it as a response header, and adds `requestId`
 * to every error body (including 401s), as the Next.js routes did.
 * Mount before requireArtist.
 */
export function bookingRequestContext(req, res, next) {
  const supplied = req.get(REQUEST_ID_HEADER)?.trim()
  const requestId = supplied && VALID_REQUEST_ID.test(supplied) ? supplied : randomUUID()

  req.bookingRequestId = requestId
  res.setHeader(REQUEST_ID_HEADER, requestId)
  res.locals.errorExtra = { ...res.locals.errorExtra, requestId }
  next()
}
