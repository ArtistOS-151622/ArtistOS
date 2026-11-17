import { notFound as notFoundError } from "#src/utils/api-error.js"

export function notFound(req, _res, next) {
  next(notFoundError(`Route not found: ${req.method} ${req.originalUrl.split("?")[0]}`))
}
