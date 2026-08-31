import assert from "node:assert/strict"
import test from "node:test"
import {
  claimWebhookEvent,
  releaseWebhookEvent,
} from "../lib/razorpay/webhook-events.ts"

// Minimal stand-in for the unique index on razorpay_webhook_events.event_id.
function fakeSupabase() {
  const rows = new Set<string>()
  return {
    rows,
    from() {
      return {
        insert(row: { event_id: string }) {
          if (rows.has(row.event_id)) {
            return Promise.resolve({
              error: { code: "23505", message: "duplicate key value" },
            })
          }
          rows.add(row.event_id)
          return Promise.resolve({ error: null })
        },
        delete() {
          return {
            eq(_col: string, id: string) {
              rows.delete(id)
              return Promise.resolve({ error: null })
            },
          }
        },
      }
    },
  }
}

test("first claim wins, duplicate loses", async () => {
  const db = fakeSupabase() as never
  assert.equal(await claimWebhookEvent(db, "evt_1", "payment"), true)
  assert.equal(await claimWebhookEvent(db, "evt_1", "payment"), false)
})

test("concurrent claims: exactly one wins", async () => {
  const db = fakeSupabase() as never
  const results = await Promise.all(
    Array.from({ length: 8 }, () => claimWebhookEvent(db, "evt_race", "payment"))
  )
  assert.equal(results.filter(Boolean).length, 1)
})

test("release lets a retry claim again", async () => {
  const db = fakeSupabase() as never
  assert.equal(await claimWebhookEvent(db, "evt_2", "payment"), true)
  await releaseWebhookEvent(db, "evt_2")
  assert.equal(await claimWebhookEvent(db, "evt_2", "payment"), true)
})

test("non-unique errors surface instead of being swallowed", async () => {
  const db = {
    from: () => ({
      insert: () =>
        Promise.resolve({ error: { code: "08006", message: "connection failure" } }),
    }),
  } as never
  await assert.rejects(() => claimWebhookEvent(db, "evt_3", "payment"), /connection failure/)
})
