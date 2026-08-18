import useSWR from "swr"

type SubscriptionStatus = {
  trialDaysLeft: number
  isTrialExpired: boolean
  hasActiveSub: boolean
  isReadOnly: boolean
  subscriptionStatus: string
  daysSinceSignup: number
}

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export function useSubscriptionGuard() {
  const { data, isLoading, mutate } = useSWR<SubscriptionStatus>(
    "/api/subscription-status",
    fetcher,
    {
      // Revalidate every 5 minutes to catch subscription updates
      refreshInterval: 5 * 60 * 1000,
      // Also revalidate when the window regains focus (e.g. after payment)
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
