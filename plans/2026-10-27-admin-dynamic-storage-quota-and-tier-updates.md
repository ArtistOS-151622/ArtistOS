# Admin Dynamic Storage Quota & Plan Tier Quota Updates Implementation Plan

## 1. Overview & Objectives

This update provides **two core capabilities**:
1. **Admin Dynamic Storage Override (Per User)**:
   - Admins can assign custom storage quotas to any user at any time directly from the Admin Users panel.
   - The admin inputs the quota in **GB format** (e.g. `1` GB, `2.5` GB, `5` GB, or `0.5` GB for 500 MB).
   - This custom quota is sticky and will **not** be overwritten or downgraded by automatic plan synchronization or billing checks.
   - Admin can also choose to reset the user back to their plan's default quota at any time.

2. **Updated Default Storage Quotas by Plan Tier**:
   - **Free Trial**: `10 MB` (`10 * 1024 * 1024` bytes = `10,485,760` bytes)
   - **Starter Plan** (Monthly & Yearly): `100 MB` (`100 * 1024 * 1024` bytes = `104,857,600` bytes) — *previously 10 MB*
   - **Pro Plan** (Monthly & Yearly): `500 MB` (`500 * 1024 * 1024` bytes = `524,288,000` bytes) — *previously 100 MB*
   - **Free User (`is_free_user = true`)**: Receives Pro-tier storage = `500 MB` (unless an admin assigns a custom dynamic override).

---

## 2. Technical Architecture & Database Schema

### A. Database Changes (`supabase/migrations/20261027000000_admin_custom_storage_quota.sql`)

1. **Add `custom_storage_bytes` Column to `users` Table**:
   ```sql
   ALTER TABLE public.users 
   ADD COLUMN IF NOT EXISTS custom_storage_bytes bigint DEFAULT NULL;
   ```
   * When `custom_storage_bytes IS NULL`: User follows their active subscription plan default quota (or trial/free default).
   * When `custom_storage_bytes IS NOT NULL`: User is granted this exact custom storage byte count, overriding all plan tiers.

2. **Update Default Storage in `platform_subscriptions` Table**:
   ```sql
   -- Update Starter plans (Monthly & Yearly) to 100 MB
   UPDATE public.platform_subscriptions
   SET storage_quota_mb = 100
   WHERE name ILIKE '%Starter%';

   -- Update Pro plans (Monthly & Yearly) to 500 MB
   UPDATE public.platform_subscriptions
   SET storage_quota_mb = 500
   WHERE name ILIKE '%Pro%';
   ```

---

## 3. Component & Service Changes

### A. Core Quota & Plan Features (`lib/auth/plan-features.ts` & `lib/portfolio/quota.ts`)

1. **`lib/auth/plan-features.ts` Constants & Evaluation**:
   ```typescript
   export const FREE_TRIAL_STORAGE_BYTES = 10 * 1024 * 1024 // 10 MB
   export const STARTER_STORAGE_BYTES = 100 * 1024 * 1024    // 100 MB (was 10 MB)
   export const PRO_STORAGE_BYTES = 500 * 1024 * 1024        // 500 MB (was 100 MB)
   ```
   * In `getUserPlanFeatures(supabase, userId)`:
     - Check `user.custom_storage_bytes`:
       - If present: `storageQuotaBytes = Number(user.custom_storage_bytes)` and `storageQuotaMb = storageQuotaBytes / (1024 * 1024)`.
       - If null: calculate based on tier:
         - Trial: `10 MB`
         - Starter: `100 MB`
         - Pro: `500 MB`
         - Free User: `500 MB`

2. **`lib/portfolio/quota.ts` (Storage Validation & Uploads)**:
   * In `ensureQuotaRow(supabase, userId)`:
     - Fetch `user.custom_storage_bytes` and `user.is_free_user`.
     - If `user.custom_storage_bytes` is set:
       `targetFreeBytes = Number(user.custom_storage_bytes)`
       Do not allow automatic subscription sync to downgrade or alter this value!
     - Otherwise follow plan tier defaults (`10 MB`, `100 MB`, `500 MB`).

---

