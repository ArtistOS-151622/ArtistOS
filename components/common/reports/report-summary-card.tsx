"use client"

import * as React from "react"
import { TrendingUp, ArrowUpRight, ArrowDownRight } from "lucide-react"
import { cn } from "@/lib/utils"

type ReportSummaryCardProps = {
  label: string
  value: string
  subLabel?: string
  icon?: React.ReactNode
  color?: "purple" | "green" | "red" | "blue" | "amber" | "indigo"
  trend?: {
    value: string
    isPositive?: boolean
  }
  className?: string
}

const colorMap = {
  purple: {
    bg: "bg-purple-500/[0.04]",
    hoverBg: "hover:bg-purple-500/[0.07]",
    text: "text-[#7c3aed]",
    iconBg: "bg-purple-100 text-[#7c3aed] ring-1 ring-purple-200/70",
    border: "border-purple-100/80",
    accent: "bg-purple-500",
  },
  green: {
    bg: "bg-emerald-500/[0.04]",
    hoverBg: "hover:bg-emerald-500/[0.07]",
    text: "text-emerald-700",
    iconBg: "bg-emerald-100 text-emerald-600 ring-1 ring-emerald-200/70",
    border: "border-emerald-100/80",
    accent: "bg-emerald-500",
  },
  red: {
    bg: "bg-rose-500/[0.04]",
    hoverBg: "hover:bg-rose-500/[0.07]",
    text: "text-rose-700",
    iconBg: "bg-rose-100 text-rose-500 ring-1 ring-rose-200/70",
    border: "border-rose-100/80",
    accent: "bg-rose-500",
  },
  blue: {
    bg: "bg-sky-500/[0.04]",
    hoverBg: "hover:bg-sky-500/[0.07]",
    text: "text-sky-700",
    iconBg: "bg-sky-100 text-sky-500 ring-1 ring-sky-200/70",
    border: "border-sky-100/80",
    accent: "bg-sky-500",
  },
  amber: {
    bg: "bg-amber-500/[0.04]",
    hoverBg: "hover:bg-amber-500/[0.07]",
    text: "text-amber-700",
    iconBg: "bg-amber-100 text-amber-500 ring-1 ring-amber-200/70",
    border: "border-amber-100/80",
    accent: "bg-amber-500",
  },
  indigo: {
    bg: "bg-indigo-500/[0.04]",
    hoverBg: "hover:bg-indigo-500/[0.07]",
    text: "text-indigo-700",
    iconBg: "bg-indigo-100 text-indigo-500 ring-1 ring-indigo-200/70",
    border: "border-indigo-100/80",
    accent: "bg-indigo-500",
  },
}

export function ReportSummaryCard({
  label,
  value,
  subLabel,
  icon,
  color = "purple",
  trend,
  className,
}: ReportSummaryCardProps) {
  const c = colorMap[color]
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border bg-white p-3 sm:p-4 lg:p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md w-full min-w-0 max-w-full",
        c.border,
        className
      )}
    >
      <div className="flex items-start justify-between gap-2 min-w-0">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-slate-400 truncate">
            {label}
          </p>
          <p className={cn("mt-0.5 sm:mt-1 text-lg sm:text-2xl font-bold tracking-tight truncate", c.text)}>
            {value}
          </p>
          {(subLabel || trend) && (
            <div className="mt-1 flex items-center gap-1.5 flex-wrap min-w-0">
              {trend && (
                <span
                  className={cn(
                    "inline-flex items-center text-[10px] sm:text-[11px] font-semibold px-1.5 py-0.5 rounded-md shrink-0",
                    trend.isPositive
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-rose-50 text-rose-700"
                  )}
                >
                  {trend.isPositive ? (
                    <ArrowUpRight className="mr-0.5 size-2.5 sm:size-3" />
                  ) : (
                    <ArrowDownRight className="mr-0.5 size-2.5 sm:size-3" />
                  )}
                  {trend.value}
                </span>
              )}
              {subLabel && (
                <p className="text-[11px] sm:text-xs text-slate-400 font-medium truncate">{subLabel}</p>
              )}
            </div>
          )}
        </div>
        <div
          className={cn(
            "flex size-8 sm:size-10 lg:size-11 shrink-0 items-center justify-center rounded-xl sm:rounded-2xl shadow-xs",
            c.iconBg
          )}
        >
          {icon ?? <TrendingUp className="size-4 sm:size-5" />}
        </div>
      </div>
    </div>
  )
}
