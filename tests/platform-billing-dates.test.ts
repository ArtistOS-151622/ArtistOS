import assert from "node:assert/strict"
import test from "node:test"

import {
  buildPlatformSubscriptionDates,
  resolveCompletedPlatformPaymentDates,
  unixSecondsToIso,
} from "../lib/platform-billing-dates"

const unix = (iso: string) => Date.parse(iso) / 1000

test("converts Razorpay subscription dates from unix seconds", () => {
  const dates = buildPlatformSubscriptionDates({
    current_start: unix("2026-08-16T00:00:00.000Z"),
    current_end: unix("2026-09-15T00:00:00.000Z"),
    charge_at: unix("2026-09-15T00:00:00.000Z"),
    end_at: unix("2036-08-14T00:00:00.000Z"),
  })

  assert.deepEqual(dates, {
    currentPeriodStart: "2026-08-16T00:00:00.000Z",
    currentPeriodEnd: "2026-09-15T00:00:00.000Z",
    nextBillingAt: "2026-09-15T00:00:00.000Z",
    subscriptionEndAt: "2036-08-14T00:00:00.000Z",
  })
})

test("uses current_end as next billing date when Razorpay charge_at is missing", () => {
  const dates = buildPlatformSubscriptionDates({
    current_start: unix("2026-08-16T00:00:00.000Z"),
    current_end: unix("2026-09-15T00:00:00.000Z"),
  })

  assert.equal(dates.nextBillingAt, "2026-09-15T00:00:00.000Z")
})

test("paid platform completion must use Razorpay subscription dates", () => {
  const razorpayDates = buildPlatformSubscriptionDates({
    current_start: unix("2026-08-16T00:00:00.000Z"),
    current_end: unix("2026-09-15T00:00:00.000Z"),
    charge_at: unix("2026-09-15T00:00:00.000Z"),
  })

  const dates = resolveCompletedPlatformPaymentDates({
    amount: 236,
    rpSubscriptionId: "sub_123",
    razorpayDates,
    now: new Date("2026-08-16T10:00:00.000Z"),
  })

  assert.equal(dates.currentPeriodStart, "2026-08-16T00:00:00.000Z")
  assert.equal(dates.currentPeriodEnd, "2026-09-15T00:00:00.000Z")
  assert.equal(dates.nextBillingAt, "2026-09-15T00:00:00.000Z")
})

test("paid platform completion fails when Razorpay dates are unavailable", () => {
  assert.throws(
    () =>
      resolveCompletedPlatformPaymentDates({
        amount: 236,
        rpSubscriptionId: "sub_123",
        razorpayDates: null,
      }),
    /Could not determine subscription dates from Razorpay/
  )
})

test("paid platform completion fails without a Razorpay subscription id", () => {
  assert.throws(
    () =>
      resolveCompletedPlatformPaymentDates({
        amount: 236,
        rpOrderId: "order_123",
      }),
    /missing a Razorpay subscription id/
  )
})

test("free platform completion uses the activation timestamp", () => {
  const now = new Date("2026-08-16T12:34:56.000Z")

  const dates = resolveCompletedPlatformPaymentDates({
    amount: 0,
    now,
  })

  assert.deepEqual(dates, {
    currentPeriodStart: now.toISOString(),
    currentPeriodEnd: now.toISOString(),
    nextBillingAt: now.toISOString(),
    subscriptionEndAt: null,
  })
})

test("unixSecondsToIso returns null for empty Razorpay date fields", () => {
  assert.equal(unixSecondsToIso(undefined), null)
  assert.equal(unixSecondsToIso(null), null)
  assert.equal(unixSecondsToIso(0), null)
})
