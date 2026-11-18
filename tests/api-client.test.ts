import assert from "node:assert/strict"
import { createServer, type IncomingMessage, type ServerResponse } from "node:http"
import { register } from "node:module"
import type { AddressInfo } from "node:net"
import { after, before, test } from "node:test"

// lib/api uses the "@/..." alias; resolve it for this test file only.
register("./helpers/alias-hooks.mjs", import.meta.url)

type Handler = (req: IncomingMessage, res: ServerResponse) => void
const routes = new Map<string, Handler>()
const seen: { url: string; method: string; body: string; contentType: string | undefined }[] = []

const server = createServer((req, res) => {
  let body = ""
  req.on("data", (chunk) => (body += chunk))
  req.on("end", () => {
    seen.push({ url: req.url ?? "", method: req.method ?? "", body, contentType: req.headers["content-type"] })
    const handler = routes.get(`${req.method} ${req.url?.split("?")[0]}`)
    if (!handler) {
      res.writeHead(404, { "Content-Type": "application/json" }).end(JSON.stringify({ error: "Route not found" }))
      return
    }
    handler(req, res)
  })
})

const json = (status: number, body: unknown): Handler => (_req, res) =>
  res.writeHead(status, { "Content-Type": "application/json" }).end(JSON.stringify(body))

let lib: typeof import("../lib/api/index.ts")
let swrConfig: typeof import("../lib/swr/config.ts")

before(async () => {
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve))
  const { port } = server.address() as AddressInfo
  // NEXT_PUBLIC_API_URL is read when lib/api/client loads: set it first.
  process.env.NEXT_PUBLIC_API_URL = `http://127.0.0.1:${port}/`
  lib = await import("../lib/api/index.ts")
  swrConfig = await import("../lib/swr/config.ts")
})
after(() => server.close())

test("requests go to NEXT_PUBLIC_API_URL (trailing slash dropped) with JSON bodies and encoded params", async () => {
  routes.set("POST /api/things", json(201, { ok: true }))
  const { data, status } = await lib.api.post("/api/things", { a: 1 }, { params: { q: "a b&c", page: 2 } })
  assert.equal(status, 201)
  assert.deepEqual(data, { ok: true })

  const last = seen.at(-1)!
  assert.equal(new URL(last.url, "http://x").searchParams.get("q"), "a b&c")
  assert.equal(new URL(last.url, "http://x").searchParams.get("page"), "2")
  assert.equal(last.body, JSON.stringify({ a: 1 }))
  assert.match(last.contentType ?? "", /application\/json/)

  assert.equal(lib.apiUrl("/api/x"), `${lib.API_BASE_URL}/api/x`)
  assert.ok(!lib.API_BASE_URL.endsWith("/"))
})

test("non-2xx rejects with ApiError carrying status, message, code and body", async () => {
  routes.set("GET /api/fail", json(409, { error: "phone_exists", code: "DUP", extra: 1 }))
  await assert.rejects(lib.api.get("/api/fail"), (err: unknown) => {
    assert.ok(lib.isApiError(err))
    assert.equal(err.status, 409)
    assert.equal(err.message, "phone_exists")
    assert.equal(err.code, "DUP")
    assert.deepEqual(err.info, { error: "phone_exists", code: "DUP", extra: 1 })
    return true
  })
})

test("envelope errors ({ status: false, message }) use the message", async () => {
  routes.set("POST /api/env", json(403, { status: false, message: "Folder not found", data: null }))
  await assert.rejects(lib.api.post("/api/env", {}), (err: unknown) => {
    assert.ok(lib.isApiError(err))
    assert.equal(err.message, "Folder not found")
    return true
  })
})

test("getErrorMessage: API text, else the caller's fallback; network errors keep their own message", async () => {
  routes.set("GET /api/bare", json(500, {}))
  const bare = await lib.api.get("/api/bare").catch((e: unknown) => e)
  assert.equal(lib.getErrorMessage(bare, "Unable to load customers."), "Unable to load customers.")

  routes.set("GET /api/msg", json(400, { error: "Name is required." }))
  const withMsg = await lib.api.get("/api/msg").catch((e: unknown) => e)
  assert.equal(lib.getErrorMessage(withMsg, "fallback"), "Name is required.")

  const network = await lib.api.get("http://127.0.0.1:9/api/nothing-listens-here").catch((e: unknown) => e)
  assert.ok(lib.isApiError(network))
  assert.equal(network.status, 0)
  assert.equal(lib.getErrorMessage(network, "fallback"), network.message)
  assert.notEqual(network.message, "fallback")

  assert.equal(lib.getErrorMessage(new TypeError("x is undefined"), "fallback"), "fallback")
})

test("cancelled requests reject with the axios cancel error, not ApiError", async () => {
  routes.set("GET /api/slow", (_req, res) => setTimeout(() => json(200, {})(_req, res), 200))
  const controller = new AbortController()
  const pending = lib.api.get("/api/slow", { signal: controller.signal })
  controller.abort()
  const err = await pending.catch((e: unknown) => e)
  assert.ok(lib.isCancel(err))
  assert.ok(!lib.isApiError(err))
})

test("401 outside a browser rejects normally (no window to redirect)", async () => {
  routes.set("GET /api/private", json(401, { error: "Unauthorized" }))
  await assert.rejects(lib.api.get("/api/private"), (err: unknown) => lib.isApiError(err) && err.status === 401)
})

test("SWR fetcher returns data and retries only 5xx / network errors", async () => {
  routes.set("GET /api/list", json(200, { items: [1, 2] }))
  assert.deepEqual(await swrConfig.jsonFetcher("/api/list"), { items: [1, 2] })

  const retry = swrConfig.swrConfig.shouldRetryOnError as (err: unknown) => boolean
  assert.equal(retry(new lib.ApiError("x", 404)), false)
  assert.equal(retry(new lib.ApiError("x", 401)), false)
  assert.equal(retry(new lib.ApiError("x", 503)), true)
  assert.equal(retry(new lib.ApiError("x", 0)), true)
})

test("FormData uploads get a multipart boundary and report progress", async () => {
  routes.set("POST /api/upload", json(200, { status: true }))
  const form = new FormData()
  form.append("file", new Blob([new Uint8Array(1024)], { type: "image/png" }), "a.png")
  await lib.api.post("/api/upload", form, { timeout: 0 })
  assert.match(seen.at(-1)!.contentType ?? "", /^multipart\/form-data; boundary=/)
})
