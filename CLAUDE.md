# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md
@RULES.md
@MEMORY.md

## What this is

ArtistOS — a booking/CRM app for freelance artists (e.g. mehndi/makeup studios) to manage customers, services, bookings, a calendar, a client-facing portfolio/gallery (with cloud file storage and shareable links), and payments (Razorpay). Next.js App Router + Supabase (Postgres) as the database, with fully custom (non-Supabase-Auth) phone/password authentication.

## ⚠️ Non-standard Next.js: read before touching routing/auth

This repo pins a Next.js version where **`middleware.ts` has been renamed to `proxy.ts`**, exporting a `proxy()` function instead of `middleware()` (see `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`). Route protection and login/signup redirects live in [proxy.ts](proxy.ts) at the project root. Don't create a `middleware.ts` — it won't run. If other APIs behave unexpectedly, check `node_modules/next/dist/docs/` for the current-version docs before assuming training-data behavior.

## Commands

```bash
pnpm dev       # start dev server (Next.js, Turbopack default)
pnpm build     # production build
pnpm start     # run production build
pnpm lint      # eslint (flat config, eslint-config-next)
```

No test runner is configured in this repo. Package manager is pnpm (see `packageManager` in package.json); `pnpm-lock.yaml` is gitignored, `package-lock.json` is committed instead — be aware both may exist locally.

## Architecture

**Auth is fully custom, not Supabase Auth.** Users authenticate with phone + SHA-256-hashed password against a `users` table (see `supabase/migrations/20240101000001_create_users_table.sql`). On login/signup (`app/api/auth/login/route.ts`, `signup/route.ts`), the API issues a self-signed, HMAC-SHA256 JWT-like token via `lib/auth/session.ts` (`createArtistToken`/`verifyArtistToken`, header.payload.signature, `{ id, phone, artist_name, studio_name, iat, exp }`, signed with `JWT_SECRET`/`AUTH_SECRET`) — there is no Supabase session and no external JWT library. The token is set as an HTTP-only `artist_session` cookie (7-day `SESSION_MAX_AGE_SECONDS`) and also returned in the JSON body so it can be sent as a `Bearer` header for non-cookie clients. `getArtistSession(request)` accepts either. `proxy.ts` decodes and checks the JWT's `exp` claim (not just cookie presence) to gate `/dashboard`, `/services`, `/customers`, `/bookings`, `/calendar`, `/portfolio`, `/profile`, and to bounce logged-in users away from `/`, `/login`, `/signup`.

**Supabase is used purely as a Postgres database + client**, not for its Auth/RLS-driven patterns. `lib/supabase/server.ts` (server components/route handlers, cookie-based SSR client) and `lib/supabase/client.ts` (browser client) both use the anon key. Schema lives in `supabase/migrations/*.sql` as plain, timestamp-prefixed SQL files applied **in filename order** via the **Supabase CLI** (`supabase db push` — see the Database migrations section of [README.md](README.md)). Earlier migrations were applied by hand in the SQL editor, so the remote history needs `supabase migration repair --status applied <version>` before the first push. Create new files with `supabase migration new <name>` rather than hand-naming them: the leading timestamp is the migration's identity and **must be unique** — duplicate versions break `db push`. Core tables: `users`, `customers`, `services`, `bookings`, `booking_services` (join table), booking add-ons (additional charges/discount, payments/expenses), plus a portfolio schema (folders, files, shares, storage plans/purchases — see the `..._create_portfolio_schema.sql` migration).

**Route structure**: `app/(dashboard)/` is a route group for authenticated pages (`bookings`, `calendar`, `customers`, `dashboard`, `portfolio`, `profile`, `services`), sharing `app/(dashboard)/layout.tsx` → `DashboardShell`. `app/api/**/route.ts` are the backing REST-ish endpoints, mostly matching the dashboard resources 1:1 (e.g. `app/api/bookings/[id]/payments`, `.../expenses`, `.../additional-charges`, `.../discount`, `.../services` for booking sub-resources; `app/api/portfolio/**` for folders/files/sharing/storage). `app/api/public/portfolio/shared/[uuid]` is an unauthenticated endpoint for shared-link viewers. `app/api/webhooks/razorpay` and `app/api/cron/portfolio/expire-shares` are server-to-server endpoints (no user session). Public/unauthenticated pages (`/`, `/login`, `/signup`) live outside the `(dashboard)` route group.

