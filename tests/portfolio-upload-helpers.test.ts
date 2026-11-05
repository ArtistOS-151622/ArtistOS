import assert from "node:assert/strict"
import test from "node:test"

import { register } from "node:module"

// lib modules use the "@/..." alias; resolve it for this test file only
register("./helpers/alias-hooks.mjs", import.meta.url)
const { findOrCreateBookingFolder } = await import("../lib/portfolio/folders.ts")
const { getOrCreateQuota } = await import("../lib/portfolio/quota.ts")
const { STORAGE_FREE_TIER_BYTES } = await import("../lib/portfolio/config.ts")

/**
 * Table-aware Supabase mock. `reads[table]` is what a select on that table resolves to.
 * Every filter method returns the same builder, so call order / chain shape doesn't matter.
 * Writes are recorded in `writes`.
 */
type Result = { data: unknown; error: unknown; count?: number | null }
function createMock(reads: Record<string, Result | ((filters: Record<string, unknown>) => Result)>) {
  const writes: { table: string; op: "update" | "insert"; values: Record<string, unknown> }[] = []

  function builder(table: string, op: "select" | "update" | "insert", values?: Record<string, unknown>) {
    const filters: Record<string, unknown> = {}
    const resolve = async (): Promise<Result> => {
      if (op !== "select") {
        writes.push({ table, op, values: values ?? {} })
        if (op === "insert") {
          const inserted = { id: 500, ...values }
          return { data: inserted, error: null }
        }
        return { data: values, error: null }
      }
      const entry = reads[table]
      if (!entry) return { data: null, error: null }
      return typeof entry === "function" ? entry(filters) : entry
    }
    const b: Record<string, unknown> = {}
    for (const m of ["eq", "in", "neq", "is", "lte", "gte", "order", "limit", "ilike"]) {
      b[m] = (col: string, val: unknown) => {
        if (m === "eq" || m === "lte") filters[`${m}:${col}`] = val
        return b
      }
    }
    b.select = () => b
    b.single = resolve
    b.maybeSingle = resolve
    b.then = (ok: (v: Result) => unknown, fail: (e: unknown) => unknown) => resolve().then(ok, fail)
    return b
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- minimal Supabase mock
  const supabase: any = {
    from: (table: string) => ({
      select: () => builder(table, "select"),
      update: (values: Record<string, unknown>) => builder(table, "update", values),
      insert: (values: Record<string, unknown>) => builder(table, "insert", values),
    }),
  }
  return { supabase, writes }
}

const quotaRow = (overrides: Record<string, unknown> = {}) => ({
  id: 7,
  user_id: 1,
  free_storage_bytes: STORAGE_FREE_TIER_BYTES,
  purchase_storage_bytes: 0,
  used_storage_bytes: 1234,
  expires_at: null,
  ...overrides,
})

// ── getOrCreateQuota ─────────────────────────────────────────────────────────

test("getOrCreateQuota: free user with lower stored bytes is raised to 500MB", async () => {
  const { supabase, writes } = createMock({
    users: { data: { is_free_user: true, custom_storage_bytes: null }, error: null },
    portfolio_storage_quotas: { data: quotaRow({ free_storage_bytes: 10 }), error: null },
  })
  const row = await getOrCreateQuota(supabase, 1)
  assert.equal(Number(row.free_storage_bytes), 500 * 1024 * 1024)
  assert.equal(writes.length, 1)
  assert.equal(writes[0].values.free_storage_bytes, 500 * 1024 * 1024)
  assert.equal(Number(row.used_storage_bytes), 1234)
})

test("getOrCreateQuota: custom storage override is applied", async () => {
  const { supabase, writes } = createMock({
    users: { data: { is_free_user: false, custom_storage_bytes: 999 }, error: null },
    portfolio_storage_quotas: { data: quotaRow({ free_storage_bytes: 10 }), error: null },
  })
  const row = await getOrCreateQuota(supabase, 1)
  assert.equal(Number(row.free_storage_bytes), 999)
  assert.equal(writes.length, 1)
})

test("getOrCreateQuota: paid plan sets free bytes from the plan's storage_quota_mb", async () => {
  const { supabase, writes } = createMock({
    users: { data: { is_free_user: false, custom_storage_bytes: null }, error: null },
    portfolio_storage_quotas: { data: quotaRow({ free_storage_bytes: 10 }), error: null },
    user_subscriptions: {
      data: { status: "active", platform_subscriptions: { storage_quota_mb: 200, has_whatsapp_automation: false } },
      error: null,
    },
  })
  const row = await getOrCreateQuota(supabase, 1)
  assert.equal(Number(row.free_storage_bytes), 200 * 1024 * 1024)
  assert.equal(writes.length, 1)
})

test("getOrCreateQuota: no subscription falls back to the free tier, no write when already correct", async () => {
  const { supabase, writes } = createMock({
    users: { data: { is_free_user: false, custom_storage_bytes: null }, error: null },
    portfolio_storage_quotas: { data: quotaRow(), error: null },
    user_subscriptions: { data: null, error: null },
  })
  const row = await getOrCreateQuota(supabase, 1)
  assert.equal(Number(row.free_storage_bytes), STORAGE_FREE_TIER_BYTES)
  assert.equal(writes.length, 0)
})

test("getOrCreateQuota: free user does not use the subscription plan", async () => {
  const { supabase } = createMock({
    users: { data: { is_free_user: true, custom_storage_bytes: null }, error: null },
    portfolio_storage_quotas: { data: quotaRow({ free_storage_bytes: 600 * 1024 * 1024 }), error: null },
    user_subscriptions: {
      data: { status: "active", platform_subscriptions: { storage_quota_mb: 1, has_whatsapp_automation: false } },
      error: null,
    },
  })
  const row = await getOrCreateQuota(supabase, 1)
  assert.equal(Number(row.free_storage_bytes), 600 * 1024 * 1024)
})

test("getOrCreateQuota: creates the quota row when missing", async () => {
  const { supabase, writes } = createMock({
    users: { data: { is_free_user: false, custom_storage_bytes: null }, error: null },
    portfolio_storage_quotas: { data: null, error: null },
  })
  const row = await getOrCreateQuota(supabase, 1)
  assert.equal(writes.length, 1)
  assert.equal(writes[0].op, "insert")
  assert.equal(Number(row.free_storage_bytes), STORAGE_FREE_TIER_BYTES)
})

// ── findOrCreateBookingFolder ────────────────────────────────────────────────

test("findOrCreateBookingFolder: returns an existing, correctly named folder without writing", async () => {
  const existing = { id: 9, user_id: 1, booking_id: 42, name: "Booking - Priya (#3)" }
  const { supabase, writes } = createMock({
    bookings: (filters) =>
      "lte:id" in filters
        ? { data: null, error: null, count: 3 }
        : { data: { id: 42, customer: { customer_name: "Priya" } }, error: null },
    portfolio_folders: { data: existing, error: null },
  })
  const folder = await findOrCreateBookingFolder(supabase, 1, 42)
  assert.equal(folder.id, 9)
  assert.equal(writes.length, 0)
})

test("findOrCreateBookingFolder: creates a named folder when none exists", async () => {
  const { supabase, writes } = createMock({
    bookings: (filters) =>
      "lte:id" in filters
        ? { data: null, error: null, count: 5 }
        : { data: { id: 42, customer: { customer_name: "Priya" } }, error: null },
    portfolio_folders: { data: null, error: null },
  })
  const folder = await findOrCreateBookingFolder(supabase, 1, 42)
  assert.equal(writes.length, 1)
  assert.equal(writes[0].op, "insert")
  assert.equal(writes[0].values.name, "Booking - Priya (#5)")
  assert.equal(folder.name, "Booking - Priya (#5)")
})

test("findOrCreateBookingFolder: throws when the booking is not the artist's", async () => {
  const { supabase, writes } = createMock({
    bookings: (filters) => ("lte:id" in filters ? { data: null, error: null, count: 0 } : { data: null, error: null }),
    portfolio_folders: { data: null, error: null },
  })
  await assert.rejects(findOrCreateBookingFolder(supabase, 1, 42), /Booking not found/)
  assert.equal(writes.length, 0)
})
