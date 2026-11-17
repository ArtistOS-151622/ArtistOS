import { ZodError } from "zod"

import { ApiError } from "#src/utils/api-error.js"
import { logger } from "#src/utils/logger.js"

const INTERNAL_ERROR_MESSAGE = "Internal server error"

function toResponse(err) {
  if (err instanceof ApiError) return { status: err.status, error: err.message, code: err.code, extra: err.extra }

  // Schemas carry user-facing messages (shown as-is by the frontend), so no field prefix.
  if (err instanceof ZodError) return { status: 400, error: err.issues[0]?.message ?? "Invalid request" }

  // body-parser errors carry a `type` and a 4xx `status`.
  if (err?.type === "entity.parse.failed") return { status: 400, error: "Invalid JSON body" }
  if (err?.type === "entity.too.large") return { status: 413, error: "Request body too large" }

  return { status: 500, error: INTERNAL_ERROR_MESSAGE }
}

/** Last middleware: every failure becomes `{ error }` with the right status. */
// Express identifies error handlers by their 4 arguments, so `_next` must stay.
export function errorHandler(err, req, res, _next) {
  const { status, error, code, extra } = toResponse(err)
  const log = req.log ?? logger

  if (status >= 500) log.error({ err }, "request failed")
  else log.debug({ err: { message: err?.message, status } }, "request rejected")

  if (res.headersSent) {
    res.destroy()
    return
  }
  if (err?.envelope || res.locals.errorEnvelope) {
    res.status(status).json({ status: false, message: error, data: null })
    return
  }
  res.status(status).json({ error, ...(code ? { code } : {}), ...extra })
}
