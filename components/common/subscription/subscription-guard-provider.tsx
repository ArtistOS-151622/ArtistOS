"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { usePathname } from "next/navigation"
import { useSubscriptionGuard } from "@/lib/hooks/use-subscription-guard"
import { TrialExpiredModal } from "./trial-expired-modal"
import { TrialBanner } from "./trial-banner"
import { ReadOnlyOverlay } from "./read-only-overlay"

type GuardContextValue = {
  isReadOnly: boolean
  trialDaysLeft: number
  hasActiveSub: boolean
  isTrialExpired: boolean
  subscriptionStatus: string
}

const GuardContext = createContext<GuardContextValue>({
  isReadOnly: false,
  trialDaysLeft: 30,
  hasActiveSub: false,
  isTrialExpired: false,
  subscriptionStatus: "none",
})

export function useGuardContext() {
  return useContext(GuardContext)
}

export function SubscriptionGuardProvider({ children }: { children: ReactNode }) {
  const { isReadOnly, trialDaysLeft, hasActiveSub, isTrialExpired, subscriptionStatus, isLoading } =
    useSubscriptionGuard()

  // User can dismiss the popup — overlay stays active but modal hides
  const [modalDismissed, setModalDismissed] = useState(false)

  const pathname = usePathname() ?? ""
  const isOnBilling = pathname.includes("/billing")

  // Re-show the modal on each new page navigation (except billing)
  // so the user gets a reminder every time they switch pages
  useEffect(() => {
    if (!isOnBilling) {
      setModalDismissed(false)
    }
  }, [pathname, isOnBilling])

  // Show modal when: (trial expired OR halted) + no active sub + not loading + not dismissed + not on billing page
  const showModal = !isLoading && isReadOnly && !modalDismissed && !isOnBilling

  // Show trial banner during active trial (last 14 days, not expired, not paid)
  const showTrialBanner =
    !isLoading && !isTrialExpired && !hasActiveSub && trialDaysLeft <= 14

  return (
    <GuardContext.Provider
      value={{ isReadOnly, trialDaysLeft, hasActiveSub, isTrialExpired, subscriptionStatus }}
    >
      {/* Non-dismissible modal — hidden on billing page, can be closed by user */}
      {showModal && (
        <TrialExpiredModal onClose={() => setModalDismissed(true)} subscriptionStatus={subscriptionStatus} />
      )}

      {/* Read-only click blocker — always active when expired, independent of modal */}
      <ReadOnlyOverlay isReadOnly={isReadOnly} subscriptionStatus={subscriptionStatus} />

      {/* Trial countdown banner (last 14 days of active trial) */}
      {showTrialBanner && <TrialBanner daysLeft={trialDaysLeft} />}

      {children}
    </GuardContext.Provider>
  )
}
