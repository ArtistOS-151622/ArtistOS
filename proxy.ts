import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { createClient } from "@supabase/supabase-js"

import { getArtistSession } from "@/lib/auth/session"
import { checkIsReadOnly } from "@/lib/auth/subscription"

// List of protected routes that require a session
const protectedPrefixes = [
  "/dashboard",
  "/services",
  "/customers",
  "/bookings",
  "/inquiries",
  "/calendar",
  "/portfolio",
  "/profile",
  "/billing",
]

function getJwtExpiry(token: string): number | null {
  const payload = token.split(".")[1]
  if (!payload) return null

  try {
    const padded = payload.padEnd(payload.length + ((4 - (payload.length % 4)) % 4), "=")
    const decoded = JSON.parse(atob(padded.replace(/-/g, "+").replace(/_/g, "/"))) as {
      exp?: unknown
    }
    const exp = Number(decoded.exp)
    return Number.isFinite(exp) ? exp : null
  } catch {
    return null
  }
}

function isExpiredSession(token: string): boolean {
  const exp = getJwtExpiry(token)
  return !exp || exp < Math.floor(Date.now() / 1000)
}

function redirectToLogin(request: NextRequest) {
  const url = request.nextUrl.clone()
  url.pathname = "/login"
  url.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`)
  return NextResponse.redirect(url)
}

export async function proxy(request: NextRequest) {
  const session = request.cookies.get("artist_session")
  const { pathname } = request.nextUrl

  // Maintenance Mode Check (Global)
  if (
    !pathname.startsWith('/admin') &&
    !pathname.startsWith('/api') &&
    pathname !== '/maintenance' &&
    !pathname.includes('.')
  ) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (supabaseUrl && supabaseAnonKey) {
      const supabase = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } })
      try {
        const { data } = await supabase.from('platform_settings').select('value').eq('key', 'maintenance_mode').maybeSingle()
        if (data?.value === 'true') {
          return NextResponse.redirect(new URL('/maintenance', request.url))
        }
      } catch (e) {
        console.error("Proxy Maintenance Check Error:", e)
      }
    }
  }

  // Admin routes check
  if (pathname.startsWith('/admin')) {
    if (pathname === '/admin/login') {
      // Allow access to admin login page
      return NextResponse.next()
    }
    
    const adminSession = request.cookies.get('admin_session')?.value
    
    if (!adminSession || adminSession !== 'authenticated') {
      const url = request.nextUrl.clone()
      url.pathname = '/admin/login'
      return NextResponse.redirect(url)
    }
    // Allow access to other admin pages if authenticated
    return NextResponse.next()
  }

  // Protected routes check
  const isProtected = protectedPrefixes.some(prefix => pathname.startsWith(prefix))
  
  if (isProtected && !pathname.startsWith("/portfolio/shared")) {
    if (!session?.value || isExpiredSession(session.value)) return redirectToLogin(request)
  }

  // Auth pages and Root check (if already logged in, redirect to dashboard)
  if (pathname === "/" || pathname.startsWith("/login") || pathname.startsWith("/signup")) {
    if (session?.value && !isExpiredSession(session.value)) {
      const url = request.nextUrl.clone()
      url.pathname = "/dashboard"
      return NextResponse.redirect(url)
    }
  }

  // Mutating API Check for Read-Only Mode
  if (pathname.startsWith("/api/") && ["POST", "PUT", "PATCH", "DELETE"].includes(request.method)) {
    const exemptApiRoutes = [
      "/api/auth/",
      "/api/webhooks/",
      "/api/platform-subscriptions/",
      "/api/portfolio/purchase-storage/",
      "/api/admin/",
      "/api/notifications/"
    ]
    
    const isExempt = exemptApiRoutes.some(r => pathname.startsWith(r))

    // Proxy runs on the Node.js runtime in Next 16, so this can reuse the real
    // session reader: it accepts a Bearer header as well as the cookie, and
    // verifies the token signature. Reading the cookie by hand let any
    // header-only client skip the gate entirely just by not sending one.
    const artist = isExempt ? null : getArtistSession(request)

    if (artist) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

      if (supabaseUrl && supabaseAnonKey) {
        const supabase = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } })
        try {
          const isReadOnly = await checkIsReadOnly(supabase, artist.id)
          if (isReadOnly) {
            return NextResponse.json(
              { error: "Your subscription has expired. You are in read-only mode." },
              { status: 403 }
            )
          }
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
