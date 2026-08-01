# Web Push notifications for artists — notification queue + booking reminders

> Supersedes [2026-07-23-web-push-booking-reminders.md](2026-07-23-web-push-booking-reminders.md).

## Context

ArtistOS is a booking CRM PWA for freelance artists. The artist wants a real, OS-level push notification on their own device — not a message to the customer. The first concrete use case: **remind the artist about an upcoming booking before it starts.**

Nothing from this feature exists in the repo yet (verified 2026-08-01): no `lib/push/`, no `app/api/push/`, no `web-push` dependency, and `public/sw.js` has no `push`/`notificationclick` listeners. The only cron-shaped endpoint, `app/api/cron/portfolio/expire-shares/route.ts`, is a `GET` gated by `Bearer <CRON_SECRET>` with **no scheduler actually wired to call it** (there is no `vercel.json`) — that route is the auth pattern to copy, not proof that scheduling works today.

Customers have no login/session in this app; only artists do (`getArtistSession` in `lib/auth/session.ts`), which is what makes this tractable — the artist already has an authenticated, installable PWA session to subscribe from.

**Two decisions shape this plan:**

1. **A notification queue, not a per-feature sender.** Following the pattern already in use in another project: many producers (booking reminders now; super-admin broadcasts, server events, other features later) insert rows into `notification_events`, and a **dispatcher cron drains the table and sends to whoever the row names.** The dispatcher knows nothing about bookings. Only booking reminders ship here, but nothing else should need a schema change to join.

2. **A "Send test notification" button** beside the enable toggle, visible only while notifications are on. Push setup fails silently and per-device (permission revoked, subscription expired, iOS PWA not installed), so without it the artist can't confirm anything until a real booking comes due. It pushes **only to the device it was tapped from** — a silent phone then unambiguously means *that phone* is broken.

**Outcome:** artist opens Profile → toggles "Enable notifications" once per device → subscription stored against their `user_id` → taps "Send test notification" and the device buzzes immediately. Separately, a scanner enqueues reminders for upcoming bookings and the dispatcher delivers them shortly before `start_time`; tapping one opens the booking detail page (`app/(dashboard)/bookings/[id]` — exists).

## Approach

### 1. Schema — two migrations

Timestamp-prefixed to sort after the current latest, `20260731000001_add_image_to_campaigns.sql`. Applied via `supabase db push` (see README). Timestamps must be unique — use `supabase migration new`.

**`supabase/migrations/20260801183000_create_push_subscriptions_table.sql`** — the transport registry:

`push_subscriptions(id bigint identity pk, user_id bigint not null references users(id) on delete cascade, endpoint text not null unique, p256dh text not null, auth text not null, created_at, updated_at)`, index on `user_id`. Mirror the style of `20240101000005_create_booking_payments_and_expenses_tables.sql`.

**`supabase/migrations/20260801183001_create_notification_events_table.sql`** — the queue:

```sql
create table if not exists public.notification_events (
  id bigint generated always as identity primary key,
  user_id bigint not null references public.users(id) on delete cascade,
  channel text not null default 'push',       -- 'push' today; whatsapp/email later
  event_type text not null,                   -- 'booking_reminder' | 'test' | future types
  entity_type text,                           -- 'booking'; null for non-entity events
  entity_id bigint,                           -- booking id; null for test/broadcast
  title text not null,
  body text not null,
  url text,
  status text not null default 'pending',     -- pending | sent | failed | cancelled
  attempts integer not null default 0,
  devices_sent integer not null default 0,
  last_error text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- one live event per (user, type, entity); partial so test/broadcast rows never collide
create unique index if not exists notification_events_dedupe_idx
  on public.notification_events (user_id, event_type, entity_type, entity_id)
  where entity_id is not null;

-- the dispatcher's hot path: everything pending is ready to send
create index if not exists notification_events_pending_idx
  on public.notification_events (created_at)
  where status = 'pending';

create index if not exists notification_events_user_created_idx
  on public.notification_events (user_id, created_at desc);
```

Notes on the shape:

- `channel` costs nothing now and means the WhatsApp broadcast feature already in this repo (`20260727131900_create_whatsapp_broadcast_schema.sql`) could route through the same queue later rather than growing a parallel one.
- The dedupe index is **partial** (`where entity_id is not null`) so it's explicit rather than leaning on Postgres' NULL-distinct semantics. Test sends and future broadcasts have no `entity_id` and are exempt; booking reminders dedupe hard.
- `attempts` + `last_error` are what make this a queue rather than a log — a transient push-service failure gets retried instead of silently lost.

