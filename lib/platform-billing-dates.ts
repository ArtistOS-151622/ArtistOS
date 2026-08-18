export type RazorpaySubscriptionDateFields = {
  current_start?: number | null
  current_end?: number | null
  charge_at?: number | null
  end_at?: number | null
}

export type PlatformSubscriptionDates = {
  currentPeriodStart: string | null
  currentPeriodEnd: string | null
  nextBillingAt: string | null
  subscriptionEndAt: string | null
}

export function unixSecondsToIso(value?: number | null): string | null {
  return value ? new Date(value * 1000).toISOString() : null
}

export function buildPlatformSubscriptionDates(
  subscription: RazorpaySubscriptionDateFields
): PlatformSubscriptionDates {
  const currentPeriodEnd = unixSecondsToIso(subscription.current_end)

  return {
    currentPeriodStart: unixSecondsToIso(subscription.current_start),
    currentPeriodEnd,
    nextBillingAt: unixSecondsToIso(subscription.charge_at) ?? currentPeriodEnd,
    subscriptionEndAt: unixSecondsToIso(subscription.end_at),
  }
}

export function resolveCompletedPlatformPaymentDates(params: {
  amount: number
  rpSubscriptionId?: string | null
  rpOrderId?: string | null
  razorpayDates?: PlatformSubscriptionDates | null
  now?: Date
}): PlatformSubscriptionDates {
  if (params.rpSubscriptionId) {

    if (!params.razorpayDates?.currentPeriodEnd) {
      console.log("Razorpay dates incomplete during checkout (expected). Webhook will sync dates later.")
    }

    return params.razorpayDates ?? {
      currentPeriodStart: null,
      currentPeriodEnd: null,
      nextBillingAt: null,
      subscriptionEndAt: null,
    }
  }

  if (!params.rpOrderId && params.amount === 0) {
    const nowIso = (params.now ?? new Date()).toISOString()
    return {
      currentPeriodStart: nowIso,
      currentPeriodEnd: nowIso,
      nextBillingAt: nowIso,
      subscriptionEndAt: null,
    }
  }

  throw new Error("Platform subscription plan is missing a Razorpay subscription id")
}
