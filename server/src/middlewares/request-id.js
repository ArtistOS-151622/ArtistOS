import { randomUUID } from "node:crypto"

const REQUEST_ID_HEADER = "x-request-id"
const VALID_REQUEST_ID = /^[\w-]{8,128}$/

/** Reuses a sane incoming X-Request-Id (e.g. from Render's proxy) or creates one. */
export function requestId(req, res, next) {
  const incoming = req.headers[REQUEST_ID_HEADER]
  req.id = typeof incoming === "string" && VALID_REQUEST_ID.test(incoming) ? incoming : randomUUID()
  res.setHeader("X-Request-Id", req.id)
  next()
}
