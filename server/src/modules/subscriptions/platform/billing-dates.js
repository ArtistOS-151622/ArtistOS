import { logger } from "#src/utils/logger.js"

/*
 * Razorpay subscription dates (unix seconds) → ISO strings for user_subscriptions.
 * Dates: { currentPeriodStart, currentPeriodEnd, nextBillingAt, subscriptionEndAt }.
 * Razorpay's next_billing / current_end are the source of truth, not local arithmetic.
 */

export function unixSecondsToIso(value) {
  return value ? new Date(value * 1000).toISOString() : null
}

/** From a Razorpay subscription entity ({ current_start, current_end, charge_at, end_at }). */
export function buildPlatformSubscriptionDates(subscription) {
  const currentPeriodEnd = unixSecondsToIso(subscription.current_end)
  return {
    currentPeriodStart: unixSecondsToIso(subscription.current_start),
    currentPeriodEnd,
    nextBillingAt: unixSecondsToIso(subscription.charge_at) ?? currentPeriodEnd,
    subscriptionEndAt: unixSecondsToIso(subscription.end_at),
  }
}

const NO_DATES = Object.freeze({
  currentPeriodStart: null,
  currentPeriodEnd: null,
  nextBillingAt: null,
  subscriptionEndAt: null,
})

/**
 * Dates to store when a platform payment completes. Subscriptions use Razorpay's dates
 * (often incomplete at checkout; the webhook syncs them later). A free plan (no order,
 * amount 0) starts and ends now.
 */
export function resolveCompletedPlatformPaymentDates({ amount, rpSubscriptionId, rpOrderId, razorpayDates, now }) {
  if (rpSubscriptionId) {
    if (!razorpayDates?.currentPeriodEnd) {
      logger.info("Razorpay dates incomplete during checkout (expected); the webhook will sync them")
    }
    return razorpayDates ?? { ...NO_DATES }
  }

  if (!rpOrderId && amount === 0) {
    const nowIso = (now ?? new Date()).toISOString()
    return { currentPeriodStart: nowIso, currentPeriodEnd: nowIso, nextBillingAt: nowIso, subscriptionEndAt: null }
  }

  throw new Error("Platform subscription plan is missing a Razorpay subscription id")
}
