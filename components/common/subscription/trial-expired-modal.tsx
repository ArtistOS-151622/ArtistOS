"use client"

import { useRouter } from "next/navigation"
import { Crown, Lock, Sparkles, X } from "lucide-react"
import { Button } from "@/components/ui/button"

type Props = {
  onClose: () => void
  subscriptionStatus?: string
}

export function TrialExpiredModal({ onClose, subscriptionStatus = "none" }: Props) {
  const router = useRouter()

  const isHalted = subscriptionStatus === "halted"
  const isCancelled = subscriptionStatus === "cancelled"

  const badgeText = isHalted
    ? "Payment Failed"
    : isCancelled
      ? "Plan Cancelled"
      : "1-Month Trial Ended"

  const titleText = isHalted
    ? "Your Subscription is Paused"
    : isCancelled
      ? "Subscription Ended"
      : "Your 1-Month Free Trial Has Expired"

  const descText = isHalted
    ? "Your subscription payment failed and your account is now in read-only mode. Please update your payment details or choose a plan to continue."
    : isCancelled
      ? "Your subscription has ended and your account is now in read-only mode. Your data is safe. Upgrade to restore full access."
      : "Your 1-month (30-day) free trial is over. Your account is now in read-only mode. Upgrade to a plan to continue creating and managing bookings."

  return (
    <div data-guard-exempt="true" className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Blurred backdrop — clicking it also closes the modal */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal card */}
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl shadow-2xl">
        {/* Gradient header */}
        <div className={`relative px-8 pt-10 pb-8 text-white text-center overflow-hidden ${isHalted || isCancelled ? 'bg-gradient-to-br from-red-600 via-rose-600 to-red-800' : 'bg-gradient-to-br from-[#7c3aed] via-[#6d28d9] to-[#4c1d95]'}`}>
          {/* Decorative orbs */}
          <div className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-white/10 blur-3xl" />
          <div className="pointer-events-none absolute -left-10 bottom-0 h-32 w-32 rounded-full bg-white/5 blur-2xl" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 flex size-8 items-center justify-center rounded-full bg-white/15 hover:bg-white/25 transition-colors"
            aria-label="Close"
          >
            <X className="size-4 text-white" />
          </button>

          {/* Icon */}
          <div className="relative mx-auto mb-5 flex size-16 items-center justify-center rounded-2xl bg-white/15 shadow-inner">
            <Lock className="size-7 text-white" />
          </div>

          {/* Badge */}
          <div className="relative inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-widest mb-4">
            <Sparkles className="size-3" /> {badgeText}
          </div>

          <h2 className="relative text-2xl font-bold leading-tight mb-2">
            {titleText}
          </h2>
          <p className="relative text-sm text-white/90 font-medium leading-relaxed">
            {descText}
          </p>
        </div>

        {/* Body */}
        <div className="bg-white px-8 py-7 space-y-4">
          {/* Feature hints */}
          <div className="grid grid-cols-2 gap-3">
            {[
              "Booking Calendar",
              "Client CRM",
              "Payment Tracking",
              "Portfolio Gallery",
              "Business Reports",
              "Priority Support",
            ].map((f) => (
              <div
                key={f}
                className="flex items-center gap-2 text-xs text-slate-600"
              >
                <div className="size-1.5 rounded-full bg-[#7c3aed] shrink-0" />
                {f}
              </div>
            ))}
          </div>

          <div className="pt-2 space-y-3">
            <Button
              onClick={() => router.push("/billing")}
              className="w-full h-12 rounded-2xl bg-gradient-to-r from-[#7c3aed] to-[#6d28d9] hover:from-[#6d28d9] hover:to-[#5b21b6] text-white font-bold shadow-lg shadow-purple-600/30 text-sm transition-all duration-200"
            >
              <Crown className="size-4 mr-2" />
              Upgrade Now — View Plans
            </Button>

            <p className="text-center text-xs text-slate-400">
              Your data is safe. Upgrade anytime to restore full access.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
