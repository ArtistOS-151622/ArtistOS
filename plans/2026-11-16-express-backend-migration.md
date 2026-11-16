# Move the API from Next.js route handlers to an Express server (`server/`)

**Status:** draft, awaiting approval
**Decisions so far:**
- Separate API domain (Option B).
- API hosted on Render.
- **Server is plain JavaScript** (ESM, no TypeScript, no build step).
- Production-grade, feature-based folder structure.

## Goal

Every endpoint under `app/api/**/route.ts` (97 handlers) is served by a JavaScript Express app in `server/`, on its own domain, deployed to Render. Next.js keeps the pages and the `proxy.ts` page guards only. Paths stay the same (`/api/...`), so for the frontend the move is a base-URL switch.

## Key consequence of "JS, not TS": the server owns its backend code

Plain JS can't import the TypeScript files in `lib/` without a build step. So the server is **self-contained**: the backend logic in `lib/` (Supabase queries, R2, Razorpay, billing, quota, WhatsApp, push, notifications, OTP, etc.) is **ported to JS inside `server/src/`**, not shared.

- **During the migration**, that logic exists twice: in TS (`lib/`, used by the old Next routes) and in JS (`server/`). **Freeze backend changes to the old routes while the migration is in progress.** If a fix lands in `lib/` before cutover, apply it to the matching `server/` file too.
- **After cutover**, the backend-only `lib/` files are deleted, so the duplication goes away. What stays in `lib/` is what the frontend and `proxy.ts` use:
  - `utils.ts`, `hooks/*`, `swr/config.ts`, `supabase/client.ts`
  - UI-side types and config such as `portfolio/types.ts` and `portfolio/config.ts`
  - `auth/session.ts`, for `verifyArtistToken` in `proxy.ts`
- **Token compatibility is critical.** `server/src/utils/session-token.js` must produce and verify tokens **byte-for-byte identically** to `lib/auth/session.ts`. That means the same HMAC-SHA256, base64url encoding, payload shape `{ id, phone, artist_name, studio_name, iat, exp }`, and secret env var. Then `proxy.ts` accepts tokens the API issues, and existing logins survive the cutover. A test asserts this (see Verification).
- **Type safety without TS (optional):** add `// @ts-check` with JSDoc types on the shared shapes (session, API error), and set `checkJs` in `jsconfig.json`. The editor and `tsc --noEmit` then still catch mistakes, with no build step.

## Hard requirement: a shared parent domain

The login cookie `artist_session` is HTTP-only and is read in two places:
1. by the API, to authenticate requests;
2. by `proxy.ts` on the Next side, to gate `/dashboard` etc. and to redirect logged-in users away from `/login`.

For both to see the cookie, the frontend and API must live under the **same registrable domain**, e.g.

| | Host |
|---|---|
| Frontend (Next) | `artistos.in` / `app.artistos.in` |
| API (Express on Render) | `api.artistos.in` |

The API sets the cookie with `Domain=.artistos.in; SameSite=Lax; Secure; HttpOnly`. Subdomains of the same site count as same-site, so this cookie is sent on `fetch(..., { credentials: "include" })`.

With the default `*.onrender.com` and `*.vercel.app` hosts, the cookie would be third-party. Safari blocks third-party cookies, Chrome restricts them, and `proxy.ts` could never read the cookie. **A custom domain on Render (`api.<your-domain>`) is therefore required.**

## Folder structure (feature-based, layered)

