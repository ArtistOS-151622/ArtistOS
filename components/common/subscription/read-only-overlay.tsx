"use client"

import { usePathname, useRouter } from "next/navigation"
import { Lock, Crown, ArrowRight } from "lucide-react"

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
    <div className="fixed bottom-[4.75rem] inset-x-3 sm:inset-x-6 lg:bottom-auto lg:top-3 lg:left-1/2 lg:-translate-x-1/2 lg:w-full lg:max-w-2xl z-[9000] animate-in fade-in slide-in-from-bottom-3 lg:slide-in-from-top-3 duration-300 pointer-events-auto ">
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-red-700 p-3 sm:px-5 sm:py-3 text-white shadow-2xl shadow-red-950/40 border border-white/25 backdrop-blur-md mb-3">
        {/* Subtle decorative glow orb */}
        <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/15 blur-xl" />
        <div className="pointer-events-none absolute -left-6 -bottom-6 h-24 w-24 rounded-full bg-black/10 blur-lg" />

        <div className="relative flex items-center justify-between gap-3">
          {/* Left: Icon & status message */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative flex size-9 shrink-0 items-center justify-center rounded-xl bg-white/20 border border-white/30 text-white shadow-inner backdrop-blur-sm">
              <Lock className="size-4.5" />
              <span className="absolute -top-1 -right-1 flex size-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-300 opacity-80" />
                <span className="relative inline-flex rounded-full size-2.5 bg-amber-400" />
              </span>
            </div>

            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-xs sm:text-sm tracking-tight text-white flex items-center gap-1">
                  Subscription Expired
                </span>
                <span className="hidden sm:inline text-red-200/60">•</span>
                <span className="hidden sm:inline text-red-100 text-xs sm:text-sm font-medium truncate">
                  You are in read-only mode.
                </span>
              </div>
              <p className="text-[11px] text-red-100/90 sm:hidden truncate font-medium">
                Read-only mode active
              </p>
            </div>
          </div>

          {/* Right: High-contrast Upgrade CTA Button */}
          <button
            onClick={() => router.push("/billing")}
            className="flex items-center gap-1.5 rounded-xl bg-white hover:bg-red-50 text-red-600 hover:text-red-700 px-3.5 py-1.5 sm:px-4 sm:py-2 text-xs font-bold shadow-md shadow-black/15 transition-all duration-200 hover:scale-[1.03] active:scale-[0.97] shrink-0 cursor-pointer"
          >
            <Crown className="size-3.5 text-amber-500" />
            <span>Upgrade</span>
            <ArrowRight className="size-3.5 opacity-80 hidden sm:inline" />
          </button>
        </div>
      </div>
    </div>
  )
}


