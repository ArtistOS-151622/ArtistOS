/**
 * An error with an HTTP status. Services throw these; the error handler turns
 * them into `{ error: message }` responses. Anything else becomes a 500.
 */
export class ApiError extends Error {
  constructor(status, message, { code, cause } = {}) {
    super(message, { cause })
    this.name = "ApiError"
    this.status = status
    this.code = code
  }
}

export const badRequest = (message = "Bad request", options) => new ApiError(400, message, options)
export const unauthorized = (message = "Unauthorized", options) => new ApiError(401, message, options)
export const forbidden = (message = "Forbidden", options) => new ApiError(403, message, options)
export const notFound = (message = "Not found", options) => new ApiError(404, message, options)
export const conflict = (message = "Conflict", options) => new ApiError(409, message, options)
export const tooManyRequests = (message = "Too many requests", options) => new ApiError(429, message, options)
export const serviceUnavailable = (message = "Service unavailable", options) =>
  new ApiError(503, message, options)
