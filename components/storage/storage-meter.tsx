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
    pct >= 100 ? "text-rose-500" : pct >= 80 ? "text-amber-500" : "text-emerald-500"

  return (
    <div className={cn("space-y-2", className)}>
      {!compact && (
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-slate-700">Storage</span>
          <span className="text-slate-500">
            {quota.used_bytes_human} / {quota.total_bytes_human}
          </span>
        </div>
      )}
      <Progress value={pct} className={cn("h-2.5 bg-slate-100", barColor)} />
      {!compact && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <span>{quota.remaining_bytes_human} remaining</span>
          {quota.subscription_status !== "none" && (
            <span className="rounded-full bg-purple-50 px-2 py-0.5 text-[#7c3aed] capitalize">
              {quota.subscription_status}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
