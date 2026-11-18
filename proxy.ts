import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { createClient } from "@supabase/supabase-js"

import {
  ADMIN_SESSION_COOKIE,
  ARTIST_SESSION_COOKIE,
  getAllCookieValues,
  getArtistSession,
  getArtistSessionFromCookies,
  hasValidAdminCookie,
} from "@/lib/auth/session"
import { checkIsReadOnly } from "@/lib/auth/subscription"

// List of protected routes that require a session
const protectedPrefixes = [
  "/dashboard",
  "/services",
  "/courses",
  "/customers",
  "/bookings",
  "/inquiries",
  "/calendar",
  "/portfolio",
  "/profile",
  "/billing",
]

const EXPIRED_COOKIE_ATTRIBUTES = "Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT"

/**
 * Expires a session cookie that no longer verifies, so a redirect to a login page
 * can't bounce straight back (the axios client sends API 401s to /login, and a
 * cookie this guard still accepted would send /login back to /dashboard: a loop).
 *
 * Raw headers, not response.cookies: that API keys cookies by name, but both the
 * host-only cookie and the shared-domain one (COOKIE_DOMAIN, set once the API runs
 * on its own subdomain) must be expired.
 */
function clearSessionCookie(response: NextResponse, name: string) {
  response.headers.append("Set-Cookie", `${name}=; ${EXPIRED_COOKIE_ATTRIBUTES}`)
  const domain = process.env.COOKIE_DOMAIN
  if (domain) response.headers.append("Set-Cookie", `${name}=; Domain=${domain}; ${EXPIRED_COOKIE_ATTRIBUTES}`)
}

/** Returns `response`, first expiring `name` when the request carried one that didn't verify. */
function withStaleCookieCleared(response: NextResponse, name: string, cookieHeader: string | null, valid: boolean) {
  if (!valid && getAllCookieValues(cookieHeader, name).length > 0) clearSessionCookie(response, name)
  return response
}

function redirectToLogin(request: NextRequest) {
  const url = request.nextUrl.clone()
  url.pathname = "/login"
  url.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`)
  return NextResponse.redirect(url)
}

// In-memory cache for maintenance mode to eliminate remote HTTPS query tax on every page request
let maintenanceModeCache: { isMaintenance: boolean; expiresAt: number } | null = null
const MAINTENANCE_CACHE_TTL_MS = 30 * 1000 // 30 seconds

export function invalidateMaintenanceModeCache() {
  maintenanceModeCache = null
}

async function isMaintenanceModeActive(supabaseUrl: string, supabaseAnonKey: string): Promise<boolean> {
  const now = Date.now()
  if (maintenanceModeCache && maintenanceModeCache.expiresAt > now) {
    return maintenanceModeCache.isMaintenance
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } })
    const { data } = await supabase.from('platform_settings').select('value').eq('key', 'maintenance_mode').maybeSingle()
    const isMaintenance = data?.value === 'true'
    maintenanceModeCache = { isMaintenance, expiresAt: now + MAINTENANCE_CACHE_TTL_MS }
    return isMaintenance
  } catch (e) {
    console.error("Proxy Maintenance Check Error:", e)
    return maintenanceModeCache?.isMaintenance ?? false
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const cookieHeader = request.headers.get("cookie")

  // Maintenance Mode Check (Global - cached for 30s)
  if (
    !pathname.startsWith('/admin') &&
    !pathname.startsWith('/api') &&
    pathname !== '/maintenance' &&
    !pathname.includes('.')
  ) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (supabaseUrl && supabaseAnonKey) {
      const inMaintenance = await isMaintenanceModeActive(supabaseUrl, supabaseAnonKey)
      if (inMaintenance) {
        return NextResponse.redirect(new URL('/maintenance', request.url))
      }
    }
  }

  // Admin API backstop: every handler also calls requireAdmin(), this catches any that forget.
  if (pathname.startsWith("/api/admin/") && pathname !== "/api/admin/login") {
    if (!hasValidAdminCookie(cookieHeader)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  }

  // Admin pages: every admin_session value is verified (signature + expiry), not just read.
  if (pathname.startsWith("/admin")) {
    const isAdmin = hasValidAdminCookie(cookieHeader)

    if (pathname === "/admin/login" || isAdmin) {
      return withStaleCookieCleared(NextResponse.next(), ADMIN_SESSION_COOKIE, cookieHeader, isAdmin)
    }

    const url = request.nextUrl.clone()
    url.pathname = "/admin/login"
    return withStaleCookieCleared(NextResponse.redirect(url), ADMIN_SESSION_COOKIE, cookieHeader, false)
  }

  // Artist pages: verify every artist_session value (signature + expiry). Checking
  // only `exp` let a token the API rejects through, which loops /dashboard ⇄ /login.
  const isArtistPage =
    protectedPrefixes.some((prefix) => pathname.startsWith(prefix)) && !pathname.startsWith("/portfolio/shared")
  const isAuthPage = pathname === "/" || pathname.startsWith("/login") || pathname.startsWith("/signup")

  if (isArtistPage || isAuthPage) {
    const artist = getArtistSessionFromCookies(cookieHeader)

    if (isArtistPage && !artist) {
      return withStaleCookieCleared(redirectToLogin(request), ARTIST_SESSION_COOKIE, cookieHeader, false)
    }

    // Already logged in: skip the login/signup/landing pages.
    if (isAuthPage && artist) {
      const url = request.nextUrl.clone()
      url.pathname = "/dashboard"
      return NextResponse.redirect(url)
    }

    return withStaleCookieCleared(NextResponse.next(), ARTIST_SESSION_COOKIE, cookieHeader, Boolean(artist))
  }

  // Mutating API Check for Read-Only Mode
  if (pathname.startsWith("/api/") && ["POST", "PUT", "PATCH", "DELETE"].includes(request.method)) {
    const exemptApiRoutes = [
      "/api/auth/",
      "/api/webhooks/",
      "/api/billing",
      "/api/platform-subscriptions/",
      "/api/portfolio/purchase-storage/",
      "/api/admin/",
      "/api/notifications/",
      "/api/support"
    ]
    
    const isExempt = exemptApiRoutes.some(r => pathname.startsWith(r))

    // Proxy runs on the Node.js runtime in Next 16, so this can reuse the real
    // session reader: it accepts a Bearer header as well as the cookie, and
    // verifies the token signature. Reading the cookie by hand let any
    // header-only client skip the gate entirely just by not sending one.
    const artist = isExempt ? null : getArtistSession(request)

    if (artist) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

      if (supabaseUrl && supabaseKey) {
        const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } })
        try {
          const isReadOnly = await checkIsReadOnly(supabase, artist.id)
          if (isReadOnly) {
            return NextResponse.json(
              { error: "Your account is in read-only mode. Please upgrade your subscription to make changes." },
              { status: 403 }
            )
          }
          const requestHeaders = new Headers(request.headers)
          requestHeaders.set("x-is-read-only", "false")
          return NextResponse.next({
            request: {
              headers: requestHeaders,
            },
          })
        } catch (e) {
          // Deliberately fails open. A Supabase blip should not stop paying
          // artists from writing; the cost is that an expired subscription can
          // slip a write through during an outage.
          console.error("Proxy Subscription Check Error:", e)
        }
      }
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     * - manifest.webmanifest, icon.png, apple-icon.png (PWA files)
     */
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|icon.png|apple-icon.png).*)"
  ],
}