### 2. Dependencies & env

- `pnpm add web-push` + `pnpm add -D @types/web-push`.
- New env vars (values from `npx web-push generate-vapid-keys`): `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (e.g. `mailto:support@…`), `NEXT_PUBLIC_VAPID_PUBLIC_KEY` (same public key, client-exposed for `pushManager.subscribe`), `BOOKING_REMINDER_MINUTES_BEFORE` (default 60), `NOTIFICATION_MAX_ATTEMPTS` (default 3). Reuse the existing `CRON_SECRET`.

### 3. `lib/push/` — transport only

Same shape as `lib/razorpay/` and `lib/r2/`. This layer knows about devices and VAPID; it knows nothing about queues or bookings.

- `config.ts` — reads the VAPID env values, `isPushConfigured()` (mirrors `isRazorpayConfigured()`).
- `client.ts` — `getWebPushClient()`: singleton calling `webpush.setVapidDetails(...)` once (mirrors `getR2Client()`/`getRazorpayClient()`).
- `subscriptions.ts` — `saveSubscription(supabase, userId, sub)` (upsert on `endpoint`), `removeSubscription(supabase, endpoint)`, `getSubscriptionsForUser(supabase, userId)`, `getSubscription(supabase, userId, endpoint)` (used by the test route to prove the endpoint belongs to the caller).
- `send.ts` — two exports:
  - `sendPushToSubscription(supabase, subRow, payload)` — single send; on `404`/`410` from the push service, delete the stale row via `removeSubscription` and return a `"gone"` result rather than throwing.
  - `sendPushToUser(supabase, userId, payload)` → `{ sent, removed }` — maps the user's subscriptions through the above.

### 4. `lib/notifications/` — the queue

- `events.ts`:
  - `enqueueEvent(supabase, { userId, eventType, entityType, entityId, title, body, url })` — insert with `on conflict do nothing` against the dedupe index. Returns the row, or `null` when one already existed. Inserting **means "send this now"**; there is no future-dating.
  - `cancelPendingEvents(supabase, { eventType, entityType, entityIds })` — bulk-set `status='cancelled'`. Not used by the booking scanner (see below), kept for future producers that enqueue ahead of time.
  - `claimPendingEvents(supabase, limit)` — `select … where status='pending' and attempts < NOTIFICATION_MAX_ATTEMPTS order by created_at limit N`. No time gate: presence in the table *is* readiness.
  - `markSent(supabase, id, devicesSent)` / `markFailed(supabase, id, error)` — the latter increments `attempts` and only flips `status` to `'failed'` once `attempts >= NOTIFICATION_MAX_ATTEMPTS`, otherwise leaves it `pending` for the next pass.
  - `logSentEvent(...)` — insert an already-`sent` row for things delivered outside the queue (the test button).
- `producers/bookings.ts` — `scanBookingReminders(supabase)`, the only booking-aware piece:
  Find bookings with `status in ('pending','confirmed')` whose **reminder moment has already arrived and which have not yet started**, and which have no `booking_reminder` event yet → `enqueueEvent` each. The row is immediately sendable.

  ```
  now() >= (booking_date + start_time) − BOOKING_REMINDER_MINUTES_BEFORE
  now() <  (booking_date + start_time)
  ```

  **The `now() >= …` form is load-bearing.** Expressed as an overdue-tolerant condition rather than a narrow "due in the next N minutes" window, a missed scanner run makes a reminder *late* rather than silently *lost* — the booking still matches on the following pass. This is what replaces the safety that `scheduled_for` previously provided.

  Consequences of enqueuing at the last moment: reschedules need no sync (moving a booking simply changes when it becomes eligible), and cancellations need no sweep (a booking cancelled before its reminder moment is never scanned). The dedupe index still matters — it keeps re-runs safe when dispatch is lagging — but it no longer does routine work. Uses `date-fns`, already a dependency; mirrors the shape of `lib/portfolio/folders.ts#expireShares`.

### 5. API routes

**Artist-facing** (`getArtistSession(request)`, 401 if missing):