```
server/
├── package.json              # "type": "module", engines.node >= 22, scripts below
├── .env.example              # every env var, documented, no values
├── .nvmrc                    # pinned Node LTS
├── eslint.config.js          # flat config: @eslint/js recommended + n (node) plugin
├── jsconfig.json             # @ts-check / JSDoc type checking, "#/*" path hints
├── README.md                 # run, env, deploy, conventions
├── src/
│   ├── server.js             # entry: load config, start HTTP server, graceful shutdown (SIGTERM/SIGINT)
│   ├── app.js                # builds the express app: security, parsers, routes, 404, error handler
│   │
│   ├── config/
│   │   ├── env.js            # reads + validates process.env with zod; fails fast on boot; exports frozen config
│   │   ├── cors.js           # allow-list from FRONTEND_ORIGIN(S), credentials: true
│   │   └── constants.js      # cookie names, limits, exempt route lists (no magic strings)
│   │
│   ├── routes/
│   │   └── index.js          # mounts every module router under /api
│   │
│   ├── modules/              # one folder per resource, same 4-5 files each
│   │   ├── auth/
│   │   │   ├── auth.routes.js        # paths + middleware chain only
│   │   │   ├── auth.controller.js    # req/res in, calls service, shapes response
│   │   │   ├── auth.service.js       # business logic + DB access, no req/res
│   │   │   └── auth.validation.js    # zod schemas for body/query/params
│   │   ├── bookings/                 # incl. sub-resources: payments, expenses,
│   │   │   ├── bookings.routes.js    #   additional-charges, discount, services,
│   │   │   ├── bookings.controller.js#   portfolio, pdf
│   │   │   ├── bookings.service.js
│   │   │   ├── bookings.validation.js
│   │   │   └── bookings.pdf.js       # @react-pdf/renderer document → stream
│   │   ├── customers/   services/   courses/   inquiries/
│   │   ├── portfolio/                # folders, files, shares, downloads, storage, purchase-storage
│   │   ├── billing/   platform-subscriptions/   subscription-status/
│   │   ├── admin/
│   │   ├── reports/   dashboard/   badges/
│   │   ├── notifications/   push/   whatsapp/
│   │   ├── profile/
│   │   ├── public/                   # unauthenticated: shared portfolio, public inquiry form
│   │   ├── cron/                     # CRON_SECRET-protected jobs
│   │   └── webhooks/                 # razorpay (raw body)
│   │
│   ├── middlewares/
│   │   ├── require-artist.js     # verifies artist_session cookie or Bearer → req.artist, else 401
│   │   ├── require-admin.js      # admin session check → 401
│   │   ├── read-only-guard.js    # port of proxy.ts mutating-API subscription gate (same exempt list, fails open)
│   │   ├── require-cron.js       # Authorization: Bearer CRON_SECRET
│   │   ├── validate.js           # validate(schema) → parses req.body/query/params with zod, 400 on failure
│   │   ├── rate-limit.js         # express-rate-limit presets (auth/OTP strict, general loose)
│   │   ├── request-id.js         # x-request-id for log correlation
│   │   ├── not-found.js          # 404 → { error }
│   │   └── error-handler.js      # ApiError/ZodError/unknown → { error } + status; logs with request id
│   │
│   ├── integrations/             # third-party clients, one place each
│   │   ├── supabase.js           # createDbClient() / admin (service-role) client
│   │   ├── r2/                   # client.js, keys.js, url.js (presigned URLs)
│   │   ├── razorpay/             # client.js, webhook-events.js, platform-webhook.js
│   │   ├── whatsapp/             # client.js, worker.js, booking/inquiry/agenda notifications
│   │   └── web-push.js
│   │
│   ├── shared/                   # domain logic used by several modules (ported from lib/)
│   │   ├── subscription.js       # checkIsReadOnly, plan features
│   │   ├── portfolio/            # quota.js, billing.js, folders.js, files.js, security.js, config.js, response.js
│   │   ├── bookings/             # booking-input.js, guards.js
│   │   ├── notifications/        # dispatcher.js, events.js, time.js, producers/
│   │   ├── inquiries/            # queries.js, validation.js, form-link.js
│   │   ├── platform-billing.js   # + platform-billing-dates.js
│   │   ├── otp.js
│   │   └── phone.js              # e164
│   │
│   └── utils/
│       ├── api-error.js          # class ApiError(status, message) + helpers (badRequest, notFound…)
│       ├── async-handler.js      # wraps async controllers so rejections reach error-handler
│       ├── session-token.js      # create/verify artist token (byte-compatible with lib/auth/session.ts)
│       ├── cookies.js            # setSessionCookie / clearSessionCookie (Domain from config)
│       ├── background.js         # runInBackground(fn): replaces next/server after()
│       └── logger.js             # pino logger (RULES.md: no console.log)
│
└── tests/                        # node:test + node:assert (same runner style as root tests/)
    ├── session-token.test.js     # token compatibility with the TS implementation
    ├── ...ported from root tests/ (webhook events, billing dates, e164, inquiries, reminders, etc.)
    └── helpers/
```

**Layer rules:**
- `routes` → `controller` → `service` → `integrations`/`shared`.
- **Controllers** are the only layer that touches `req`/`res`.
- **Services** never see `req`/`res`. They take plain arguments and throw `ApiError`.
- **Validation** happens in the route chain via `validate(schema)`, so controllers get clean input.
- No module imports another module's controller. Cross-module logic goes in `shared/`.

