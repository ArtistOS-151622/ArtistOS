import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios"
import { mutate } from "swr"

import { toApiError } from "@/lib/api/errors"

declare module "axios" {
  interface AxiosRequestConfig {
    /** Don't redirect to the login page on a 401 (login/OTP forms show the error instead). */
    skipAuthRedirect?: boolean
  }
}

/** Default timeout for API calls; uploads and downloads override it per request. */
export const API_TIMEOUT_MS = 20_000

/**
 * Empty → same-origin (the Next.js routes). Set to the API origin
 * (https://api.artistos.in) to use the Express server. Inlined at build time,
 * so changing it needs a redeploy.
 */
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? ""

/** "/api/x" → API_BASE_URL + "/api/x", for plain links (`<a href>`, `window.open`) that bypass axios. */
export function apiUrl(path: string): string {
  return `${API_BASE_URL}${path}`
}

const SUBSCRIPTION_STATUS_KEY = "/api/subscription-status"
const READ_ONLY_CODE = "READ_ONLY"
// proxy.ts sends this 403 without a code; the Express API adds code: "READ_ONLY".
const READ_ONLY_MESSAGE = "Your account is in read-only mode. Please upgrade your subscription to make changes."

// 401s from these are answers, not "your session ended" (wrong OTP, public links…).
const AUTH_REDIRECT_EXEMPT_PREFIXES = ["/api/auth/", "/api/public/", "/api/admin/login"]

/** The shared API client: cookies included, one error type (ApiError), automatic 401 → login. */
export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: API_TIMEOUT_MS,
  headers: { Accept: "application/json" },
})

/**
 * For uploads to R2 presigned URLs only: no base URL, no cookies (a credentialed
 * request fails R2's CORS check), no auth redirect, no timeout.
 */
export const uploadClient = axios.create({ withCredentials: false, timeout: 0 })

/** Path of a request URL, whether relative ("/api/x") or absolute (API_BASE_URL + "/api/x"). */
function requestPath(config: InternalAxiosRequestConfig | undefined): string {
  const url = config?.url ?? ""
  try {
    return new URL(url, "http://relative.invalid").pathname
  } catch {
    return url
  }
}

// One redirect per page load: parallel 401s (every SWR key on screen) must not stack navigations.
let redirectingToLogin = false

function redirectToLogin(path: string) {
  if (redirectingToLogin || typeof window === "undefined") return

  const isAdmin = path.startsWith("/api/admin/")
  const loginPath = isAdmin ? "/admin/login" : "/login"
  if (window.location.pathname === loginPath) return

  redirectingToLogin = true
  const target = new URL(loginPath, window.location.origin)
  if (!isAdmin) target.searchParams.set("next", `${window.location.pathname}${window.location.search}`)
  window.location.assign(target.toString())
}

api.interceptors.response.use(
  (response) => response,
  (err: unknown) => {
    // Cancellations (AbortController) are re-thrown untouched; callers ignore them with isCancel().
    if (axios.isCancel(err)) return Promise.reject(err)

    const config = (err as AxiosError).config
    const error = toApiError(err)
    const path = requestPath(config)

    if (error.status === 401 && !config?.skipAuthRedirect && !AUTH_REDIRECT_EXEMPT_PREFIXES.some((p) => path.startsWith(p))) {
      redirectToLogin(path)
    }

    // Subscription lapsed mid-session: refresh the status so the read-only modal and overlay appear.
    if (error.status === 403 && (error.code === READ_ONLY_CODE || error.message === READ_ONLY_MESSAGE)) {
      void mutate(SUBSCRIPTION_STATUS_KEY)
    }

    return Promise.reject(error)
  }
)
