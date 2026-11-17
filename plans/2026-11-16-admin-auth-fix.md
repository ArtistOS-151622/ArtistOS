# Phase 0: lock down admin auth (current Next app)

**Status:** draft, awaiting approval
**Parent plan:** `plans/2026-11-16-express-backend-migration.md` (phase 0)
**Urgency:** ship before any migration work. The admin API is open to anyone today.

## The problem (verified 2026-11-17)

1. **No auth on any admin API route.** `proxy.ts` only guards pathnames starting with `/admin`, so `/api/admin/*` never hits that check. None of the 12 route files below check the caller, and `/api/admin/` is also on the read-only gate's exempt list.

   | Route file | Methods |
   |---|---|
   | `app/api/admin/payments/route.ts` | GET |
   | `app/api/admin/platform-subscriptions/route.ts` | GET, POST |
   | `app/api/admin/platform-subscriptions/[id]/route.ts` | PUT, DELETE |
   | `app/api/admin/settings/route.ts` | GET, POST (includes maintenance toggle) |
   | `app/api/admin/stats/route.ts` | GET |
   | `app/api/admin/storage-plans/route.ts` | GET, POST |
   | `app/api/admin/storage/route.ts` | GET |
   | `app/api/admin/tickets/route.ts` | GET |
   | `app/api/admin/tickets/[id]/route.ts` | PUT |
   | `app/api/admin/tickets/[id]/messages/route.ts` | GET, POST |
   | `app/api/admin/users/route.ts` | GET, PATCH, DELETE |
   | `app/api/admin/users/delete-otp/route.ts` | POST |

   Someone with no cookie at all can list every user (PII, revenue), edit users, toggle maintenance mode, edit plans and subscriptions, read and answer tickets, view payments, and trigger delete-user OTPs.
2. **The admin cookie can be forged.** `admin_session` holds the literal string `"authenticated"`. `proxy.ts` only compares against that string, so setting the cookie by hand unlocks the `/admin` pages.
3. **Weak password handling** (`app/api/admin/login/route.ts`):
   - It falls back to `"admin123"` when `ADMIN_PASSWORD` is unset.
   - It compares with `===`, which isn't constant-time.
   - There's no limit on login attempts.

## Changes

### 1. Signed admin token: `lib/auth/session.ts`

- Add `createAdminToken()` and `verifyAdminToken(token)`. These reuse the existing HMAC-SHA256 header.payload.signature format and the same `getJwtSecret()`.
  - Payload: `{ role: "admin", iat, exp }`.
  - Add a named constant `ADMIN_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7`, matching today's admin expiry.
- `verifyAdminToken` checks the signature, then `exp`, then `role === "admin"`.
- `verifyArtistToken` gets an explicit `role` check: reject any payload with `role === "admin"`. An admin token has no integer `id`, so artist verification already rejects it; the explicit check makes that intent visible and keeps it safe if the payloads change.
- Export a constant `ADMIN_SESSION_COOKIE = "admin_session"`, so the name isn't a magic string.

### 2. Admin guard helper: `lib/auth/admin.ts` (new)

```ts
// returns null when authorised, or a 401 NextResponse to return immediately
export function requireAdmin(request: NextRequest): NextResponse | null
```
- It reads `admin_session`, calls `verifyAdminToken`, and returns `NextResponse.json({ error: "Unauthorized" }, { status: 401 })` on failure.
- Every handler in the table above starts with:
  ```ts
  const denied = requireAdmin(request)
  if (denied) return denied
  ```
  Handlers that currently take no `request` argument gain one.

### 3. Login: `app/api/admin/login/route.ts`

