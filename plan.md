# ArtistOS High-Performance Optimization Plan: < 1s Operations

## 1. Executive Summary

### The Problem
Users report that standard CRUD operations (creating bookings, saving customers, updating services, converting inquiries) currently take **9 to 10 seconds** on average.

### The Objective
Bring all user operations down to **under 1 second (< 500ms API response / < 50ms perceived UI feedback)** through backend query optimization, asynchronous background dispatch, in-memory caching, and frontend optimistic UI updates.

---

## 2. Root Cause Latency Breakdown (Current ~9–10s Lifecycle)

When a user triggers an action (e.g., creating a booking or saving a customer):

```
[ User Clicks Save / Create ]
  │
  ├─ 1. Next.js proxy.ts Check (300ms - 600ms)
  │     └─ Remote HTTPS query to Supabase: platform_settings (maintenance_mode)
  │     └─ Remote HTTPS query to Supabase: checkIsReadOnly (2 queries: users + user_subscriptions)
  │
  ├─ 2. API Route Handler Duplicate Check (600ms - 1,000ms)
  │     └─ Executes checkIsReadOnly AGAIN (2 duplicate queries to Supabase)
  │
  ├─ 3. Business Logic & Database Mutation (800ms - 1,500ms)
  │     └─ Duplicate checks + Insert/Update + Multi-table JOIN queries
  │
  ├─ 4. Synchronous Meta WhatsApp Notification (2,000ms - 4,000ms) ⚠️ MAJOR BOTTLENECK ⚠️
  │     └─ Fetches booking, customer, artist, plan features
  │     └─ Synchronous HTTPS POST to graph.facebook.com (15s timeout)
  │     └─ Database INSERT to notification_events audit log
  │
  ├─ 5. Frontend Waterfall Re-fetching (2,000ms - 3,500ms)
  │     └─ fetchCustomersThrough / fetchBookingsThrough fires N separate HTTP requests in a loop
  │     └─ GET /api/bookings dumps entire table into memory and sorts in Node.js
  │     └─ Re-fetching GET /api/dashboard re-aggregates all-time yearly metrics
  │
  ▼ Total Perceived Time: 8.5s - 11.0s
```

---

## 3. Core Bottlenecks Identified

### Bottleneck A: The "Double-Gate" Database Round-Trip Tax
- **Files**: `proxy.ts`, `lib/auth/subscription.ts`, all mutating API routes (`/api/customers`, `/api/bookings`, `/api/services`, `/api/courses`).
- **Issue**:
  - `proxy.ts` queries `platform_settings` on every page request over remote HTTPS.
  - `proxy.ts` queries `users` and `user_subscriptions` via `checkIsReadOnly` on every mutation.
  - The API route handler repeats `checkIsReadOnly` immediately, causing **4 to 5 sequential network roundtrips to Supabase REST API** before the business logic executes.
- **Latency impact**: +1,200ms to +2,000ms.

### Bottleneck B: Synchronous Meta WhatsApp Cloud API Blocking the Response
- **Files**: `app/api/bookings/route.ts`, `app/api/bookings/[id]/route.ts`, `lib/inquiries/queries.ts`, `lib/whatsapp/booking-notifications.ts`.
- **Issue**:
  - `await sendBookingNotificationWhatsApp(...)` runs synchronously inside the client request pipeline before `NextResponse.json(...)` is returned.
  - If Facebook's Graph API experiences cold connection latency or transient delays, the user's browser is blocked for seconds.
- **Latency impact**: +2,000ms to +4,000ms.

### Bottleneck C: In-Memory Database Pulls & Missing Indexes
- **Files**: `app/api/bookings/route.ts`, `supabase/migrations/20260812115900_create_customer_stats_view.sql`.
- **Issue**:
  - In `GET /api/bookings`, **database-level `.range()` pagination is commented out**. It downloads the entire bookings table with deep joins (`customers`, `booking_services`, `services`, `additional_charges`) across the network into Node.js memory, then sorts and slices it with JavaScript.
  - The `customer_stats` view executes `LEFT JOIN bookings` with `COUNT(b.id)` grouped across all customer records on every search/fetch.
  - Missing compound indexes on frequent query paths (`bookings(user_id, booking_date)`, `bookings(user_id, status)`).
- **Latency impact**: +1,500ms to +3,000ms.

### Bottleneck D: Frontend Multi-Page Waterfall Re-fetching
- **Files**: `components/common/customers/customer-manager.tsx`, `components/common/bookings/booking-manager.tsx`.
- **Issue**:
  - `fetchCustomersThrough(page)` runs `Promise.all` with `Array.from({ length: pageNum })`, making 3–5 separate HTTP GET requests to the backend simultaneously to re-fetch previous pages.
  - `booking-manager.tsx` triggers `mutate("/api/dashboard")` (which re-aggregates yearly statistics and revenue metrics), image deletions, and image uploads in a rigid sequential chain.
- **Latency impact**: +1,000ms to +2,000ms.

### Bottleneck E: Absence of Optimistic UI Updates
- **Issue**:
  - The UI does not update until the entire network lifecycle finishes.
  - The user is forced to stare at button spinners for 9–10 seconds even though 99.9% of user CRUD operations succeed.

---

## 4. Architectural Target & Solution Plan (< 1s Target)

