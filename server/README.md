# ArtistOS API

Express 5 REST API for ArtistOS, plain JavaScript (ESM, no build step). It replaces the Next.js
route handlers in `app/api/**`; see `../plans/2026-11-16-express-backend-migration.md`.

## Run locally

```bash
cd server
pnpm install
cp .env.example .env   # fill in JWT_SECRET (same value as the Next app's .env.local)
pnpm dev               # http://localhost:4000, restarts on file changes
```

| Script | What it does |
|---|---|
| `pnpm dev` | `node --watch` with `.env` loaded, pretty logs |
| `pnpm start` | production start (`node src/server.js`) |
| `pnpm test` | `node:test` suite in `tests/` |
| `pnpm lint` | ESLint (`@eslint/js` + `eslint-plugin-n`) |

Requires Node 22.18+ (see `.nvmrc`). This folder is its own pnpm workspace with its own
`pnpm-lock.yaml`, independent of the Next.js app at the repo root.

## Structure

```
src/
  server.js        entry: start HTTP server, graceful shutdown
  app.js           middleware pipeline, routers, 404, error handler
  config/          env.js (validated env), cors.js, constants.js
  routes/index.js  mounts module routers under /api
  modules/<name>/  <name>.routes.js → .controller.js → .service.js, .validation.js
  middlewares/     auth, read-only gate, cron, validation, rate limits, errors
  integrations/    third-party clients only (Supabase, R2, Razorpay, WhatsApp, push)
  shared/          code used by 2+ modules
  utils/           framework plumbing (errors, tokens, cookies, logger, background tasks)
tests/             mirrors src/
```

## Conventions

- **Imports** use `#src/...` (the `imports` field in `package.json`), never `../../..`.
- **Layers:** routes → controller → service. Only controllers touch `req`/`res`. Services take
  plain arguments and throw `ApiError` (`src/utils/api-error.js`). Modules never import another
  module's routes or controller; calling another module's service is fine.
- **Validation:** input is checked by `<name>.validation.js`: either zod schemas applied with
  `validate({ body, query, params })` (controllers read `req.validated.query` / `.params`, since
  Express 5's `req.query` is read-only), or, where user-facing messages depend on check
  order (ported routes), plain functions returning `{ data }` or `{ error }`. In zod 4 a
  transformed key must be `z.unknown().optional().transform(...)`, or a missing key fails.
- **Envelope routes:** portfolio-style endpoints answer `{ status, message, data }`. Use
  `sendPortfolio()` / `portfolioError()` from `shared/portfolio/response.js` and mount
  `useEnvelopeErrors` so every error on that router (including 401s) uses the envelope.
- **Errors:** every failure response is `{ error: string }` (plus `code` when useful) with the
  right status. Express 5 forwards rejected promises from async handlers to the error handler,
  so no async wrapper is needed.
- **Logging:** `req.log` inside a request, otherwise `logger` from `src/utils/logger.js`.
  Never `console.*` (lint error).
- **Background work** after responding: `runInBackground(label, fn)`. It's awaited on shutdown.
- **Auth:** `requireArtist` → `req.artist`, `requireAdmin` → `req.admin`, `requireCron`.
  Session tokens must stay byte-compatible with `lib/auth/session.ts` in the Next app;
  `tests/utils/session-token.test.js` enforces it.

## Deploy (Render)

Defined in `../render.yaml`: web service, root dir `server`, `pnpm install --frozen-lockfile --prod`,
start `node src/server.js`, health check `/health`, custom domain `api.artistos.in`.
Use the Starter plan or above (the free plan sleeps). Set every variable from `.env.example`
in the Render dashboard; production requires `COOKIE_DOMAIN=.artistos.in` and
`FRONTEND_ORIGINS=https://www.artistos.in`.
