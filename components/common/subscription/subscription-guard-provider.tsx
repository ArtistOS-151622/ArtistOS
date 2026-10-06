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

  // Block mutating actions in UI when in read-only mode
  useEffect(() => {
    if (!isReadOnly || isOnBilling) return

    const handleFormSubmit = (e: Event) => {
      e.preventDefault()
      e.stopPropagation()
      setModalDismissed(false)
    }

    const handleClickCapture = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null
      if (!target) return

      // Always allow clicks inside guard-exempt components (like the upgrade modal and banner)
      if (target.closest("[data-guard-exempt]")) return

      // Allow navigation links
      const link = target.closest("a")
      if (link) {
        return // Allow browsing and reading pages
      }

      // Allow viewing controls (tabs, dropdown triggers, filters, pagination, close buttons)
      if (target.closest("[role='tab'], [data-sidebar], [data-view-control], [aria-label='Close'], [data-dismiss]")) {
        return
      }

      // Allow search inputs for finding existing records
      if (target.tagName === "INPUT") {
        const input = target as HTMLInputElement
        if (input.type === "search" || input.placeholder?.toLowerCase().includes("search")) {
          return
        }
      }

      // Detect mutation / action buttons
      const button = target.closest("button, [role='button'], input[type='submit']")
      if (button) {
        const btnText = (button.textContent || "").toLowerCase()
        const isAction =
          button.getAttribute("type") === "submit" ||
          button.closest("form") ||
          /add|create|save|edit|update|delete|remove|upload|send|confirm|book|new|pay/.test(btnText)

        if (isAction) {
          e.preventDefault()
          e.stopPropagation()
          setModalDismissed(false)
        }
      }
    }

    document.addEventListener("submit", handleFormSubmit, true)
    document.addEventListener("click", handleClickCapture, true)

    return () => {
      document.removeEventListener("submit", handleFormSubmit, true)
      document.removeEventListener("click", handleClickCapture, true)
    }
  }, [isReadOnly, isOnBilling])

  // Show modal when: (trial expired OR halted OR cancelled) + no active sub + not loading + not dismissed + not on billing page
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
