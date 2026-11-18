import axios from "axios"

export const FALLBACK_ERROR_MESSAGE = "Something went wrong. Please try again."
export const NETWORK_ERROR_MESSAGE = "Can't reach the server. Check your connection and try again."
export const TIMEOUT_ERROR_MESSAGE = "The request took too long. Please try again."

/**
 * The one error shape for every failed API call (non-2xx, network, timeout).
 * `status` is 0 when no response arrived. `code` is the API's machine-readable
 * code when it sends one (e.g. "READ_ONLY"). `info` is the raw response body.
 */
export class ApiError extends Error {
  status: number
  code?: string
  info: unknown

  constructor(message: string, status: number, info: unknown = null, code?: string) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.info = info
    this.code = code
  }
}

export function isApiError(err: unknown): err is ApiError {
  return err instanceof ApiError
}

/** `{ error }` or `{ message }` from an API body (both shapes exist), else null. */
export function errorMessageFrom(body: unknown): string | null {
  if (body && typeof body === "object") {
    const { error, message } = body as { error?: unknown; message?: unknown }
    if (typeof error === "string" && error) return error
    if (typeof message === "string" && message) return message
  }
  return null
}

function codeFrom(body: unknown): string | undefined {
  if (body && typeof body === "object") {
    const { code } = body as { code?: unknown }
    if (typeof code === "string" && code) return code
  }
  return undefined
}

/** Normalises anything axios throws (or anything else) into an ApiError. Cancellations are not passed here. */
export function toApiError(err: unknown): ApiError {
  if (err instanceof ApiError) return err

  if (axios.isAxiosError(err)) {
    if (err.response) {
      const body = err.response.data
      return new ApiError(
        errorMessageFrom(body) ?? FALLBACK_ERROR_MESSAGE,
        err.response.status,
        body,
        codeFrom(body)
      )
    }
    if (err.code === "ECONNABORTED" || err.code === "ETIMEDOUT") return new ApiError(TIMEOUT_ERROR_MESSAGE, 0)
    return new ApiError(NETWORK_ERROR_MESSAGE, 0)
  }

  return new ApiError(err instanceof Error && err.message ? err.message : FALLBACK_ERROR_MESSAGE, 0)
}

/**
 * Message to show for a failed call: the API's own error text when it sent one,
 * the network/timeout message when nothing arrived, else the caller's `fallback`.
 */
export function getErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) {
    if (err.status === 0) return err.message
    return errorMessageFrom(err.info) ?? fallback
  }
  return fallback
}
