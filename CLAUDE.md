# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## What this is

ArtistOS — a booking/CRM app for freelance artists (e.g. mehndi/makeup studios) to manage customers, services, bookings, and a calendar. Next.js App Router + Supabase (Postgres) as the database, with fully custom (non-Supabase-Auth) phone/password authentication.

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

**Auth is fully custom, not Supabase Auth.** Users authenticate with phone + SHA-256-hashed password against a `users` table (see `supabase/users.sql`). On login/signup (`app/api/auth/login/route.ts`, `signup/route.ts`), the API sets an HTTP-only `artist_session` cookie containing a JSON blob (`{ id, phone, artist_name, studio_name }`) — there is no JWT/Supabase session involved. `lib/auth/session.ts#getArtistSession` reads and validates that cookie shape server-side. `proxy.ts` checks only for the *presence* of the cookie to gate `/dashboard`, `/services`, `/customers`, `/bookings`, `/calendar`, `/profile` and to bounce logged-in users away from `/`, `/login`, `/signup`.

**Supabase is used purely as a Postgres database + client**, not for its Auth/RLS-driven patterns. `lib/supabase/server.ts` (server components/route handlers, cookie-based SSR client) and `lib/supabase/client.ts` (browser client) both use the anon key. Schema lives in `supabase/*.sql` as plain, hand-maintained SQL files (no migration tool) — apply them manually in the Supabase SQL editor **in filename order** (they're numbered `001_`–`007_` to reflect FK dependency order; give any new schema file the next number). Core tables: `users`, `customers`, `services`, `bookings`, `booking_services` (join table), plus booking add-ons (additional charges/discount, payments/expenses, and a later `booking_services` quantity/unit_price update).

**Route structure**: `app/(dashboard)/` is a route group for authenticated pages (`bookings`, `calendar`, `customers`, `dashboard`, `profile`, `services`), sharing `app/(dashboard)/layout.tsx` → `DashboardShell`. `app/api/**/route.ts` are the backing REST-ish endpoints (mostly matching the dashboard resources 1:1, e.g. `app/api/bookings/[id]/payments`, `.../expenses`, `.../additional-charges`, `.../discount`, `.../services` for booking sub-resources). Public/unauthenticated pages (`/`, `/login`, `/signup`) live outside that group.

**Feature module pattern** under `components/common/<feature>/`: each resource (bookings, customers, services) follows the same trio — a `*-manager.tsx` (client component: fetch/search/paginate/create/edit/delete, owns state), a `*-form.tsx` (create/edit form, opened in `AppModal`), a `*-card.tsx` (list item display), and a `*-types.ts` (shared TS types + an `empty*Form` default). When adding a new resource, follow this same shape rather than inventing a new pattern. `dashboard-header-context.tsx` provides a `HeaderPortal` so feature pages can inject content (search bars, actions) into the shared `DashboardTopbar`.

**Shared building blocks** in `components/common/shared/`: `AppModal`, `ConfirmDialog`, `AppLoader`, `DatePicker`, `TimePicker`, `FormDropdown`, etc. — reach for these instead of building new modal/dialog/dropdown primitives. `components/ui/` is the shadcn/ui layer (style `base-nova`, base color `neutral`, icon library `lucide`, no tailwind prefix) — see `components.json` for the shadcn config; use its CLI to add new primitives rather than hand-writing them.

## Project UI rules (from AGENTS.md, expanded)

- Prefer shadcn/ui for forms, cards, badges, avatars, separators, menus; use the shadcn chart pattern (`components/ui/chart.tsx`) for graphs, not hand-built SVG/div charts.
- All dropdowns/selectors/multi-selects/status pickers use the project's `DropdownMenu` family (`DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuCheckboxItem`, `DropdownMenuRadioGroup`/`Item`).
- Form field icons go *inside* the input border: relative wrapper, absolutely positioned icon, `pl-10` on the input — never an icon floating outside the input box.
- Extract repeated markup into `components/common/shared/` rather than duplicating it across feature folders.