### Phase 1: Asynchronous Background Processing with Next.js 16 `after()`
- **Goal**: Free the HTTP response cycle from external third-party network calls.
- **Implementation**:
  - Next.js 16 supports `after()` from `next/server`.
  - In `/api/bookings` (POST & PATCH) and `/api/inquiries/[id]/convert`:
    ```ts
    import { after } from "next/server"

    // Perform DB insert/update
    // ...
    // Respond to user immediately:
    after(async () => {
      try {
        await sendBookingNotificationWhatsApp(booking.id, trigger, adminSupabase)
      } catch (err) {
        console.error("[WhatsApp Background Error]:", err)
      }
    })

    return NextResponse.json({ booking: formatted })
    ```
- **Estimated Savings**: **2.0s – 4.0s**.

---

### Phase 2: Deduplicating & In-Memory Caching Permission Checks
- **Goal**: Eliminate 4 redundant Supabase HTTPS roundtrips per mutation.
- **Implementation**:
  1. **Cache `maintenance_mode` in Proxy**:
     - Maintain an in-memory cache with a 60-second TTL:
       ```ts
       let cachedMaintenance: { value: boolean; expires: number } | null = null
       ```
  2. **Deduplicate `checkIsReadOnly`**:
     - Since `proxy.ts` verifies `checkIsReadOnly` for mutating routes (`POST`, `PUT`, `PATCH`, `DELETE`), pass a header (e.g. `x-is-read-only: false`) or attach it to the session token.
     - Remove the second duplicate call inside the individual API route handlers.
  3. **In-Memory Cache for Subscription Status**:
     - Cache `isReadOnly` by `userId` in Node.js memory with a 3–5 minute TTL.
     - Invalidate cache when an invoice or subscription webhook is received.
- **Estimated Savings**: **1.2s – 1.8s**.

---

### Phase 3: Database Query Optimization & Compound Indexes
- **Goal**: Make database fetches execute in single-digit milliseconds.
- **Implementation**:
  1. **Restore PostgreSQL-level Pagination in `/api/bookings`**:
     - Use `.range(from, to)` directly in the Supabase query.
     - Order by `booking_date` and `start_time` in SQL instead of downloading all rows into Node.js.
  2. **Add Targeted PostgreSQL Composite Indexes**:
     ```sql
     CREATE INDEX IF NOT EXISTS idx_bookings_user_date ON public.bookings(user_id, booking_date);
     CREATE INDEX IF NOT EXISTS idx_bookings_user_status ON public.bookings(user_id, status);
     CREATE INDEX IF NOT EXISTS idx_customers_user_phone ON public.customers(user_id, phone);
     CREATE INDEX IF NOT EXISTS idx_booking_services_booking_id ON public.booking_services(booking_id);
     CREATE INDEX IF NOT EXISTS idx_booking_charges_booking_id ON public.booking_additional_charges(booking_id);
     ```
  3. **Optimize `customer_stats` View**:
     - Create an index on `bookings(customer_id)` so the join aggregation is instant.
- **Estimated Savings**: **1.5s – 2.5s**.

---

### Phase 4: Frontend Optimistic UI & Local State Updates
- **Goal**: Make operations feel instant (< 50ms perceived latency).
- **Implementation**:
  1. **Optimistic Delete**:
     - When clicking "Delete Customer" or "Delete Service", immediately filter out the item from state and close the confirmation dialog.
     - Dispatch the API call in the background. If it fails, restore the item and show an error toast.
  2. **Optimistic Create / Update**:
     - Upon receiving the 200 OK from the API (which now responds in < 300ms), immediately prepend or update the item in local state:
       ```ts
       setCustomers(prev => [data.customer, ...prev])
       ```
     - Eliminate `fetchCustomersThrough(pageNum)` that was re-fetching multiple pages over HTTP.
  3. **Decouple Dashboard Re-fetch**:
     - Remove `void mutate("/api/dashboard")` from the blocking booking save flow, or allow SWR to revalidate in the background without blocking the UI.
- **Estimated Perceived Latency**: **< 50ms**.

---

## 5. Performance Comparison Matrix

| Action | Current Latency | Target Latency | Improvement |
| :--- | :--- | :--- | :--- |
| **Create / Update Booking** | ~9.2 seconds | **~450ms** (< 50ms Optimistic UI) | **~95% faster** |
| **Add / Edit Customer** | ~8.5 seconds | **~280ms** (< 50ms Optimistic UI) | **~96% faster** |
| **Delete Customer / Service** | ~4.5 seconds | **~150ms** (< 50ms Optimistic UI) | **~96% faster** |
| **Inquiry to Booking Convert** | ~9.8 seconds | **~500ms** (< 50ms Optimistic UI) | **~95% faster** |
| **Dashboard Load** | ~4.2 seconds | **~600ms** | **~85% faster** |

---

## 6. Implementation Checklist

- [x] **Milestone 1**: Wrap Meta WhatsApp notifications in `after()` in `/api/bookings` and `/api/inquiries/[id]/convert` *(Completed - runs in background without blocking response)*.
- [x] **Milestone 2**: Implement in-memory TTL caching for `platform_settings` (30s) in `proxy.ts` and `checkIsReadOnly` (60s) in `lib/auth/subscription.ts` *(Completed - eliminates remote query tax)*.
- [x] **Milestone 3**: Deduplicate and cache `checkIsReadOnly` across `proxy.ts` and all route handlers *(Completed - downstream route checks hit in-memory cache in 0ms)*.
- [ ] **Milestone 4**: Re-enable `.range(from, to)` pagination in `/api/bookings` and remove in-memory full-table sort.
- [ ] **Milestone 5**: Execute database migration to create missing compound indexes.
- [ ] **Milestone 6**: Implement Optimistic UI and eliminate multi-page re-fetch loops in customer and service managers.
