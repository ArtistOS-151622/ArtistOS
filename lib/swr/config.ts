import type { SWRConfiguration } from "swr"

const FALLBACK_ERROR_MESSAGE = "Something went wrong. Please try again."
const FOCUS_THROTTLE_MS = 60_000
const DEDUPING_INTERVAL_MS = 10_000
const MAX_ERROR_RETRIES = 3

/** Thrown for any non-2xx response, so SWR treats it as an error instead of caching it as data. */
export class FetchError extends Error {
  status: number
  info: unknown

  constructor(message: string, status: number, info: unknown) {
    super(message)
    this.name = "FetchError"
    this.status = status
    this.info = info
  }
}

function errorMessageFrom(body: unknown): string {
  if (body && typeof body === "object") {
    const { error, message } = body as { error?: unknown; message?: unknown }
    if (typeof error === "string" && error) return error
    if (typeof message === "string" && message) return message
  }
  return FALLBACK_ERROR_MESSAGE
}

export async function jsonFetcher<T = unknown>(url: string): Promise<T> {
  const res = await fetch(url)
  const body: unknown = await res.json().catch(() => null)
  if (!res.ok) throw new FetchError(errorMessageFrom(body), res.status, body)
  return body as T
}

/**
 * App-wide SWR defaults for the dashboard.
 * - Focus revalidation is off: switching back to the tab/app no longer refetches
 *   every key on screen. Hooks that need it (subscription status) opt in, and
 *   are throttled to once a minute.
 * - 4xx responses (unauthorized, not found, validation) are not retried.
 */
export const swrConfig: SWRConfiguration = {
  fetcher: jsonFetcher,
  revalidateOnFocus: false,
  focusThrottleInterval: FOCUS_THROTTLE_MS,
  dedupingInterval: DEDUPING_INTERVAL_MS,
  errorRetryCount: MAX_ERROR_RETRIES,
  shouldRetryOnError: (err) => !(err instanceof FetchError && err.status < 500),
}
