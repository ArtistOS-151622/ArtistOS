import { ZodError } from "zod"

import { ApiError } from "#src/utils/api-error.js"
import { logger } from "#src/utils/logger.js"

const INTERNAL_ERROR_MESSAGE = "Internal server error"

function toResponse(err) {
  if (err instanceof ApiError) return { status: err.status, error: err.message, code: err.code }

  if (err instanceof ZodError) {
    const issue = err.issues[0]
    const field = issue?.path.join(".")
    return { status: 400, error: field ? `${field}: ${issue.message}` : (issue?.message ?? "Invalid request") }
  }

  // body-parser errors carry a `type` and a 4xx `status`.
  if (err?.type === "entity.parse.failed") return { status: 400, error: "Invalid JSON body" }
  if (err?.type === "entity.too.large") return { status: 413, error: "Request body too large" }

  return { status: 500, error: INTERNAL_ERROR_MESSAGE }
}

/** Last middleware: every failure becomes `{ error }` with the right status. */
// Express identifies error handlers by their 4 arguments, so `_next` must stay.
export function errorHandler(err, req, res, _next) {
  const { status, error, code } = toResponse(err)
  const log = req.log ?? logger

  if (status >= 500) log.error({ err }, "request failed")
  else log.debug({ err: { message: err?.message, status } }, "request rejected")

  if (res.headersSent) {
    res.destroy()
    return
  }
  res.status(status).json(code ? { error, code } : { error })
}