- `app/api/push/subscribe/route.ts` — `POST`, body `{ endpoint, keys: { p256dh, auth } }` → `saveSubscription`.
- `app/api/push/unsubscribe/route.ts` — `POST`, body `{ endpoint }` → `removeSubscription`.
- `app/api/push/test/route.ts` — `POST`, body `{ endpoint }`:
  1. `getSubscription(supabase, session.id, endpoint)` — 404 if not found **or owned by another user**. This ownership check is what stops the route being a push-to-anyone endpoint.
  2. `sendPushToSubscription(...)` with `{ title: "ArtistOS", body: "Test notification — push is working on this device.", url: "/profile" }`.
  3. `logSentEvent(...)` with `event_type: 'test'`, null `entity_type`/`entity_id`.
  4. `{ status: true }`, or a 410-shaped JSON error when the send came back `"gone"` so the UI can tell the artist to re-enable the toggle.

  **The test button deliberately bypasses the queue** and sends inline — routing it through the dispatcher would make the artist wait a cron tick for feedback, defeating the point.

**Cron** (both `GET`, both using the `Bearer CRON_SECRET` check copied from `expire-shares/route.ts`):

- `app/api/cron/notifications/scan-bookings/route.ts` — the producer. Calls `scanBookingReminders`, returns `{ enqueued, cancelled }`.
- `app/api/cron/notifications/dispatch/route.ts` — the dispatcher, and **the only thing that sends**. For each row from `claimPendingEvents(50)`: `sendPushToUser(row.user_id, { title, body, url })` → `markSent(row.id, sent)` when `sent > 0`, else `markFailed(row.id, …)`. Returns `{ processed, sent, failed }`. It reads only `notification_events` — it never touches `bookings`, which is what lets any future producer reuse it unchanged.

### 6. Service worker — `public/sw.js`

Append to the existing cache logic (do **not** replace it):

```js
self.addEventListener("push", (event) => {
  const data = event.data?.json() ?? {}
  event.waitUntil(
    self.registration.showNotification(data.title || "ArtistOS", {
      body: data.body,
      icon: "/icons/icon-192x192.png",
      data: { url: data.url },
    })
  )
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  event.waitUntil(self.clients.openWindow(event.notification.data?.url || "/dashboard"))
})
```

One handler serves reminders and test sends alike — no special-casing.

### 7. Subscribe UI + test button

New `components/common/pwa/push-notification-toggle.tsx`, sibling to `pwa-install-prompt.tsx` (which already registers `/sw.js`, so registration is not duplicated here):

- **On mount:** read `Notification.permission` and `navigator.serviceWorker.ready.then(r => r.pushManager.getSubscription())`. Hold the resolved `PushSubscription` in state — its `.endpoint` is what the test button posts.
- **Enable:** request permission → `pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: <base64url-decoded NEXT_PUBLIC_VAPID_PUBLIC_KEY> })` → `POST /api/push/subscribe`.
- **Disable:** `subscription.unsubscribe()` → `POST /api/push/unsubscribe`.
- **Test button:** rendered only when `enabled && subscription !== null`; `POST /api/push/test` with `{ endpoint }`; spinner + disabled while in flight. `toast.success("Test notification sent")` / `toast.error(...)` from `sonner` — already a dependency with `<Toaster />` mounted in `app/layout.tsx`, same as `app/(dashboard)/profile/whatsapp/page.tsx`.
- **Components:** `components/ui/switch.tsx` for the toggle, `components/ui/button.tsx` (`variant="outline"`, `className="rounded-2xl"`) for the test button — matching the Storage card's Upgrade button.
- **Unsupported/blocked states:** disabled toggle + hint when `!("Notification" in window)` or `!("PushManager" in window)`; a "re-enable in browser settings" hint when `Notification.permission === "denied"`; and an iOS note that the PWA must be installed to the home screen before push works at all, reusing the `isIos()`/`isStandalone()` detection style already in `pwa-install-prompt.tsx`.

Then add a "Notifications" `Card` to `app/(dashboard)/profile/page.tsx` after the Storage card, copying that card's exact classes (`rounded-[1.75rem] border-slate-100 bg-white/90 shadow-md shadow-purple-950/5`) and its `CardHeader`/`CardTitle`/`CardDescription` structure. Toggle and test button share the `CardContent` row.

### 8. Scheduling

