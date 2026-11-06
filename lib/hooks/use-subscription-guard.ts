import useSWR from "swr"

type SubscriptionStatus = {
  trialDaysLeft: number
  isTrialExpired: boolean
  hasActiveSub: boolean
  isReadOnly: boolean
  subscriptionStatus: string
  daysSinceSignup: number
}

export function useSubscriptionGuard() {
  const { data, isLoading, mutate } = useSWR<SubscriptionStatus>(
    "/api/subscription-status",
    {
      // Revalidate every 5 minutes to catch subscription updates
      refreshInterval: 5 * 60 * 1000,
      // Opt back in to focus revalidation (off globally) to catch payments made
      // in another tab; throttled to once a minute by the global config.
      revalidateOnFocus: true,
    }
  )

  return {
    isReadOnly: data?.isReadOnly ?? false,
    isTrialExpired: data?.isTrialExpired ?? false,
    hasActiveSub: data?.hasActiveSub ?? false,
    subscriptionStatus: data?.subscriptionStatus ?? "none",
    trialDaysLeft: data?.trialDaysLeft ?? 30,
    isLoading,
    refresh: mutate,
  }
}
