"use client"

import { TrendingUp } from "lucide-react"
import { cn } from "@/lib/utils"

type ReportSummaryCardProps = {
  label: string
  value: string
  subLabel?: string
  icon?: React.ReactNode
  color?: "purple" | "green" | "red" | "blue" | "amber"
  className?: string
}

const colorMap = {
  purple: {
    bg: "bg-purple-50",
    text: "text-[#7c3aed]",
    icon: "bg-purple-100 text-[#7c3aed]",
    border: "border-purple-100",
  },
  green: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    icon: "bg-emerald-100 text-emerald-600",
    border: "border-emerald-100",
  },
  red: {
    bg: "bg-rose-50",
    text: "text-rose-700",
    icon: "bg-rose-100 text-rose-500",
    border: "border-rose-100",
  },
  blue: {
    bg: "bg-sky-50",
    text: "text-sky-700",
    icon: "bg-sky-100 text-sky-500",
    border: "border-sky-100",
  },
  amber: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    icon: "bg-amber-100 text-amber-500",
    border: "border-amber-100",
  },
}

export function ReportSummaryCard({
  label,
  value,
  subLabel,
  icon,
  color = "purple",
  className,
}: ReportSummaryCardProps) {
  const c = colorMap[color]
  return (
    <div
      className={cn(
        "flex items-center gap-3.5 rounded-2xl border bg-white p-4 shadow-md shadow-purple-950/5 transition hover:shadow-lg hover:shadow-purple-950/8",
        c.border,
        className,
      )}
    >
      <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", c.icon)}>
        {icon ?? <TrendingUp className="size-5" />}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
        <p className={cn("text-xl font-bold tracking-tight truncate", c.text)}>{value}</p>
        {subLabel && (
          <p className="text-[11px] text-slate-400 mt-0.5">{subLabel}</p>
        )}
      </div>
    </div>
  )
}
