"use client"

import { usePathname } from "next/navigation"
import { useRouter } from "next/navigation"

// Pages where we DON'T block actions (billing, profile, support are always accessible)
const EXEMPT_PATHS = ["/billing", "/profile", "/support"]

type Props = {
  isReadOnly: boolean
  subscriptionStatus?: string
}

export function ReadOnlyOverlay({ isReadOnly, subscriptionStatus = "none" }: Props) {
  const pathname = usePathname() ?? ""
  const router = useRouter()

  const isPending = subscriptionStatus === "pending"

  if (!isReadOnly && !isPending) return null

  // Don't block on exempt pages
  const isExempt = EXEMPT_PATHS.some((p) => pathname.includes(p))
  if (isExempt) return null

  const isHalted = subscriptionStatus === "halted"

  if (isPending) {
    return (
      <div className="fixed top-0 left-0 right-0 bg-orange-500 text-white z-[9000] px-4 py-2 text-center text-sm font-medium shadow-md flex items-center justify-center gap-2">
        Your payment has failed. Please check your email to update your payment method before your subscription is paused.
      </div>
    )
  }

  return (
    <div className="fixed top-0 left-0 right-0 bg-red-600 text-white z-[9000] px-4 py-2 text-center text-sm font-medium shadow-md flex items-center justify-center gap-2">
      {isHalted 
        ? "Your subscription is paused due to repeated payment failures."
        : "Your subscription has expired. You are in read-only mode."}
      <button
        onClick={() => router.push("/billing")}
        className="underline font-bold hover:text-red-100 transition-colors"
      >
        {isHalted ? "Update Payment Details" : "Upgrade now"}
      </button>
    </div>
  )
}
