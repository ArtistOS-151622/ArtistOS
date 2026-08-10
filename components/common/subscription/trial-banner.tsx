"use client"

import { useRouter } from "next/navigation"
import { Crown, X, Zap } from "lucide-react"
import { useState } from "react"

type Props = {
  daysLeft: number
}

export function TrialBanner({ daysLeft }: Props) {
  const router = useRouter()
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  // Color shifts: green → amber → red as days decrease
  const urgency =
    daysLeft <= 3
      ? {
          bg: "bg-gradient-to-r from-red-500 to-rose-600",
          text: "text-white",
          pill: "bg-white/20 text-white",
        }
      : daysLeft <= 7
      ? {
          bg: "bg-gradient-to-r from-amber-400 to-orange-500",
          text: "text-white",
          pill: "bg-white/20 text-white",
        }
      : {
          bg: "bg-gradient-to-r from-[#7c3aed] to-[#6d28d9]",
          text: "text-white",
          pill: "bg-white/15 text-white",
        }

  return (
    <div
      className={`relative flex items-center justify-between gap-3 rounded-xl px-4 py-2.5 text-sm mb-3 ${urgency.bg} ${urgency.text} shadow-md`}
    >
      {/* Left: icon + message */}
      <div className="flex items-center gap-2.5 min-w-0">
        <Zap className="size-4 shrink-0" />
        <span className="font-medium truncate">
          {daysLeft === 0
            ? "Your free trial ends today!"
            : `${daysLeft} day${daysLeft === 1 ? "" : "s"} left in your free trial`}
        </span>
      </div>

      {/* Right: CTA + dismiss */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => router.push("/billing")}
          className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold transition-all hover:scale-105 ${urgency.pill}`}
        >
          <Crown className="size-3" /> Upgrade
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="rounded-full p-1 hover:bg-white/20 transition-colors"
          aria-label="Dismiss banner"
        >
          <X className="size-3.5" />
        </button>
      </div>
    </div>
  )
}