### B. Admin API Routes (`app/api/admin/users/route.ts`)

1. **`GET /api/admin/users`**:
   - Query `users.custom_storage_bytes`.
   - Include in formatted output:
     ```typescript
     storage: {
       free_quota: finalQuota.free_storage_bytes,
       purchased_quota: finalQuota.purchase_storage_bytes,
       used: finalQuota.used_storage_bytes,
       custom_storage_bytes: user.custom_storage_bytes ?? null,
       is_custom: user.custom_storage_bytes !== null,
     }
     ```

2. **`PATCH /api/admin/users`**:
   - Accept payload:
     ```typescript
     {
       id: number,
       custom_storage_gb?: number | null, // e.g. 1, 2.5, 5, or null to reset to plan default
       is_test_user?: boolean,
       is_free_user?: boolean
     }
     ```
   - If `custom_storage_gb !== undefined`:
     - If `custom_storage_gb === null`:
       - Set `users.custom_storage_bytes = null`.
       - Re-sync `portfolio_storage_quotas.free_storage_bytes` to user's plan default (10 MB trial, 100 MB Starter, 500 MB Pro).
     - If `custom_storage_gb !== null`:
       - Convert GB to bytes: `Math.round(custom_storage_gb * 1024 * 1024 * 1024)`.
       - Update `users.custom_storage_bytes = targetBytes`.
       - Immediately update `portfolio_storage_quotas.free_storage_bytes = targetBytes`.

---

### C. Admin UI (`app/admin/users/page.tsx`)

1. **Storage Section in User Detail Slide-Out Panel**:
   - Add **Dynamic Storage Management Card**:
     - Current Quota Badge: Displays current total quota (e.g. `500 MB` or `2.00 GB (Custom Override)`).
     - **Input field**: `Storage Quota (GB)` with suffix `GB`.
       - Supports decimal inputs (e.g. `0.1` for 100 MB, `0.5` for 500 MB, `1`, `2`, `5`, `10` GB).
     - **Quick Presets Buttons**:
       - `100 MB` (Starter default)
       - `500 MB` (Pro default)
       - `1 GB`
       - `2 GB`
       - `5 GB`
     - **Reset to Plan Default** button (clears custom override).
     - **Save Storage Quota** action button with loading spinner and toast notifications.
2. **Main Users Table**:
   - Display storage quota indicator with badge:
     - `Plan Default` (slate badge)
     - `Custom: X GB` (purple badge)

---

### D. Billing & Public Pricing Display Sync

1. Update marketing & billing descriptions:
   - `app/(dashboard)/billing/page.tsx`:
     - Starter: 100 MB Cloud Storage
     - Pro: 500 MB Cloud Storage
   - `app/admin/settings/platform-subscriptions.tsx`:
     - Display and edit defaults updated to 100 MB and 500 MB.
   - `app/page.tsx`:
     - Marketing copy updated to reflect 100 MB for Starter and 500 MB for Pro.

---

## 4. Step-by-Step Implementation Sequence

```
1. Database Schema
   ├── Execute migration: add `custom_storage_bytes` to `users` table
   └── Run SQL update on `platform_subscriptions` (Starter = 100MB, Pro = 500MB)

2. Core Backend Logic
   ├── Update `lib/auth/plan-features.ts` (Starter = 100MB, Pro = 500MB, custom_storage_bytes check)
   └── Update `lib/portfolio/quota.ts` (protect custom_storage_bytes from auto-downgrade)

3. Admin API Route
   ├── Update `app/api/admin/users/route.ts` GET & PATCH handlers
   └── Add validation for GB input & automatic byte conversion

4. Admin UI
   ├── Update `app/admin/users/page.tsx` with GB input, presets, and reset buttons
   └── Add custom quota indicators in the table and detail panel

5. Frontend & Marketing Copy
   └── Update `billing/page.tsx`, `platform-subscriptions.tsx`, and `app/page.tsx`

6. Verification & Automated Tests
   ├── Update unit tests in `tests/plan-features.test.ts`
   ├── Run `pnpm test` (verify all 44+ tests pass)
   └── Run `pnpm build` (verify zero build errors)
```