**Portfolio / file storage**: artists upload media (images/video/audio/docs, allow-listed by MIME in `lib/portfolio/config.ts`) into folders, organized under `lib/portfolio/{folders,files,quota,billing,response}.ts`. Files are stored in Cloudflare R2 via the S3-compatible SDK (`lib/r2/client.ts` — `getR2Client()`/`getR2BucketName()`, presigned upload/download URLs, `lib/r2/keys.ts`, `lib/r2/url.ts`), not Supabase Storage. Storage is quota-metered per artist (`STORAGE_FREE_TIER_BYTES` free tier, paid tiers via `storage_plans`); exceeding it requires a purchase. Folders can be shared externally via a UUID link with an expiry (`STORAGE_DEFAULT_SHARE_EXPIRY_DAYS`); `app/api/cron/portfolio/expire-shares` is a scheduled job that sweeps expired shares. `components/portfolio/` (uploader, file/folder grids, lightbox, share modal) and `components/storage/` (storage meter, plans modal) are the UI for this feature; a booking can also be tagged to portfolio items (`app/api/bookings/[id]/portfolio`, `components/portfolio/booking-portfolio-tab.tsx`).

**Payments (Razorpay)**: used to sell storage plan upgrades. `lib/razorpay/client.ts` wraps the `razorpay` SDK (`getRazorpayClient()`, `isRazorpayConfigured()`, requires `RAZORPAY_KEY_ID`/`RAZORPAY_KEY_SECRET`/`NEXT_PUBLIC_RAZORPAY_KEY_ID`). Purchase flow: `app/api/portfolio/purchase-storage` creates an order, the client completes checkout, `app/api/portfolio/purchase-storage/verify` and `app/api/webhooks/razorpay` (HMAC-signature-verified via `RAZORPAY_WEBHOOK_SECRET`) confirm payment and call `lib/portfolio/billing.ts#completePurchase` / `lib/portfolio/quota.ts#extendSubscriptionPeriod` to grant the upgraded quota — treat the webhook as the source of truth for payment state, not just the client-side verify call.

**Feature module pattern** under `components/common/<feature>/`: each core resource (bookings, customers, services) follows the same trio — a `*-manager.tsx` (client component: fetch/search/paginate/create/edit/delete, owns state), a `*-form.tsx` (create/edit form, opened in `AppModal`), a `*-card.tsx` (list item display), and a `*-types.ts` (shared TS types + an `empty*Form` default). When adding a new CRM-style resource, follow this same shape rather than inventing a new pattern; the portfolio feature (higher interaction complexity — uploads, drag/drop, sharing) instead lives in its own top-level `components/portfolio/` and `components/storage/` folders. `dashboard-header-context.tsx` provides a `HeaderPortal` so feature pages can inject content (search bars, actions) into the shared `DashboardTopbar`.

**Shared building blocks** in `components/common/shared/`: `AppModal`, `ConfirmDialog`, `AppLoader`, `DatePicker`, `TimePicker`, `FormDropdown`, etc. — reach for these instead of building new modal/dialog/dropdown primitives. `components/ui/` is the shadcn/ui layer (style `base-nova`, base color `neutral`, icon library `lucide`, no tailwind prefix) — see `components.json` for the shadcn config; use its CLI to add new primitives rather than hand-writing them.

## Project UI rules (from AGENTS.md, expanded)

- Prefer shadcn/ui for forms, cards, badges, avatars, separators, menus; use the shadcn chart pattern (`components/ui/chart.tsx`) for graphs, not hand-built SVG/div charts.
- All dropdowns/selectors/multi-selects/status pickers use the project's `DropdownMenu` family (`DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuCheckboxItem`, `DropdownMenuRadioGroup`/`Item`).
- Form field icons go *inside* the input border: relative wrapper, absolutely positioned icon, `pl-10` on the input — never an icon floating outside the input box.
- Extract repeated markup into `components/common/shared/` rather than duplicating it across feature folders.

## Plan mode: where plans go

Whenever a plan is written in plan mode for this repo, save a copy into `plans/` at the repo root (filename `YYYY-MM-DD-short-description.md`), in addition to the default harness plan-file location. This keeps implementation plans reviewable/diffable alongside the code they describe.

## GSD Instant Execution Mode

This repo uses a **GSD (Get Shit Done)** / **Ralph Loop** agentic workflow:

- **MEMORY.md** — living project memory (gotchas, arch truths, lessons learned). Read before every session. Update whenever you learn something new.
- **RULES.md** — non-negotiable coding standards and forbidden actions. Read before every session.
- **ralph-loop.sh** — autonomous multi-task loop. Spawns a fresh agent per task from `TODO.md`.
- **.coderabbit.yaml** — AI code review config for PRs (CodeRabbit app on GitHub).

**GSD instant execution** (small tasks):
1. Read MEMORY.md → check for known patterns.
2. Execute directly without a formal plan.
3. `pnpm lint` → fix errors → commit atomically.
4. Update MEMORY.md if you learned something new.

**GSD full mode** (complex / multi-file tasks):
1. Read MEMORY.md + RULES.md.
2. Write plan to `plans/YYYY-MM-DD-<slug>.md`.
3. Get approval, then execute.
4. Update MEMORY.md on completion.