No scheduler exists in this repo today — the existing portfolio cron has never been called by anything. Add `vercel.json`:

- `/api/cron/notifications/scan-bookings` — every 5 minutes.
- `/api/cron/notifications/dispatch` — every 2 minutes.

Because a row is sendable the moment it exists, **the scanner's interval now sets delivery precision** (at 5 min, a 60-minute reminder lands 55–60 min before the booking) and the two latencies stack — worst case ≈ scanner interval + dispatcher interval. Running the dispatcher tighter than the scanner keeps that total near the scanner's interval alone. Worth knowing before deploying: **Vercel's Hobby plan only permits daily crons** — minute-level scheduling needs Pro, or an external scheduler (GitHub Actions cron, cron-job.org) hitting the same URLs with the `Bearer CRON_SECRET` header, which works identically. If the deployment target caps the number of cron entries, the two routes can be driven by a single scheduler entry calling them in sequence.

The test button is independent of all of this — it verifies the full push path before any scheduler exists.

### 9. Scope boundaries

**Ships:** push subscriptions, the toggle, the test button, the generic `notification_events` queue, the dispatcher, and one producer emitting a single pre-start booking reminder per booking.

**Deliberately not built, but the table supports each with no schema change** — a new `event_type` plus a producer:

- Super-admin broadcast (`app/admin/` already exists) — insert one row per target artist; the dispatcher needs no changes.
- Booking cancelled / rescheduled notices. Today a booking cancelled *after* its reminder was delivered still leaves the artist expecting a client — the scanner only cancels rows still `pending`.
- A second reminder offset (`booking_reminder_24h` alongside `booking_reminder`), payment alerts, daily agenda.

**Also unresolved, to settle at implementation time:** the exact reminder copy (proposed — title `"Upcoming booking"`, body `"{customer} at {time} — {service}"`), and that `BOOKING_REMINDER_MINUTES_BEFORE` is one global value, so an artist can't want 2 hours' notice for a bridal booking and 30 minutes for a quick appointment.

## Verification

1. `npx web-push generate-vapid-keys`, populate the new env vars, apply both migrations with `supabase db push`.
2. `pnpm add web-push && pnpm add -D @types/web-push`, then `pnpm dev`.
3. Log in as an artist → Profile → toggle "Enable notifications" → accept the browser prompt. Confirm a `push_subscriptions` row appears and the "Send test notification" button becomes visible.
4. Tap **Send test notification** — an OS notification arrives within a second or two, a success toast shows, tapping it opens `/profile`, and a `notification_events` row exists with `event_type='test'`, `status='sent'`, `entity_id` null.
5. Tap it several more times — confirm each logs a new row (the partial unique index must not block repeat tests).
6. Toggle notifications off — the test button disappears and the `push_subscriptions` row is deleted.
7. Create a booking starting inside the reminder window, then `curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/notifications/scan-bookings` — confirm a `pending` row appears **and that no notification has been sent yet**. This is the key proof that producer and dispatcher are separate.
8. `curl … /api/cron/notifications/dispatch` — the notification arrives, tapping it opens the booking detail page, and the row flips to `status='sent'` with `devices_sent` matching the number of subscribed devices.
9. Re-run both crons — no duplicate notification, still exactly one row for that booking.
10. **Not-yet-due test:** create a booking starting *outside* the reminder window (e.g. 3 hours out) and run the scanner — confirm **no** row is created. Nothing should enter the table before its moment.
11. **Overdue-tolerance test:** create a booking whose reminder moment passed a while ago but which hasn't started yet — confirm the scanner still enqueues it (late, not lost).
12. **Multi-device:** subscribe a second device, dispatch a reminder — both buzz and `devices_sent = 2`. Then tap the test button on one device and confirm the other stays silent.
13. **Stale subscription:** revoke notification permission in browser settings, tap the test button — confirm the stale row is deleted and the UI shows a "re-enable notifications" error, not a 500.
14. **Retry:** temporarily point `VAPID_PRIVATE_KEY` at a bad value and dispatch — confirm `attempts` increments and `status` stays `pending` until `NOTIFICATION_MAX_ATTEMPTS`, then flips to `failed`.
15. **Ownership:** log in as a second artist and `POST /api/push/test` with the first artist's endpoint — expect 404.
16. `pnpm lint` and `pnpm build` pass.