**Request pipeline in `app.js`, in this order:**
1. `request-id`
2. `pino-http` logging
3. `helmet`
4. `cors`
5. `compression`
6. **Razorpay webhook route mounted here, with `express.raw()`.** It must come before the JSON parser because HMAC verification needs the raw bytes.
7. `express.json({ limit: "1mb" })` and `cookie-parser`
8. `/health` (no auth; Render health check)
9. `/api` routers. Per-router middleware: `require-artist`, then `read-only-guard` on mutating methods.
10. `not-found`
11. `error-handler`

Also set `app.set("trust proxy", 1)`. Render sits behind a proxy, and this setting is needed for secure cookies and for rate-limit IPs.

## Dependencies (server/package.json)

- **Runtime:**
  - Core: `express@5` (native async error propagation), `cors`, `helmet`, `compression`, `cookie-parser`, `express-rate-limit`, `pino`, `pino-http`, `zod`.
  - Integrations: `@supabase/supabase-js`, `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`, `razorpay`, `web-push`, `archiver`, `@react-pdf/renderer`, `date-fns`.
- **Dev:** `eslint`, `@eslint/js`, `eslint-plugin-n`, `globals`, `typescript` (only for `tsc --noEmit` checkJs, optional).
- **Scripts:**
  - `dev`: `node --watch --env-file=.env src/server.js`
  - `start`: `node src/server.js`
  - `test`: `node --test tests/`
  - `lint`: `eslint .`
- No bundler and no `dist/`. Render runs the source directly.

## Porting a handler (the mechanical part)

| Next (TS) | Express (JS) |
|---|---|
| `export async function GET(req, { params })` | `router.get("/:id", requireArtist, controller.getOne)` |
| `await params` | `req.params` |
| `req.nextUrl.searchParams.get("q")` | `req.query.q` (validated) |
| `await req.json()` | `req.body` (validated) |
| `NextResponse.json(x, { status })` | `res.status(s).json(x)` |
| `return NextResponse.json({ error }, { status: 4xx })` | `throw new ApiError(4xx, "...")` in the service |
| `response.cookies.set("artist_session", …)` | `setSessionCookie(res, token)` |
| `getArtistSession(req)` + 401 | `requireArtist` middleware → `req.artist` |
| `cookies()` from `next/headers` (admin login/logout) | `req.cookies` / `res.cookie()` |
| `after(async () => …)` | `runInBackground(async () => …)` |
| streamed/binary (`bookings/[id]/pdf`, `bulk-download` zip) | pipe the stream into `res` with headers set |
| TS types / interfaces | removed; JSDoc `@typedef` where useful |

## Things that need special care

- **Read-only (expired subscription) gate.** This currently lives in `proxy.ts` for `/api/*` mutations. It moves into `read-only-guard.js` with the same exempt list and the same fail-open behaviour. The `/api` block in `proxy.ts` is removed only after cutover.
- **Maintenance mode cache.** `proxy.ts` caches the maintenance flag. When an admin toggles maintenance via Express, the cache in the Next process isn't cleared, so the change can lag by up to 30 s. That's acceptable; noted here for awareness.
- **Admin auth (security bug today).** The `admin_session` cookie value is the literal string `"authenticated"`, so anyone can forge it. The recommended fix, done while porting admin: issue a signed admin token the same way as the artist token, and update the `proxy.ts` admin check to verify its signature. This needs a decision (see Open questions).
- **CORS.** Use an explicit origin allow-list with `credentials: true`, never `*`.
- **Public endpoints** (`/api/public/**`) need no auth but still go through CORS and rate-limiting.
- **OTP / login routes** get a strict rate limit.
- **Graceful shutdown.** On `SIGTERM` (sent by Render on deploys), stop accepting connections and let in-flight requests and `runInBackground` tasks finish. Give up after a timeout.

## Frontend changes

- Add a new `lib/api/client.ts`:
  - `apiUrl(path)` returns `${process.env.NEXT_PUBLIC_API_URL ?? ""}${path}`.
  - `apiFetch(path, init)` returns `fetch(apiUrl(path), { credentials: "include", ...init })`.
- Replace roughly 100 call sites in 51 files: `fetch("/api…")` / `` fetch(`/api…`) `` become `apiFetch(...)`.
- Update `jsonFetcher` in `lib/swr/config.ts` to prefix the base URL. SWR and `mutate` keys keep the `/api/...` path unchanged.
- With `NEXT_PUBLIC_API_URL` **unset**, everything still hits the existing Next routes. Cutover and rollback are each a single env-var change.

## Infra / config

