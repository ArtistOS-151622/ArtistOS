# RULES.md — ArtistOS Agent Rules

> **Every AI agent working in this repo MUST read and follow all rules below before writing a single line of code.**
> These rules take precedence over general training-data defaults.

---

## 0 · Read First

- Read `CLAUDE.md` (or `AGENTS.md`) before touching any file — it contains the full architecture overview, non-standard Next.js details, auth design, and project patterns.
- Read `MEMORY.md` for accumulated lessons and known gotchas before starting any task.
- When in doubt, read `node_modules/next/dist/docs/` — this repo pins a non-standard Next.js version.

---

## 1 · Non-Negotiable Constraints

| Rule | Detail |
|---|---|
| **No `middleware.ts`** | This repo uses `proxy.ts` (exports `proxy()`, not `middleware()`). Never create `middleware.ts`. |
| **Package manager: pnpm** | Use `pnpm add`, never `npm install` or `yarn add`. |
| **No Supabase Auth** | Auth is fully custom (phone + SHA-256 + HMAC JWT in `lib/auth/session.ts`). Never call Supabase auth methods. |
| **No ad-hoc SQL** | New schema changes go in `supabase/migrations/` via `supabase migration new <name>`. Never hand-edit migration timestamps. |
| **No test runner** | No Jest/Vitest is configured. Don't add test files or imports that require a test runner. |
| **shadcn/ui first** | Before building any UI primitive, check if a shadcn component exists. Use the shadcn CLI to add new ones. |
| **Atomic git commits** | Each logical unit of work gets its own commit with a clear message. |

---

## 2 · Code Style

- **TypeScript strict mode** — no `any` unless absolutely unavoidable (add a comment explaining why).
- **Imports** — use path aliases (`@/lib/...`, `@/components/...`), not relative `../../` chains.
- **Server vs. Client** — Route handlers and server components use `lib/supabase/server.ts`; browser components use `lib/supabase/client.ts`.
- **Error handling** — all API routes must return structured JSON `{ error: string }` on failure with the correct HTTP status code.
- **Environment variables** — never hard-code secrets. Use `process.env.VAR_NAME` and document new vars in `.env.local.example` if one exists.
- **No console.log in production paths** — use structured error objects instead.

---

## 3 · UI / Component Rules

- Use **shadcn/ui** for forms, cards, badges, avatars, separators, menus, dialogs, and charts.
- Use the project's **`DropdownMenu` family** for all dropdowns — `DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuCheckboxItem`, `DropdownMenuRadioGroup`/`DropdownMenuRadioItem`.
- Form field icons go **inside** the input border: relative wrapper → absolutely positioned icon → `pl-10` on `<input>`.
- Repeated markup → extract into `components/common/shared/`, don't duplicate.
- New CRM-style resources → follow the **manager / form / card / types** quad pattern in `components/common/<feature>/`.
- Charts → use `components/ui/chart.tsx` (shadcn chart pattern), not hand-built SVG/div.

---

## 4 · Architecture Patterns

- **Feature module pattern**: `*-manager.tsx` · `*-form.tsx` · `*-card.tsx` · `*-types.ts`
- **Shared primitives**: `AppModal`, `ConfirmDialog`, `AppLoader`, `DatePicker`, `TimePicker`, `FormDropdown` — use these, don't reinvent them.
- **Header injection**: use `HeaderPortal` from `dashboard-header-context.tsx` to push content into the topbar.
- **Payments**: webhook (`app/api/webhooks/razorpay`) is the source of truth for payment state, not the client-side verify call.
- **File storage**: Cloudflare R2 via `lib/r2/` — never Supabase Storage.

---

## 5 · Planning & Execution Workflow (GSD Instant Execution Mode)

When a task arrives:

1. **Check MEMORY.md** — has this pattern been solved before?
2. **If complex (>2 files or architectural)** — write a plan to `plans/YYYY-MM-DD-<slug>.md` before coding.
3. **If simple/instant** — execute directly, then update `MEMORY.md` with any new learnings.
4. **On completion** — commit atomically with a descriptive message.
5. **Never** leave the repo in a broken build state (run `pnpm lint` before finishing).

---

## 6 · Forbidden Actions

- ❌ `npm install` / `yarn add` — use `pnpm`
- ❌ Creating `middleware.ts`
- ❌ Calling Supabase Auth APIs
- ❌ Hand-naming migration files (use `supabase migration new`)
- ❌ Committing `.env.local` or any secrets
- ❌ `console.log` in route handlers or lib code
- ❌ Inline styles or Tailwind `style={}` props (use Tailwind classes)
- ❌ Hardcoded user IDs, plan IDs, or magic strings without a named constant