- **No password fallback.** If `ADMIN_PASSWORD` is unset, return 500 `{ error: "Admin login is not configured" }` and accept nothing.
- **Constant-time compare.** SHA-256 both the submitted and the expected password, then `crypto.timingSafeEqual` the digests. Hashing first makes the lengths equal, so the comparison doesn't leak the password length.
- **Attempt limit.** An in-memory per-IP counter (from `x-forwarded-for`) allows 5 failures per 15 min, then returns 429.
  - This is best-effort on Vercel: serverless instances don't share memory, so the limit is per instance.
  - The Express port gets a proper `express-rate-limit` on a single long-lived process.
  - Named constants for the limit and window.
- On success, set `admin_session` to `createAdminToken()` with `httpOnly`, `secure` in production, `sameSite: "strict"`, `path: "/"` and `maxAge: ADMIN_SESSION_MAX_AGE_SECONDS`.
- Validate the body: `password` must be a non-empty string, otherwise 400.

### 4. Logout: `app/api/admin/logout/route.ts`

No functional change. It keeps deleting `admin_session`; just use the constant.

### 5. `proxy.ts`

- **The `/admin/*` page guard** changes from `adminSession !== 'authenticated'` to `!verifyAdminToken(adminSession)`. `proxy.ts` already runs on the Node runtime and imports from `lib/auth/session`, so `crypto` is available.
- **Second layer for the API.** The matcher already covers `/api/*`. For `pathname.startsWith("/api/admin/")`, except `/api/admin/login`, return `401 { error: "Unauthorized" }` JSON unless the token verifies.
  - This runs before the read-only block.
  - It isn't a substitute for `requireAdmin` in each handler. It's a backstop if a new admin route forgets the guard.
- `/api/admin/` stays on the read-only exempt list. Admins aren't subscription-gated, and the guard above now protects those routes.

### 6. Admin pages

The admin pages already redirect to `/admin/login` via `proxy.ts`. Their client-side fetches to `/api/admin/*` should handle a 401 (session expired mid-use) by sending the user to `/admin/login`.
- Check `app/admin/layout.tsx` and the page fetch calls.
- Add the redirect where a 401 currently only shows a toast, or where it fails silently.
- Keep the change minimal. The full axios conversion happens in migration phase 4.

## Rollout

- **Before deploying:** confirm `ADMIN_PASSWORD` is set in Vercel Production. If it isn't, admin login will refuse everyone after deploy.
- **After deploying:** the current admin is logged out once, because the old `"authenticated"` cookie no longer verifies. They log in again. That's expected.
- **Rotation:** `JWT_SECRET` signs both token types. Rotating it logs out artists and the admin together, which is acceptable.

## Verification (manual; no runner needed beyond `pnpm test` for lib)

- Add `tests/admin-token.test.ts` (node:test):
  - an admin token round-trips
  - a tampered token is rejected
  - an expired token is rejected
  - an artist token is rejected by `verifyAdminToken`
  - an admin token is rejected by `verifyArtistToken`
- `pnpm test` passes.
- Lint the touched files against HEAD.
- `curl` checks against `pnpm dev`:
  - Every route in the table returns **401** with no cookie, with `Cookie: admin_session=authenticated`, and with `Cookie: artist_session=<valid artist token>`.
  - After `POST /api/admin/login` with the right password, the same routes return 200 (or their normal status).
  - A wrong password returns 401. The 6th wrong attempt within 15 min returns 429.
  - With `ADMIN_PASSWORD` unset, login returns 500 and never 200.
- In the browser:
  - Visiting `/admin` with a hand-set `admin_session=authenticated` cookie redirects to `/admin/login`.
  - A real login reaches the dashboard, and logout returns to login.

## Commit (after approval; nothing committed without your go-ahead)

**One single commit** for all of phase 0:
- `lib/auth/session.ts` admin token, `lib/auth/admin.ts`, and the test
- login/logout hardening
- `requireAdmin` in all 12 admin route files
- the `proxy.ts` page guard and `/api/admin` backstop
- admin page 401 handling (if needed)

Suggested message: `Lock down admin auth: signed admin token, guard all admin API routes`.