- **Render web service.** Use a `render.yaml` blueprint at the repo root:
  - root dir `server`
  - build: `pnpm install --frozen-lockfile`
  - start: `node src/server.js`
  - health check: `/health`
  - custom domain: `api.<domain>`
  - **Free plan sleeps after ~15 min idle, with a 30–60 s cold start.** That's unacceptable for webhooks, cron and the dashboard, so production needs **Starter or above**.
- **Lockfile.** `server/` gets its own committed `pnpm-lock.yaml`, scoped to the server package. It is independent of the root's gitignored lockfile, so the root stays as-is.
- **Env vars on Render.** All the env vars the API uses today:
  - Auth: `JWT_SECRET`
  - Supabase: URL, anon key, `SUPABASE_SERVICE_ROLE_KEY`
  - R2 credentials
  - Razorpay, including `RAZORPAY_WEBHOOK_SECRET`
  - `CRON_SECRET`
  - WhatsApp
  - VAPID keys
  - Storage limits

  New ones: `FRONTEND_ORIGINS`, `COOKIE_DOMAIN`, `LOG_LEVEL`, `PORT`. `config/env.js` validates them at boot, so a missing var crashes the deploy instead of failing at runtime.
- **Frontend env:** `NEXT_PUBLIC_API_URL=https://api.<domain>`.
- **GitHub Actions cron** (`.github/workflows/cron.yml`): use a new `API_URL` secret instead of `APP_URL`.
- **Razorpay dashboard:** change the webhook URL to `https://api.<domain>/api/webhooks/razorpay`.
- **R2 bucket CORS:** no change. Uploads use presigned URLs from the frontend origin.

## Phases (one commit each, nothing deployed until phase 6)

1. **Scaffold.** Create `server/` with the full structure above:
   - config/env, logger, error handling, the middlewares, `/health`
   - eslint, `.env.example`, README, `render.yaml`
   - `session-token.js` and `cookies.js`, plus the token-compatibility test
2. **Port shared logic.** Port the `lib/` code to JS under `server/src/integrations` and `server/src/shared`. Port the matching tests from root `tests/` to `server/tests/`, and make them pass.
3. **Port modules** in groups, one commit each, in this order:
   1. auth + profile
   2. customers / services / courses
   3. bookings (+ sub-resources, pdf)
   4. inquiries + public
   5. portfolio (+ shared, downloads, purchase-storage)
   6. billing / platform-subscriptions / subscription-status
   7. admin
   8. reports / dashboard / badges / notifications / push / whatsapp
   9. cron
   10. webhooks
4. **Frontend client.** Add `apiFetch` and replace the call sites. Requests still default to same-origin.
5. **Local end-to-end.** Run Next on `localhost:3000` and Express on `localhost:4000`, with `NEXT_PUBLIC_API_URL` set. Click through:
   - login
   - CRUD on each resource
   - uploads
   - share links
   - PDF
   - the payment flow (Razorpay test mode, webhook via a tunnel)
6. **Deploy and cut over.**
   1. Create the Render service and custom domain.
   2. Set the frontend env var.
   3. Update the cron secret and the Razorpay webhook URL.

   Rollback: unset `NEXT_PUBLIC_API_URL`.
7. **Cleanup** (after a stable period):
   - Delete `app/api/**` and the backend-only `lib/` files, plus their root tests.
   - Remove the `/api` block from `proxy.ts`.
   - Update CLAUDE.md, MEMORY.md and RULES.md (new backend location, JS conventions).

## Verification

- `pnpm --filter server test`, including the **token compatibility test**. It generates a token with the JS implementation and verifies it with the TS logic (and the reverse), using a fixed secret and fixed time.
- `pnpm --filter server lint`. Optionally also `tsc --noEmit -p server/jsconfig.json` for JSDoc type checks.
- Root `pnpm test` still passes until cleanup, because the old routes are untouched.
- Phase 5 manual checklist, including:
  - the cookie is visible on both hosts, and logout clears it on both
  - a read-only account gets 403 on writes
  - the webhook signature validates
  - cron endpoints reject a missing or wrong `CRON_SECRET`
  - a missing env var fails boot with a clear message

## Open questions

1. What is the production domain, and where is the Next frontend hosted (Vercel?)? This determines `COOKIE_DOMAIN` and the CORS origins.
2. Should the forgeable `admin_session` cookie be fixed as part of this work, or ported 1:1 and fixed separately?
3. JSDoc + `@ts-check` type checking in `server/`: yes (recommended, no build step) or plain JS with no type checking?
