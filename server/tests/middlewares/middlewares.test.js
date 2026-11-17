import { TEST_CRON_SECRET } from "../helpers/env.js"

import assert from "node:assert/strict"
import { after, before, test } from "node:test"
import express from "express"
import { z } from "zod"

import { errorHandler } from "#src/middlewares/error-handler.js"
import { createReadOnlyGuard } from "#src/middlewares/read-only-guard.js"
import { requireAdmin } from "#src/middlewares/require-admin.js"
import { requireArtist } from "#src/middlewares/require-artist.js"
import { requireCron } from "#src/middlewares/require-cron.js"
import { validate } from "#src/middlewares/validate.js"
import { runInBackground, drainBackgroundTasks } from "#src/utils/background.js"
import { clearSessionCookie, setSessionCookie } from "#src/utils/cookies.js"
import { createAdminToken, createArtistToken } from "#src/utils/session-token.js"
import { listen } from "../helpers/http.js"

const readOnlyArtists = new Set([7])
let readOnlyCheckThrows = false

function buildApp() {
  const app = express()
  app.use(express.json())
  app.get("/artist", requireArtist, (req, res) => res.json({ id: req.artist.id }))
  app.get("/admin", requireAdmin, (_req, res) => res.json({ ok: true }))
  app.get("/cron", requireCron, (_req, res) => res.json({ ok: true }))
  app.post(
    "/items/:id",
    validate({
      params: z.object({ id: z.coerce.number().int().positive() }),
      query: z.object({ dry: z.enum(["true", "false"]).default("false") }),
      body: z.object({ name: z.string().min(1) }),
    }),
    (req, res) => res.json({ ...req.validated, body: req.body })
  )
  const guard = createReadOnlyGuard(async (id) => {
    if (readOnlyCheckThrows) throw new Error("db down")
    return readOnlyArtists.has(id)
  })
  app.all("/api/bookings", requireArtist, guard, (_req, res) => res.json({ ok: true }))
  app.all("/api/billing", requireArtist, guard, (_req, res) => res.json({ ok: true }))
  app.post("/login", (_req, res) => {
    setSessionCookie(res, "tok")
    res.json({ ok: true })
  })
  app.post("/logout", (_req, res) => {
    clearSessionCookie(res)
    res.json({ ok: true })
  })
  app.use(errorHandler)
  return app
}

let server
before(async () => {
  server = await listen(buildApp())
})
after(() => server.close())

const get = (path, headers = {}) => fetch(`${server.url}${path}`, { headers })
const cookie = (value) => ({ Cookie: value })

test("requireArtist: 401 without credentials, forged or admin tokens", async () => {
  for (const headers of [{}, cookie("artist_session=authenticated"), cookie(`artist_session=${createAdminToken()}`)]) {
    const res = await get("/artist", headers)
    assert.equal(res.status, 401)
    assert.deepEqual(await res.json(), { error: "Unauthorized" })
  }
})

test("requireArtist: accepts the cookie or a Bearer token", async () => {
  const token = createArtistToken({ id: 5 })
  assert.deepEqual(await (await get("/artist", cookie(`artist_session=${token}`))).json(), { id: 5 })
  assert.deepEqual(await (await get("/artist", { Authorization: `Bearer ${token}` })).json(), { id: 5 })
})

test("requireArtist: uses the first VALID value when the cookie name is duplicated", async () => {
  const token = createArtistToken({ id: 9 })
  const res = await get("/artist", cookie(`artist_session=stale.invalid.token; artist_session=${token}`))
  assert.deepEqual(await res.json(), { id: 9 })
})

test("requireAdmin: only a signed admin token passes", async () => {
  assert.equal((await get("/admin")).status, 401)
  assert.equal((await get("/admin", cookie("admin_session=authenticated"))).status, 401)
  assert.equal((await get("/admin", cookie(`admin_session=${createArtistToken({ id: 1 })}`))).status, 401)
  assert.equal((await get("/admin", cookie(`admin_session=${createAdminToken()}`))).status, 200)
})

test("requireCron: needs the exact bearer secret", async () => {
  assert.equal((await get("/cron")).status, 401)
  assert.equal((await get("/cron", { Authorization: "Bearer wrong" })).status, 401)
  assert.equal((await get("/cron", { Authorization: TEST_CRON_SECRET })).status, 401)
  assert.equal((await get("/cron", { Authorization: `Bearer ${TEST_CRON_SECRET}` })).status, 200)
})

test("validate: coerces params/query, strips unknown body fields", async () => {
  const res = await fetch(`${server.url}/items/12`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Bridal", extra: "dropped" }),
  })
  assert.equal(res.status, 200)
  assert.deepEqual(await res.json(), { params: { id: 12 }, query: { dry: "false" }, body: { name: "Bridal" } })
})

test("validate: invalid input returns 400 with the schema's message (no field prefix)", async () => {
  const res = await fetch(`${server.url}/items/abc`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "x" }),
  })
  assert.equal(res.status, 400)
  const { error } = await res.json()
  assert.equal(typeof error, "string")
  assert.doesNotMatch(error, /^id: /)
})

test("read-only guard: blocks writes for read-only artists, allows reads and exempt paths", async () => {
  const readOnly = { Cookie: `artist_session=${createArtistToken({ id: 7 })}` }
  const normal = { Cookie: `artist_session=${createArtistToken({ id: 8 })}` }

  const blocked = await fetch(`${server.url}/api/bookings`, { method: "POST", headers: readOnly })
  assert.equal(blocked.status, 403)
  assert.equal((await blocked.json()).code, "READ_ONLY")

  assert.equal((await fetch(`${server.url}/api/bookings`, { headers: readOnly })).status, 200)
  assert.equal((await fetch(`${server.url}/api/billing`, { method: "POST", headers: readOnly })).status, 200)
  assert.equal((await fetch(`${server.url}/api/bookings`, { method: "POST", headers: normal })).status, 200)
})

test("read-only guard: fails open when the check errors", async () => {
  readOnlyCheckThrows = true
  try {
    const headers = { Cookie: `artist_session=${createArtistToken({ id: 7 })}` }
    assert.equal((await fetch(`${server.url}/api/bookings`, { method: "POST", headers })).status, 200)
  } finally {
    readOnlyCheckThrows = false
  }
})

test("session cookie: HttpOnly, SameSite=Lax, 1 year; logout expires it", async () => {
  const login = await fetch(`${server.url}/login`, { method: "POST" })
  const set = login.headers.get("set-cookie")
  assert.match(set, /^artist_session=tok;/)
  assert.match(set, /HttpOnly/)
  assert.match(set, /SameSite=Lax/)
  assert.match(set, /Max-Age=31536000/)
  assert.doesNotMatch(set, /Domain=/) // COOKIE_DOMAIN unset in tests

  const logout = await fetch(`${server.url}/logout`, { method: "POST" })
  assert.match(logout.headers.get("set-cookie"), /^artist_session=;.*Expires=Thu, 01 Jan 1970/)
})

test("background tasks: errors are swallowed and drain waits for completion", async () => {
  let finished = false
  runInBackground("ok", async () => {
    await new Promise((resolve) => setTimeout(resolve, 20))
    finished = true
  })
  runInBackground("fails", async () => {
    throw new Error("boom")
  })
  assert.equal(await drainBackgroundTasks(1000), true)
  assert.equal(finished, true)
})
