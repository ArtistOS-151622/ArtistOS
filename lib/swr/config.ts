import type { SWRConfiguration } from "swr"

import { ApiError, api } from "@/lib/api"

const FOCUS_THROTTLE_MS = 60_000
const DEDUPING_INTERVAL_MS = 10_000
const MAX_ERROR_RETRIES = 3

/**
 * SWR keys stay the "/api/..." path strings; requests go through the shared axios
 * client (base URL, cookies, 401 → login). Failures reject with ApiError, so SWR
 * treats them as errors instead of caching them as data.
 */
export async function jsonFetcher<T = unknown>(url: string): Promise<T> {
  const { data } = await api.get<T>(url)
  return data
}

/**
 * App-wide SWR defaults for the dashboard.
 * - Focus revalidation is off: switching back to the tab/app no longer refetches
 *   every key on screen. Hooks that need it (subscription status) opt in, and
 *   are throttled to once a minute.
 * - 4xx responses (unauthorized, not found, validation) are not retried; network
 *   errors (status 0) and 5xx are.
 */
export const swrConfig: SWRConfiguration = {
  fetcher: jsonFetcher,
  revalidateOnFocus: false,
  focusThrottleInterval: FOCUS_THROTTLE_MS,
  dedupingInterval: DEDUPING_INTERVAL_MS,
  errorRetryCount: MAX_ERROR_RETRIES,
  shouldRetryOnError: (err) => !(err instanceof ApiError && err.status >= 400 && err.status < 500),
}
