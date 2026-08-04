"use client"

import { Progress } from "@/components/ui/progress"
import type { QuotaInfo } from "@/lib/portfolio/types"
import { cn } from "@/lib/utils"

type StorageMeterProps = {
  quota: QuotaInfo | null
  compact?: boolean
  className?: string
}

export function StorageMeter({ quota, compact, className }: StorageMeterProps) {
  if (!quota) return null

  const pct = quota.percentage_used
  const barColor =
    pct >= 100
      ? "[&>div]:bg-rose-500"
      : pct >= 80
      ? "[&>div]:bg-amber-500"
      : "[&>div]:bg-[#7c3aed]"

  return (
    <div className={cn("space-y-2.5", className)}>
      {!compact && (
        <div className="flex items-center justify-between text-xs sm:text-sm">
          <span className="font-bold text-slate-900">Storage Consumption</span>
          <span className="font-semibold text-slate-600">
            {quota.used_bytes_human} <span className="text-slate-400">/ {quota.total_bytes_human}</span>
          </span>
        </div>
      )}
      <Progress value={pct} className={cn("h-2.5 bg-purple-100/80", barColor)} />
      {!compact && (
        <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 pt-0.5">
          <span className="font-medium text-slate-500">{quota.remaining_bytes_human} remaining</span>
          {quota.subscription_status !== "none" && (
            <span className="rounded-full bg-purple-50 border border-purple-100 px-2 py-0.5 text-[10px] font-extrabold text-[#7c3aed] uppercase tracking-wider">
              {quota.subscription_status} Plan
            </span>
          )}
        </div>
      )}
    </div>
  )
}
