# MEMORY.md — ArtistOS Persistent Agent Memory

> **Update this file whenever you learn something non-obvious about this codebase.**
> Every new agent session should read this before starting work.

---

## Non-Standard Next.js (Critical)

- `middleware.ts` is **renamed to `proxy.ts`** in this repo's pinned Next.js version. It exports `proxy()`, not `middleware()`. Route protection lives in `proxy.ts` at the project root.
- Before assuming any Next.js API behaves like training data, check `node_modules/next/dist/docs/`.

---

## Auth System

- **Fully custom** — phone + SHA-256 password → HMAC-SHA256 JWT stored as `artist_session` HTTP-only cookie (7 days).
- Token shape: `{ id, phone, artist_name, studio_name, iat, exp }` — signed with `JWT_SECRET`/`AUTH_SECRET`.
- `getArtistSession(request)` accepts both cookie and `Bearer` header.
- **No Supabase Auth** — never call `supabase.auth.*` anything.

---

## Database & Migrations

- Supabase = Postgres only (no RLS, no Supabase Auth). Use anon key + plain SQL.
- Migrations in `supabase/migrations/` applied via `supabase db push` **in filename order**.
- **Always** use `supabase migration new <name>` — never hand-name files (timestamp must be unique).
- First-time push on a new env needs: `supabase migration repair --status applied <version>` for historically-applied migrations.

---

## Razorpay / Subscriptions

- Subscription dates are synced with Razorpay's `next_billing_at` as **source of truth** — not local date arithmetic.
- Webhook (`/api/webhooks/razorpay`) = source of truth for payment state (HMAC-verified via `RAZORPAY_WEBHOOK_SECRET`).
- Auto-pay renewal webhook fetches subscription data from Razorpay API to get precise billing dates.
- Admin panel has a **Test User** toggle to exempt accounts from all subscription/expiration checks.

---

## File Storage

- Cloudflare R2 via S3-compatible SDK — `lib/r2/client.ts`, `lib/r2/keys.ts`, `lib/r2/url.ts`.
- **Never** Supabase Storage.
- Free tier = `STORAGE_FREE_TIER_BYTES`. Paid tiers in `storage_plans` table.
- Shares expire via cron: `app/api/cron/portfolio/expire-shares` (GitHub Actions: `0 3 * * *`).

---

## Package Manager

- **pnpm** always. `pnpm-lock.yaml` is gitignored locally but `package-lock.json` is committed — both may exist.
- Never run `npm install` or `yarn add`.

---

## UI Patterns

- shadcn/ui style `base-nova`, base color `neutral`, icon library `lucide`, no Tailwind prefix.
- New shadcn primitives → `pnpm dlx shadcn@latest add <component>` (do not hand-write).
- Charts → `components/ui/chart.tsx` shadcn pattern.
- All dropdowns → `DropdownMenu` family from `components/ui/dropdown-menu.tsx`.
- Form icon → inside the border: `relative` wrapper + `absolute` icon + `pl-10` on input.
- CRM resource pattern: `manager` / `form` / `card` / `types` under `components/common/<feature>/`.
- Shared primitives: `AppModal`, `ConfirmDialog`, `AppLoader`, `DatePicker`, `TimePicker`, `FormDropdown`.
- Topbar injection: `HeaderPortal` from `dashboard-header-context.tsx`.

---

## Route Structure

- `app/(dashboard)/` → authenticated route group with shared `DashboardShell`.
- `app/api/**/route.ts` → REST-ish endpoints (match resources 1:1 mostly).
- `app/api/webhooks/razorpay` → server-to-server, no user session.
- `app/api/cron/**` → cron endpoints (Authorization Bearer `CRON_SECRET`).
- Public pages (`/`, `/login`, `/signup`) → outside `(dashboard)` group.

---

## SEO (added 2026-08-17)

- Target keywords: "ArtistOS", "mehndi booking app", "makeup artist CRM", "beauty artist software".
- Competitors: `artistos.app`, `artistos.ai`.
- JSON-LD schemas implemented: Organization, WebSite, SoftwareApplication, FAQ.
- OG share image lives in `public/og-image.png`.
- Dynamic sitemap at `/sitemap.xml`, robots at `/robots.txt`.
- Google Search Console setup required post-deploy for indexing requests.

---

## Known Gotchas / Lessons Learned

| Date | Lesson |
|---|---|
| 2026-08-17 | `proxy.ts` not `middleware.ts` — tripped up every new agent session before this file existed. |
| 2026-08-16 | `next_billing_at` from Razorpay API must be fetched fresh on renewal webhooks — local DB value lags behind. |
| 2026-08-15 | `supabase migration repair` required before first `db push` on production env for historical migrations. |
| 2026-08-15 | Test User toggle in Admin must bypass ALL subscription checks in proxy + all API guards, not just one. |
| 2026-08-12 | Reports module: date filters should live in the top-level sub-header, not prop-drilled into each tab. |

---

## Environment Variables Reference

| Variable | Where Used |
|---|---|
| `JWT_SECRET` / `AUTH_SECRET` | `lib/auth/session.ts` — token signing |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase client |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase client |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | Razorpay SDK |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Client-side checkout |
| `RAZORPAY_WEBHOOK_SECRET` | Webhook HMAC verification |
| `CRON_SECRET` | GitHub Actions cron bearer token |
| `SESSION_MAX_AGE_SECONDS` | Cookie max-age (default 7 days) |
| `STORAGE_FREE_TIER_BYTES` | Portfolio quota free tier |
| `STORAGE_DEFAULT_SHARE_EXPIRY_DAYS` | Share link TTL |
