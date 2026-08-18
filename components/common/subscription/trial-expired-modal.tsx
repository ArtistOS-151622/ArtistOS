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

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Blurred backdrop — clicking it also closes the modal */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal card */}
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl shadow-2xl">
        {/* Gradient header */}
        <div className={`relative px-8 pt-10 pb-8 text-white text-center overflow-hidden ${isHalted ? 'bg-gradient-to-br from-red-600 via-rose-600 to-red-800' : 'bg-gradient-to-br from-[#7c3aed] via-[#6d28d9] to-[#4c1d95]'}`}>
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
            <Sparkles className="size-3" /> {isHalted ? "Payment Failed" : "Free Trial Ended"}
          </div>

          <h2 className="relative text-2xl font-bold leading-tight mb-2">
            {isHalted ? "Your Subscription is Paused" : "Your Free Trial Has Expired"}
          </h2>
          <p className="relative text-sm text-white/90 font-medium leading-relaxed">
            {isHalted 
              ? "Your payment has failed three times. Please update your payment details or contact us to continue using this service."
              : "Your 30-day free trial is over. Upgrade to a plan to continue using all features of ArtistOS."}
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
