import "../../helpers/env.js"

import assert from "node:assert/strict"
import test from "node:test"

import {
  getRazorpayWebhookNotes,
  getRazorpayWebhookSubscriptionId,
  processRazorpayWebhook,
} from "#src/modules/subscriptions/webhook.service.js"

// ── Ported from root tests/razorpay-webhook-platform.test.ts ──

test("keeps subscription notes when renewal payment notes are empty", () => {
  const notes = getRazorpayWebhookNotes({
    payload: {
      payment: { entity: { id: "pay_renewal", subscription_id: "sub_platform", notes: {} } },
      subscription: {
        entity: {
          id: "sub_platform",
          notes: { type: "platform_subscription", payment_id: "42", user_id: "7", plan_id: "3" },
        },
      },
    },
  })

  assert.equal(notes.type, "platform_subscription")
  assert.equal(notes.payment_id, "42")
  assert.equal(notes.user_id, "7")
  assert.equal(notes.plan_id, "3")
})

test("finds subscription id from subscription entity first", () => {
  assert.equal(
    getRazorpayWebhookSubscriptionId({
      payload: {
        payment: { entity: { subscription_id: "sub_from_payment" } },
        subscription: { entity: { id: "sub_from_subscription" } },
      },
    }),
    "sub_from_subscription"
  )
})

test("falls back to payment subscription id when subscription entity is absent", () => {
  assert.equal(
    getRazorpayWebhookSubscriptionId({ payload: { payment: { entity: { subscription_id: "sub_from_payment" } } } }),
    "sub_from_payment"
  )
})

// ── Event routing (fake Supabase that records every query) ──

/** Chainable query stub. `rows[table]` is what a read on that table resolves to. */
function fakeSupabase(rows = {}) {
  const calls = []
  return {
    calls,
    from(table) {
      const call = { table, ops: [] }
      calls.push(call)
      const builder = {
        then(resolve, reject) {
          return Promise.resolve({ data: rows[table] ?? null, error: null }).then(resolve, reject)
        },
      }
      for (const op of ["select", "update", "eq", "order", "limit", "maybeSingle", "single"]) {
        builder[op] = (...args) => {
          call.ops.push([op, ...args])
          return builder
        }
      }
      return builder
    },
  }
}

test("status events update the platform subscription, scoped to the user", async () => {
  const db = fakeSupabase()
  const event = await processRazorpayWebhook(
    db,
    {
      event: "subscription.halted",
      payload: { subscription: { entity: { id: "sub_1", notes: { type: "platform_subscription", user_id: "7" } } } },
    },
    "evt_1"
  )

  assert.equal(event, "subscription.halted")
  assert.equal(db.calls.length, 1)
  assert.equal(db.calls[0].table, "user_subscriptions")
  assert.deepEqual(db.calls[0].ops, [
    ["update", { status: "halted" }],
    ["eq", "rp_subscription_id", "sub_1"],
    ["eq", "user_id", 7],
  ])
})

test("subscription.resumed sets the subscription active", async () => {
  const db = fakeSupabase()
  await processRazorpayWebhook(
    db,
    { event: "subscription.resumed", payload: { subscription: { entity: { notes: { type: "platform_subscription", user_id: "9" } } } } },
    "evt_2"
  )
  assert.deepEqual(db.calls[0].ops, [
    ["update", { status: "active" }],
    ["eq", "user_id", 9],
  ])
})

test("status events for non-platform subscriptions change nothing", async () => {
  const db = fakeSupabase({ platform_payments: null })
  await processRazorpayWebhook(
    db,
    { event: "subscription.cancelled", payload: { subscription: { entity: { id: "sub_storage", notes: {} } } } },
    "evt_3"
  )
  // Only the platform_payments lookup that decides it isn't a platform subscription.
  assert.deepEqual(
    db.calls.map((c) => c.table),
    ["platform_payments"]
  )
})

test("unknown and prototype-named events are acknowledged without touching the database", async () => {
  for (const name of ["refund.created", "toString", undefined]) {
    const db = fakeSupabase()
    assert.equal(await processRazorpayWebhook(db, { event: name }, "evt_x"), name)
    assert.equal(db.calls.length, 0)
  }
})
