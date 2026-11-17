# Move the API from Next.js route handlers to an Express server (`server/`)

**Status:** draft, awaiting approval
**Decisions so far:**
- Separate API domain (Option B).
- API hosted on Render.
- **Server is plain JavaScript** (ESM, no TypeScript, no build step).
- Production-grade, feature-based folder structure.
- Frontend API calls move from `fetch` to a shared axios instance.
- On a 401, the axios interceptor redirects to `/login` automatically. Login, OTP and public endpoints are exempt.
- **No type checking in `server/`:** plain JS, no `@ts-check`, no JSDoc types, no `tsc`.
- **Admin auth is fixed as part of this work**, first, as phase 0 in the current Next code, because the admin API is open today. Express ports the fixed version.
- **Production domain: `artistos.in`.** Frontend on **Vercel** at `https://www.artistos.in` (the bare `artistos.in` 308-redirects there, verified 2026-11-17), API on Render at `https://api.artistos.in`.

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
- **No type checking (decided).** The server is plain JS, with no `@ts-check`, JSDoc types or `tsc`. Mistakes are caught instead by:
  - zod validation at every boundary: env at boot, and request body/query/params in `validate()`
  - ESLint (`@eslint/js` recommended + `eslint-plugin-n`), which catches undefined variables, bad imports and unused code
  - the ported `node:test` suite

## Hard requirement: a shared parent domain

The login cookie `artist_session` is HTTP-only and is read in two places:
1. by the API, to authenticate requests;
2. by `proxy.ts` on the Next side, to gate `/dashboard` etc. and to redirect logged-in users away from `/login`.

For both to see the cookie, the frontend and API must live under the **same registrable domain**. Production uses `artistos.in`:

| | Host |
|---|---|
| Frontend (Next, on Vercel) | `https://www.artistos.in` (bare `artistos.in` redirects here, so it isn't an API origin) |
| API (Express on Render) | `https://api.artistos.in` |

Production values:
- `COOKIE_DOMAIN=.artistos.in`
- `FRONTEND_ORIGINS=https://www.artistos.in`
- `NEXT_PUBLIC_API_URL=https://api.artistos.in`

The API sets the cookie with `Domain=.artistos.in; SameSite=Lax; Secure; HttpOnly`. Subdomains of the same site count as same-site, so this cookie is sent on `fetch(..., { credentials: "include" })`.

With the default `*.onrender.com` and `*.vercel.app` hosts, the cookie would be third-party. Safari blocks third-party cookies, Chrome restricts them, and `proxy.ts` could never read the cookie. **A custom domain on Render (`api.artistos.in`) is therefore required.**

## Folder structure (feature-based, layered)

```
server/
├── package.json              # "type": "module", engines.node >= 22, scripts below,
│                             #   "imports": { "#src/*": "./src/*" }  ← runtime path alias
├── .env.example              # every env var, documented, no values
├── .nvmrc                    # pinned Node LTS
├── eslint.config.js          # flat config: @eslint/js recommended + n (node) plugin
├── jsconfig.json             # editor only: "paths" mirror "#src/*" for go-to-definition (no checkJs)
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
│   │   └── index.js          # mounts every module's routers under /api (private + public)
│   │
│   ├── modules/              # one folder per resource; big resources split into sub-resource folders
│   │   ├── auth/
│   │   │   ├── auth.routes.js        # paths + middleware chain only
│   │   │   ├── auth.controller.js    # req/res in, calls service, shapes response
│   │   │   ├── auth.service.js       # business logic + DB access, no req/res
│   │   │   └── auth.validation.js    # zod schemas for body/query/params
│   │   │
│   │   ├── bookings/
│   │   │   ├── bookings.routes.js        # booking CRUD + mounts the sub-routers below
│   │   │   ├── bookings.controller.js / bookings.service.js / bookings.validation.js
│   │   │   ├── booking-input.js          # create/edit validation + response shaping (from lib/bookings)
│   │   │   ├── guards.js                 # ownership checks shared by the sub-resources
│   │   │   ├── payments/                 # payments.routes.js, .controller.js, .service.js, .validation.js
│   │   │   ├── expenses/                 # expenses + expense-categories
│   │   │   ├── charges/                  # additional-charges + discount
│   │   │   ├── services/                 # booking_services sync
│   │   │   ├── portfolio-tags/           # bookings/[id]/portfolio
│   │   │   ├── reminders/                # whatsapp-reminder
│   │   │   └── pdf/                      # pdf.controller.js + quotation-pdf.js (React.createElement, no JSX)
│   │   │
│   │   ├── portfolio/
│   │   │   ├── portfolio.routes.js       # mounts the sub-routers below
│   │   │   ├── portfolio.public.routes.js# unauthenticated: shared-link viewer (/api/public/portfolio/**)
│   │   │   ├── folders/   files/   shares/   downloads/   tickets/   preferences/
│   │   │   ├── quota.js   security.js   config.js   response.js   # used only inside portfolio
│   │   │
│   │   ├── inquiries/
│   │   │   ├── inquiries.routes.js / .controller.js / .service.js / .validation.js
│   │   │   ├── inquiries.public.routes.js   # unauthenticated: public inquiry form (/api/public/inquiry)
│   │   │   └── queries.js   form-link.js
│   │   │
│   │   ├── subscriptions/            # ALL billing in one place (was billing/, platform-subscriptions/,
│   │   │   │                         #   subscription-status/, shared/platform-billing, portfolio/billing)
│   │   │   ├── subscriptions.routes.js
│   │   │   ├── status.service.js         # checkIsReadOnly, plan features → exported for read-only-guard
│   │   │   ├── platform/                 # platform plan checkout, verify, billing dates, invoices
│   │   │   │   └── invoice-pdf.js        # React.createElement, no JSX
│   │   │   └── storage/                  # storage plan purchase + completePurchase / extendSubscriptionPeriod
│   │   │
│   │   ├── customers/   services/   courses/   profile/
│   │   ├── admin/
│   │   ├── reports/   dashboard/   badges/
│   │   ├── notifications/   push/   whatsapp/      # HTTP endpoints only; logic lives in shared/notifications
│   │   │
│   │   ├── cron/                     # thin: CRON_SECRET entry points that call module services
│   │   └── webhooks/                 # thin: raw-body + HMAC check, then calls subscriptions services
│   │
│   ├── middlewares/
│   │   ├── require-artist.js     # verifies artist_session cookie or Bearer → req.artist, else 401
│   │   ├── require-admin.js      # verifies signed admin_session token (role: admin) → req.admin, else 401
│   │   ├── read-only-guard.js    # port of proxy.ts mutating-API subscription gate (same exempt list, fails open)
│   │   ├── require-cron.js       # Authorization: Bearer CRON_SECRET
│   │   ├── validate.js           # validate(schema) → parses req.body/query/params with zod, 400 on failure
│   │   ├── rate-limit.js         # express-rate-limit presets (auth/OTP/public strict, general loose)
│   │   ├── request-id.js         # x-request-id for log correlation
│   │   ├── not-found.js          # 404 → { error }
│   │   └── error-handler.js      # ApiError/ZodError/unknown → { error } + status; logs with request id
│   │
│   ├── integrations/             # third-party CLIENTS only — no app logic, no message templates
│   │   ├── supabase.js           # createDbClient() / admin (service-role) client
│   │   ├── r2/                   # client.js, keys.js, url.js (presigned URLs)
│   │   ├── razorpay/             # client.js, verify-signature.js
│   │   ├── whatsapp.js           # send-message API client
│   │   └── web-push.js
│   │
│   ├── shared/                   # ONLY code used by 2+ modules
│   │   ├── notifications/        # dispatcher.js, events.js, time.js, producers/ (booking, inquiry, agenda,
│   │   │                         #   WhatsApp message building + worker)
│   │   ├── otp.js
│   │   └── phone.js              # e164
│   │
│   └── utils/                    # framework plumbing, no domain knowledge
│       ├── api-error.js          # class ApiError(status, message) + helpers (badRequest, notFound…)
│       ├── async-handler.js      # wraps async controllers so rejections reach error-handler
│       ├── session-token.js      # create/verify artist + admin tokens (byte-compatible with lib/auth/session.ts)
│       ├── cookies.js            # setSessionCookie / clearSessionCookie (Domain from config)
│       ├── background.js         # runInBackground(fn): replaces next/server after()
│       └── logger.js             # pino logger (RULES.md: no console.log)
│
└── tests/                        # node:test + node:assert; mirrors src/
    ├── utils/session-token.test.js       # token compatibility with the TS implementation
    ├── modules/subscriptions/...         # webhook events, billing dates (ported from root tests/)
    ├── modules/bookings/...  modules/inquiries/...  shared/...   # e164, reminders, etc.
    └── helpers/
```

**Placement rules:**
- **Code lives in its module by default.** It moves to `shared/` only once **two or more modules** use it. When that happens, move it in the same commit.
- **Split big modules by sub-resource.** When a module has more than about 3 sub-resources, or a file grows past about 400 lines, give each sub-resource its own folder with the same routes/controller/service/validation files. The parent `*.routes.js` mounts the sub-routers.
- **Public endpoints live in their own module** as a `<module>.public.routes.js` mounted without `requireArtist`, not in a separate `public/` module. The URLs stay `/api/public/...`; only the code location changes.
- **`integrations/` holds third-party clients only.** A file that knows about bookings, inquiries or templates belongs in a module or in `shared/`.
- **`cron/` and `webhooks/` stay thin.** They handle the special entry requirements (`CRON_SECRET`, raw body + HMAC), then call services from the owning module.
- **Imports use `#src/...`.** This comes from the `package.json` `imports` field, which Node resolves at runtime; `jsconfig.json` only mirrors it for the editor. No `../../..` chains. Use a named prefix like `#src/`, not a bare `#/`, which older Node versions don't support.

**Layer rules:**
- `routes` → `controller` → `service` → `integrations`/`shared`.
- **Controllers** are the only layer that touches `req`/`res`.
- **Services** never see `req`/`res`. They take plain arguments and throw `ApiError`.
- **Validation** happens in the route chain via `validate(schema)`, so controllers get clean input.
- **Modules never import another module's controller or routes.** Calling another module's **service** is allowed, e.g. `read-only-guard` → `subscriptions/status.service.js` and `webhooks` → `subscriptions` services. No separate repository layer: services query Supabase directly.

**PDFs without JSX.** `@react-pdf/renderer` documents (`components/pdf/quotation-pdf.tsx`, `invoice-pdf.tsx`, used by `bookings/[id]/pdf` and `billing/invoice/[id]`) are written in JSX. Plain JS with no build step can't run JSX, so the ports are rewritten with `React.createElement(...)` (alias `h`) and live in `bookings/pdf/` and `subscriptions/platform/`. If that becomes painful, `htm` (tagged templates, no build) is the fallback. Don't add a build step just for this.

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
  - Integrations: `@supabase/supabase-js`, `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`, `razorpay`, `web-push`, `archiver`, `@react-pdf/renderer` + `react` (needed for `React.createElement` in the PDF documents), `date-fns`.
- **Dev:** `eslint`, `@eslint/js`, `eslint-plugin-n`, `globals`.
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
| TS types / interfaces | removed; the zod schema in `*.validation.js` describes the input shape |

## Things that need special care

- **Read-only (expired subscription) gate.** This currently lives in `proxy.ts` for `/api/*` mutations. It moves into `read-only-guard.js` with the same exempt list and the same fail-open behaviour. The `/api` block in `proxy.ts` is removed only after cutover.
- **Maintenance mode cache.** `proxy.ts` caches the maintenance flag. When an admin toggles maintenance via Express, the cache in the Next process isn't cleared, so the change can lag by up to 30 s. That's acceptable; noted here for awareness.
- **Admin auth: fixed in phase 0, before the migration** (see *Admin panel*). The Express `require-admin.js` ports the fixed, signed-token check. Never port the old `=== "authenticated"` check.
- **Cookie switch at cutover.** Today `artist_session` is a host-only cookie on `www.artistos.in`, set by Next. After cutover the API sets it with `Domain=.artistos.in`. The browser treats these as two different cookies with the same name, so it can send both.
  - **How long the old cookie lingers:** up to **1 year** for artists (`SESSION_MAX_AGE_SECONDS` in `lib/auth/session.ts` is 365 days, not 7) and up to 7 days for admin. Clearing it actively is therefore required.
  - **The API's login, logout and every successful auth check clear the old host-only cookie**, by expiring it with no `Domain` attribute. Then active users lose it on their first request after cutover, not at its natural expiry.
  - **Verification on both sides tries every `artist_session` value and accepts the first valid one.** Neither framework does this by default:
    - **Express:** `cookie-parser` keeps only one value per name. `require-artist.js` and `require-admin.js` must parse the raw `req.headers.cookie` themselves, with a small `getAllCookieValues(header, name)` helper in `utils/cookies.js`.
    - **Next (`proxy.ts`):** `request.cookies.get()` returns only the first value. Use `request.cookies.getAll("artist_session")` and loop.
  - Add a phase 5 check: log in before cutover, switch, then log out and confirm no `artist_session` cookie remains.
- **The `proxy.ts` page guard must verify the signature, not just `exp`.** Today the artist page guard only decodes the token and checks `exp`, without verifying the signature. The axios interceptor sends any 401 to `/login`, and `proxy.ts` sends a user with a "valid" cookie from `/login` back to `/dashboard`. So a token the API rejects but whose `exp` looks valid causes a **redirect loop**: `/dashboard` → API 401 → `/login` → proxy → `/dashboard` → … The "redirect only once" flag in the interceptor resets on each page load, so it doesn't break the loop. Ways this can happen:
  - stale duplicate cookies (above)
  - a `JWT_SECRET` mismatch between Vercel and Render
  - a secret rotation

  **Fix:**
  - Replace `getJwtExpiry`/`isExpiredSession` in `proxy.ts` with `verifyArtistToken`, looping over all cookie values. It already runs on the Node runtime and uses `getArtistSession` for the API read-only check.
  - When no value verifies, delete the cookie in the redirect response. Then `/login` can't bounce back.
  - This ships at the start of phase 4, before the axios 401 redirect exists.
- **`JWT_SECRET` must be identical on Vercel and Render.** Both sides sign or verify the same tokens. If they differ, every API call returns 401. Document this in `server/.env.example` and the README. `config/env.js` should also require a minimum length (≥ 32 chars) so a placeholder can't slip through.
- **Vercel preview deployments** run on `*.vercel.app`, outside `artistos.in`, so they can't share the login cookie with `api.artistos.in`. Leave `NEXT_PUBLIC_API_URL` **unset for the Vercel Preview environment**, so previews keep using their own same-origin Next routes until cleanup. After cleanup, previews need a staging API plus a custom preview domain under `artistos.in` (e.g. `preview.artistos.in`), or they can only be used logged-out.
- **Set `NEXT_PUBLIC_API_URL` only on Vercel's Production environment.** It's inlined at build time, so changing it (cutover or rollback) needs a **redeploy** on Vercel, not just an env edit.
- **CORS.** Use an explicit origin allow-list with `credentials: true`, never `*`.
- **Public endpoints** (`/api/public/**`) need no auth but still go through CORS and rate-limiting.
- **OTP / login routes** get a strict rate limit.
- **Graceful shutdown.** On `SIGTERM` (sent by Render on deploys), stop accepting connections and let in-flight requests and `runInBackground` tasks finish. Give up after a timeout.

## Admin panel

### What's wrong today (found 2026-11-16)

1. **The admin API has no auth at all.** `proxy.ts` only guards paths starting with `/admin`, so `/api/admin/*` never reaches that check. None of the `app/api/admin/**` handlers check the caller either, and `/api/admin/` is on the read-only gate's exempt list. Anyone can call these routes directly, with no cookie:
   - list all users with their PII and revenue
   - edit users, or start deleting them
   - toggle maintenance mode
   - edit plans
   - read and answer tickets
   - view payments
2. **The admin cookie can be forged.** `admin_session` is the literal string `"authenticated"`, and `proxy.ts` only compares against that string.
3. **The password has a default.** Login falls back to `"admin123"` when `ADMIN_PASSWORD` is unset, and compares with `===` (not constant-time).

### Phase 0 fix (current Next code, ships before the migration starts)

- **Signed admin token.** In `lib/auth/session.ts`, add `createAdminToken()` / `verifyAdminToken()`. They use the same HMAC-SHA256 format and secret, with payload `{ role: "admin", iat, exp }`. The artist verifier rejects `role: "admin"` and vice versa, so one token type can't be used as the other.
- **Login** (`app/api/admin/login`):
  - Require `ADMIN_PASSWORD`; there's no fallback, so it returns 500 if it's unset.
  - Compare with `crypto.timingSafeEqual`.
  - Set `admin_session` to the signed token: HttpOnly, Secure, `SameSite=Strict`. Keep the 7-day expiry, or shorten it.
  - **Known side effect of `Strict`:** the cookie isn't sent when an `/admin` link is opened from outside the site (email, chat), so that lands on `/admin/login`. Accepted for admin.
  - Add a simple per-IP attempt limit.
- **`requireAdmin(request)`** helper in `lib/auth/admin.ts`. It returns 401 `{ error }` unless the cookie verifies. Call it at the top of **every** `app/api/admin/**` handler except login.
- **`proxy.ts`** changes:
  - The `/admin/*` page guard verifies the token signature, not the string.
  - Also cover `/api/admin/*` except login as a second layer, returning 401 JSON for API paths.
- **Rollout effect:** the current admin is logged out once, because the old cookie no longer verifies. That's expected.

### After the migration

- **Stays on Vercel (Next):** the `/admin/*` pages, and the page guard in `proxy.ts`, which verifies the signed `admin_session`.
- **Moves to Render (Express):** all admin endpoints, into `modules/admin/`. They're mounted behind `require-admin.js`, except login, which gets the strict rate limit.
- **Login flow:**
  1. The page at `www.artistos.in/admin/login` posts to `api.artistos.in/api/admin/login`.
  2. Express sets `admin_session` with `Domain=.artistos.in`.
  3. Both `proxy.ts` and Express verify it.
  - `SameSite=Strict` still works, because the two subdomains are the same site.
- **Cookie switch:** same as the artist cookie. Admin login and logout also expire the old host-only `admin_session`.
- **The admin pages use the axios `api` client**, as listed in the frontend conversion order. On a 401 from an admin route, redirect to `/admin/login`, not `/login`, by checking the request path in the interceptor.
- **Maintenance toggle:** the settings route can no longer call `invalidateMaintenanceModeCache()` in the Next process, so a toggle takes effect within the 30 s cache TTL (see *Things that need special care*).
- **Unchanged:** the URLs, the admin password, and the delete-user OTP flow (`ADMIN_SECURITY_PHONE`).

## Frontend changes: move API calls from `fetch` to axios

The frontend stops calling `fetch` for the API and uses **one shared axios instance**. Today there are 96 `fetch("/api…")` calls in 37 files. On top of those, there's `jsonFetcher` in `lib/swr/config.ts`, and three upload helpers use raw `XMLHttpRequest` to show progress.

### Dependency

- `pnpm add axios` in the root (frontend) package. The server doesn't need it.

### `lib/api/` (new, frontend only)

```
lib/api/
├── client.ts     # the single axios instance + interceptors
├── errors.ts     # ApiError class + toApiError(err) normaliser
└── index.ts      # re-exports: api, ApiError, isApiError, isCancel
```

**`client.ts`: one configured instance (`api`), never the bare `axios` default:**
- `baseURL: process.env.NEXT_PUBLIC_API_URL ?? ""`. With an empty value, requests stay same-origin and hit the existing Next routes, so cutover and rollback are still one env-var change.
- `withCredentials: true`. This is axios's equivalent of `credentials: "include"`, and it's needed for the cross-subdomain `artist_session` cookie.
- `timeout: 20_000`, a named constant. Uploads and downloads override it per request.
- `headers: { Accept: "application/json" }`. Don't hard-code `Content-Type`: axios sets JSON automatically, and sets the multipart boundary itself for `FormData`.
- **Response interceptor:**
  - Converts every failure into a single `ApiError` (see below) so callers handle one error shape.
  - On **401**, redirects to `/login?next=<current path>` automatically (decided), or to `/admin/login` for `/api/admin/*` requests, and only once: a module-level flag stops parallel 401s from triggering several redirects. Login/OTP/public endpoints are exempt (`skipAuthRedirect` request config flag).
  - On **403 with a read-only/subscription code**, emits the existing "subscription expired" UI signal instead of a generic toast.
  - Re-throws cancellations as-is (`axios.isCancel`), so callers can ignore them silently.
- **No token handling in a request interceptor.** Auth is the HTTP-only cookie, and JS can't read it. Don't put the token in `localStorage` or an `Authorization` header in the browser.
- **No automatic retries in axios.** SWR already retries reads (5xx only), and retrying writes isn't safe because they aren't idempotent. Don't add `axios-retry`.

**`errors.ts`:**
- `class ApiError extends Error { status: number; code?: string; info: unknown }`.
  - `status` is `0` for network or timeout errors.
- `toApiError(err)` reads `{ error }` or `{ message }` from the response body. That's the same logic as today's `errorMessageFrom`, which moves here.
  - Falls back to the existing "Something went wrong" message.
  - Maps `ECONNABORTED`/`ERR_NETWORK` to a friendly offline/timeout message.
- `FetchError` in `lib/swr/config.ts` is **replaced by `ApiError`**. The `shouldRetryOnError` check becomes `!(err instanceof ApiError && err.status >= 400 && err.status < 500)`.

### Best-practice rules for call sites

1. **Always import `api` from `@/lib/api`**, never `axios` directly. An ESLint `no-restricted-imports` rule enforces this, allowing `lib/api/**` only.
2. **Use typed generics, and use the data directly:**
   ```ts
   const { data } = await api.get<Booking[]>("/api/bookings", { params: { q, page } })
   const { data } = await api.post<Booking>("/api/bookings", payload)
   ```
   - Pass query strings through `params`, not by building URLs with template strings. Axios encodes them.
   - Pass objects as the body, with no `JSON.stringify`.
3. **No `res.ok` checks.** Axios throws on non-2xx, so wrap calls in `try/catch` and show `err.message` from `ApiError`.
4. **Cancellation:** keep the existing `AbortController` pattern and pass `signal: controller.signal`. Axios supports it natively; don't use the deprecated `CancelToken`. Ignore `isCancel(err)` in catch blocks. This applies to the stale-search handling in the bookings/customers/services/inquiries managers and the bookings detail page.
5. **SWR stays the read layer.** `jsonFetcher` becomes `(url) => api.get(url).then(r => r.data)`. SWR and `mutate` keys stay as the `/api/...` path strings, so keys don't change. Components keep calling `useSWR(key)` with no fetcher.
6. **Mutations:**
   - `api.post`/`put`/`patch`/`delete`, followed by the same `mutate(...)` calls as today.
   - Use `api.patch` only where the route actually exports `PATCH`. Check this per route while converting, because changing the HTTP method changes which route handler runs.
7. **Upload progress:** use axios's `onUploadProgress` in place of raw `XMLHttpRequest` in `portfolio-uploader.tsx`, `booking-upload-helper.ts` and `course-upload-helper.ts`.
   - **Uploads to R2 presigned URLs must NOT use the `api` instance.** Use a separate bare `uploadClient = axios.create({ withCredentials: false, timeout: 0 })` in `lib/api/client.ts`. Reasons:
     - No `baseURL` and no cookies: a credentialed request would fail R2's CORS check.
     - No auth-redirect interceptor.
     - A `Content-Type` matching the presigned signature.
8. **Binary responses** (booking PDF, bulk zip download) that are fetched in JS use `responseType: "blob"`, then an object URL. Plain `<a href>` downloads stay as links, with `NEXT_PUBLIC_API_URL` prefixed.
9. **Server-only code doesn't change.** Server-side `fetch` in `lib/whatsapp/*` (outbound calls from the backend, moving to `server/` anyway) and any server components keep using `fetch`. The axios client is for browser → API calls only.
10. **No `console.log`** in interceptors (RULES.md). Errors bubble up as `ApiError`.

### Conversion order (part of phase 4)

1. Add `lib/api/` and the ESLint import rule. Switch `jsonFetcher` to `api`, and replace `FetchError` with `ApiError`. All SWR reads now go through axios.
2. Convert mutations, one feature folder per commit:
   1. customers
   2. services
   3. courses
   4. bookings (+ detail page sub-resources)
   5. inquiries
   6. portfolio + storage
   7. profile/billing
   8. admin
   9. auth pages
3. Convert the three upload helpers to `onUploadProgress` + `uploadClient`.
4. Finally, `grep -rnE 'fetch\(["\x60]/api' app components lib hooks` must return **zero** browser-side hits.

## Infra / config

- **Render web service.** Use a `render.yaml` blueprint at the repo root:
  - root dir `server`
  - build: `pnpm install --frozen-lockfile`
  - start: `node src/server.js`
  - health check: `/health`
  - custom domain: `api.artistos.in` (DNS: CNAME `api` → the Render service host)
  - **Free plan sleeps after ~15 min idle, with a 30–60 s cold start.** That's unacceptable for webhooks, cron and the dashboard, so production needs **Starter or above**.
- **Lockfile.** `server/` gets its own committed `pnpm-lock.yaml`, scoped to the server package. It is independent of the root's gitignored lockfile, so the root stays as-is.
- **Env vars on Render.** All the env vars the API uses today:
  - Auth: `JWT_SECRET` (**must match Vercel's value exactly**, see *Things that need special care*), `ADMIN_PASSWORD` (required: no fallback)
  - Supabase: URL, anon key, `SUPABASE_SERVICE_ROLE_KEY`
  - R2 credentials
  - Razorpay, including `RAZORPAY_WEBHOOK_SECRET`
  - `CRON_SECRET`
  - WhatsApp
  - VAPID keys
  - Storage limits

  New ones: `FRONTEND_ORIGINS`, `COOKIE_DOMAIN`, `LOG_LEVEL`, `PORT`. `config/env.js` validates them at boot, so a missing var crashes the deploy instead of failing at runtime.
- **Frontend env:** `NEXT_PUBLIC_API_URL=https://api.artistos.in`.
- **GitHub Actions cron** (`.github/workflows/cron.yml`): use a new `API_URL` secret instead of `APP_URL`.
- **Razorpay dashboard:** change the webhook URL to `https://api.artistos.in/api/webhooks/razorpay`.
- **R2 bucket CORS:** no change. Uploads use presigned URLs from the frontend origin.

## Phases (one commit each, nothing deployed until phase 6, except phase 0)

0. **Fix admin auth in the current Next app, and deploy it immediately** (see *Admin panel → Phase 0 fix*). This phase is independent of everything else and isn't blocked on any other phase. Its own plan file: `plans/2026-11-16-admin-auth-fix.md`.
1. **Scaffold.** Create `server/` with the full structure above:
   - config/env, logger, error handling, the middlewares, `/health`
   - eslint, `.env.example`, README, `render.yaml`
   - `session-token.js` and `cookies.js`, plus the token-compatibility test
2. **Port integrations and cross-module logic.** Port the third-party clients to `server/src/integrations`, and code used by 2+ modules (notifications, OTP, phone) to `server/src/shared`. Port the matching tests from root `tests/` into the mirrored `server/tests/` paths, and make them pass. `lib/` code used by only one module (booking input, portfolio quota, billing dates, inquiry queries…) is ported with that module in phase 3, not here.
3. **Port modules** in groups, one commit each, in this order:
   1. auth + profile
   2. customers / services / courses
   3. bookings (+ sub-resources, pdf)
   4. inquiries (+ public inquiry form)
   5. portfolio (+ public shared-link viewer, downloads, tickets)
   6. subscriptions (billing, platform-subscriptions, subscription-status, storage purchase, invoice PDF)
   7. admin
   8. reports / dashboard / badges / notifications / push / whatsapp
   9. cron
   10. webhooks
4. **Frontend: move to axios.** First commit: make the `proxy.ts` page guard verify signatures (all cookie values) and clear unverifiable cookies, to prevent the redirect loop (see *Things that need special care*). Then add `lib/api/` (the axios instance, interceptors and `ApiError`). Move SWR's `jsonFetcher` onto it, then convert all `fetch("/api…")` call sites and the XHR upload helpers, one feature per commit (see *Frontend changes*). Requests still default to same-origin, so this phase can ship to production on its own, before the backend moves. That isolates any axios regressions from the Express cutover.
5. **Local end-to-end.** Run Next on `localhost:3000` and Express on `localhost:4000`, with `NEXT_PUBLIC_API_URL` set. Click through:
   - login
   - CRUD on each resource
   - uploads
   - share links
   - PDF
   - the payment flow (Razorpay test mode, webhook via a tunnel)
6. **Deploy and cut over.**
   1. Create the Render service and custom domain.
   2. Set `NEXT_PUBLIC_API_URL=https://api.artistos.in` on Vercel (Production only) and redeploy.
   3. Update the cron secret and the Razorpay webhook URL.

   Rollback: unset `NEXT_PUBLIC_API_URL` on Vercel Production and redeploy (or promote the previous deployment, which was built without it).
7. **Cleanup** (after a stable period):
   - Delete `app/api/**` and the backend-only `lib/` files, plus their root tests.
   - Remove the `/api` block from `proxy.ts`.
   - Update CLAUDE.md, MEMORY.md and RULES.md (new backend location, JS conventions).

## Verification

- `pnpm --filter server test`, including the **token compatibility test**. It generates a token with the JS implementation and verifies it with the TS logic (and the reverse), using a fixed secret and fixed time.
- `pnpm --filter server lint`.
- The token compatibility test also covers **admin tokens**: issued by TS and verified by JS, and the reverse. It also checks that an artist token is rejected as admin, and an admin token is rejected as artist.
- Root `pnpm test` still passes until cleanup, because the old routes are untouched.
- Axios migration:
  - No `fetch("/api` calls remain in browser code.
  - No direct `import axios` outside `lib/api/`; the lint rule enforces this.
  - With `NEXT_PUBLIC_API_URL` unset, every page works same-origin.
  - An expired session hitting any API call redirects to `/login` exactly once.
  - A cookie with a valid-looking `exp` but a bad signature (e.g. hand-edited payload) lands on `/login` and stays there. There's no loop back to `/dashboard`, and the bad cookie is cleared.
  - Typing quickly in a search box cancels the stale requests, with no error toast.
  - Upload progress bars still move, and R2 uploads succeed. Check that the `PUT` carries no cookie.
- Phase 5 manual checklist, including:
  - the cookie is visible on both hosts, and logout clears it on both
  - a session from before cutover still works after it, and logout then leaves no `artist_session` cookie (old host-only or new domain one)
  - a read-only account gets 403 on writes
  - every `/api/admin/*` route except login returns 401 with no cookie, with `admin_session=authenticated`, and with an artist token
  - an admin login before cutover still works after it, and admin logout clears both cookie variants
  - the webhook signature validates
  - cron endpoints reject a missing or wrong `CRON_SECRET`
  - a missing env var fails boot with a clear message
  - a token signed with a different `JWT_SECRET` is rejected by both `proxy.ts` and Express, and lands on `/login` with no loop

## Open questions

None. All decisions are recorded at the top.
