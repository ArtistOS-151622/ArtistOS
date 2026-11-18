import assert from "node:assert/strict"
import { createHmac } from "node:crypto"
import { register } from "node:module"
import test from "node:test"

// proxy.ts and lib use the "@/..." alias; resolve it for this test file only.
register("./helpers/alias-hooks.mjs", import.meta.url)

process.env.JWT_SECRET = "test-secret-for-proxy-guard-tests-0123456789"
// No Supabase: the maintenance-mode check is skipped.
delete process.env.NEXT_PUBLIC_SUPABASE_URL
delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
delete process.env.COOKIE_DOMAIN

const { NextRequest } = await import("next/server")
const { proxy } = await import("../proxy.ts")
const { createAdminToken, createArtistToken, getAllCookieValues, getArtistSessionFromCookies } = await import(
  "../lib/auth/session.ts"
)

const artist = { id: 7, phone: "9999999999", artist_name: "A", studio_name: "S" }
const valid = createArtistToken(artist)

function b64url(value: string) {
  return Buffer.from(value).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_")
}

/** Well-formed token with a future `exp`, signed with the wrong secret (what a JWT_SECRET mismatch looks like). */
function foreignToken() {
  const now = Math.floor(Date.now() / 1000)
  const unsigned = `${b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }))}.${b64url(
    JSON.stringify({ ...artist, iat: now, exp: now + 3600 })
  )}`
  const sig = createHmac("sha256", "some-other-secret").update(unsigned).digest("base64url")
  return `${unsigned}.${sig}`
}

async function visit(path: string, cookie?: string) {
  const res = await proxy(new NextRequest(`http://localhost${path}`, { headers: cookie ? { cookie } : {} }))
  return {
    status: res.status,
    location: res.headers.get("location"),
    setCookie: res.headers.getSetCookie?.() ?? [],
  }
}

const expires = (name: string) => (header: string) => header.startsWith(`${name}=;`) && header.includes("Max-Age=0")

test("getAllCookieValues keeps duplicate names, in order", () => {
  assert.deepEqual(getAllCookieValues("a=1; artist_session=x; b=2; artist_session=y%3D", "artist_session"), ["x", "y="])
  assert.deepEqual(getAllCookieValues(null, "artist_session"), [])
  assert.deepEqual(getAllCookieValues("artist_sessionX=1", "artist_session"), [])
})

test("the first verifying cookie value wins, even after a stale one", () => {
  assert.deepEqual(getArtistSessionFromCookies(`artist_session=${foreignToken()}; artist_session=${valid}`), artist)
  assert.equal(getArtistSessionFromCookies(`artist_session=${foreignToken()}`), null)
})

test("a valid session reaches dashboard pages and skips /login", async () => {
  const page = await visit("/dashboard", `artist_session=${valid}`)
  assert.equal(page.status, 200)
  assert.deepEqual(page.setCookie, [])

  const login = await visit("/login", `artist_session=${valid}`)
  assert.equal(login.status, 307)
  assert.equal(new URL(login.location!).pathname, "/dashboard")
})

test("no cookie: dashboard pages redirect to /login with next, nothing is cleared", async () => {
  const res = await visit("/bookings?x=1")
  assert.equal(res.status, 307)
  const url = new URL(res.location!)
  assert.equal(url.pathname, "/login")
  assert.equal(url.searchParams.get("next"), "/bookings?x=1")
  assert.deepEqual(res.setCookie, [])
})

test("a future-exp token with a bad signature is rejected and cleared (no /login ⇄ /dashboard loop)", async () => {
  const cookie = `artist_session=${foreignToken()}`

  const page = await visit("/dashboard", cookie)
  assert.equal(page.status, 307)
  assert.equal(new URL(page.location!).pathname, "/login")
  assert.ok(page.setCookie.some(expires("artist_session")), "stale cookie expired on the redirect")

  // The step that used to loop: /login with the same cookie must stay on /login.
  const login = await visit("/login", cookie)
  assert.equal(login.status, 200)
  assert.ok(login.setCookie.some(expires("artist_session")))
})

test("a stale duplicate next to a valid cookie keeps the user logged in and is not cleared", async () => {
  const res = await visit("/dashboard", `artist_session=${foreignToken()}; artist_session=${valid}`)
  assert.equal(res.status, 200)
  assert.deepEqual(res.setCookie, [])
})

test("an admin token is not an artist session", async () => {
  const res = await visit("/dashboard", `artist_session=${createAdminToken()}`)
  assert.equal(res.status, 307)
  assert.equal(new URL(res.location!).pathname, "/login")
})

test("admin pages: valid token passes, forged values redirect and are cleared", async () => {
  assert.equal((await visit("/admin", `admin_session=${createAdminToken()}`)).status, 200)

  const forged = await visit("/admin/users", "admin_session=authenticated")
  assert.equal(forged.status, 307)
  assert.equal(new URL(forged.location!).pathname, "/admin/login")
  assert.ok(forged.setCookie.some(expires("admin_session")))

  const loginPage = await visit("/admin/login", "admin_session=authenticated")
  assert.equal(loginPage.status, 200)
  assert.ok(loginPage.setCookie.some(expires("admin_session")))
})

test("with COOKIE_DOMAIN set, the shared-domain cookie is expired as well", async () => {
  process.env.COOKIE_DOMAIN = ".artistos.in"
  try {
    const res = await visit("/dashboard", `artist_session=${foreignToken()}`)
    assert.ok(res.setCookie.some((h) => expires("artist_session")(h) && !h.includes("Domain=")))
    assert.ok(res.setCookie.some((h) => expires("artist_session")(h) && h.includes("Domain=.artistos.in")))
  } finally {
    delete process.env.COOKIE_DOMAIN
  }
})

test("shared portfolio links stay public", async () => {
  assert.equal((await visit("/portfolio/shared/abc")).status, 200)
})
