import "../../helpers/env.js"

import assert from "node:assert/strict"
import { test } from "node:test"

import { dispatchPendingNotifications } from "#src/shared/notifications/dispatcher.js"
import { enqueueEvent, markFailed, recordWhatsAppEvent } from "#src/shared/notifications/events.js"
import { sendPushToUser } from "#src/shared/notifications/push.js"

const silentLog = { warn() {} }

function recordingClient({ existing = null, insertError = null } = {}) {
  const calls = []
  const chain = (table, op, payload) => {
    const filters = {}
    const builder = {
      select: () => builder,
      eq: (col, val) => ((filters[col] = val), builder),
      maybeSingle: async () => {
        if (op === "insert") return { data: insertError ? null : { id: 1, ...payload }, error: insertError }
        return { data: existing, error: null }
      },
      then: (resolve) => {
        calls.push({ table, op, payload, filters })
        return Promise.resolve({ error: null }).then(resolve)
      },
    }
    return builder
  }
  return {
    calls,
    from: (table) => ({
      select: () => chain(table, "select"),
      insert: (payload) => {
        const builder = chain(table, "insert", payload)
        calls.push({ table, op: "insert", payload })
        return builder
      },
      update: (payload) => chain(table, "update", payload),
    }),
  }
}

test("enqueueEvent returns null on a duplicate (unique violation) and throws on other errors", async () => {
  const input = { userId: 1, eventType: "x", entityType: "booking", entityId: 2, title: "t", body: "b" }
  assert.equal(await enqueueEvent(recordingClient({ insertError: { code: "23505" } }), input), null)
  await assert.rejects(enqueueEvent(recordingClient({ insertError: { code: "500", message: "boom" } }), input), /boom/)
  const row = await enqueueEvent(recordingClient(), input)
  assert.equal(row.channel, "push")
  assert.equal(row.url, null)
})

test("markFailed keeps the event pending until the attempt budget (3) is used", async () => {
  const client = recordingClient()
  await markFailed(client, { id: 7, attempts: 0 }, "x".repeat(600))
  await markFailed(client, { id: 7, attempts: 2 }, "nope")
  const [first, last] = client.calls.filter((c) => c.op === "update")
  assert.equal(first.payload.status, "pending")
  assert.equal(first.payload.last_error.length, 500)
  assert.equal(last.payload.status, "failed")
  assert.equal(last.payload.attempts, 3)
})

test("recordWhatsAppEvent inserts the first time and increments attempts after", async () => {
  const event = {
    userId: 1, eventType: "booking_confirmed", entityType: "booking", entityId: 9,
    title: "Booking Confirmed", body: "sent", result: { success: false, error: "nope" },
  }

  const fresh = recordingClient()
  await recordWhatsAppEvent(fresh, event, silentLog)
  const insert = fresh.calls.find((c) => c.op === "insert")
  assert.equal(insert.payload.status, "failed")
  assert.equal(insert.payload.attempts, 1)
  assert.equal("url" in insert.payload, false)

  const retried = recordingClient({ existing: { id: 5, attempts: 1 } })
  await recordWhatsAppEvent(retried, { ...event, url: "/inquiries", result: { success: true } }, silentLog)
  const update = retried.calls.find((c) => c.op === "update")
  assert.equal(update.payload.attempts, 2)
  assert.equal(update.payload.status, "sent")
  assert.equal(update.payload.url, "/inquiries")
  assert.equal(update.filters.id, 5)
})

test("recordWhatsAppEvent never throws", async () => {
  const broken = { from: () => { throw new Error("db down") } }
  let warned = false
  await recordWhatsAppEvent(broken, { result: { success: true } }, { warn: () => (warned = true) })
  assert.equal(warned, true)
})

test("dispatcher skips cleanly when push is not configured", async () => {
  assert.deepEqual(await dispatchPendingNotifications({}), {
    processed: 0, sent: 0, failed: 0, skipped: true, error: "Push notifications are not configured",
  })
})

test("sendPushToUser counts failures per device instead of throwing", async () => {
  const client = {
    from: () => ({
      select: () => ({ eq: async () => ({ data: [{ endpoint: "a", p256dh: "p", auth: "x" }], error: null }) }),
    }),
  }
  // VAPID is unset in tests, so every send throws "not configured" → counted as failed.
  assert.deepEqual(await sendPushToUser(client, 1, { title: "t", body: "b" }), { sent: 0, removed: 0, failed: 1 })
})
