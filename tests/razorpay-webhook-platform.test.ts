import assert from "node:assert/strict"
import test from "node:test"

import {
  getRazorpayWebhookNotes,
  getRazorpayWebhookSubscriptionId,
} from "../lib/razorpay-webhook-platform"

test("keeps subscription notes when renewal payment notes are empty", () => {
  const notes = getRazorpayWebhookNotes({
    payload: {
      payment: {
        entity: {
          id: "pay_renewal",
          subscription_id: "sub_platform",
          notes: {},
        },
      },
      subscription: {
        entity: {
          id: "sub_platform",
          notes: {
            type: "platform_subscription",
            payment_id: "42",
            user_id: "7",
            plan_id: "3",
          },
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
    getRazorpayWebhookSubscriptionId({
      payload: {
        payment: { entity: { subscription_id: "sub_from_payment" } },
      },
    }),
    "sub_from_payment"
  )
})
