"use client"

import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from "recharts"

import { ChartContainer, type ChartConfig } from "@/components/ui/chart"
import type { QuotaInfo } from "@/lib/portfolio/types"
import { cn } from "@/lib/utils"

type StorageMeterProps = {
  quota: QuotaInfo | null
  compact?: boolean
  className?: string
  theme?: "light" | "dark"
}

const chartConfig = {
  used: {
    label: "Used Space",
    color: "#8b5cf6",
  },
  remaining: {
    label: "Free Space",
    color: "#334155",
  },
} satisfies ChartConfig

export function StorageMeter({ quota, compact, className, theme = "light" }: StorageMeterProps) {
  if (!quota) return null

  const pct = Math.min(100, Math.max(0, quota.percentage_used))
  const isDark = theme === "dark"

  const chartData = [
    {
      category: "Storage",
      used: quota.used_bytes || 1,
      remaining: Math.max(0, quota.remaining_bytes),
    },
  ]

  const usedColor = pct >= 100 ? "#f43f5e" : pct >= 80 ? "#f59e0b" : "#8b5cf6"
  const freeColor = isDark ? "#334155" : "#e2e8f0"

  return (
    <div className={cn("space-y-2.5", className)}>
      {!compact && (
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span className={cn("text-xs font-extrabold tracking-tight", isDark ? "text-white" : "text-slate-900")}>
              Storage Consumption
            </span>
            <span className={cn("rounded-full px-2 py-0.5 text-[9px] font-black tracking-wider uppercase border", isDark ? "bg-purple-500/20 text-purple-200 border-purple-400/30" : "bg-purple-50 text-[#7c3aed] border-purple-100")}>
              {pct.toFixed(1)}% Used
            </span>
          </div>
          <span className={cn("text-xs font-bold", isDark ? "text-purple-200" : "text-slate-700")}>
            {quota.used_bytes_human} <span className="text-slate-400 font-normal">/ {quota.total_bytes_human}</span>
          </span>
        </div>
      )}

      {/* Shadcn Stacked Bar Chart Graph */}
      <div className="w-full">
        <ChartContainer config={chartConfig} className="h-3 sm:h-3.5 w-full min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
            >
              <XAxis type="number" hide domain={[0, quota.total_bytes || 1]} />
              <YAxis type="category" dataKey="category" hide />
              <Bar
                dataKey="used"
                stackId="storage"
                fill={usedColor}
                radius={pct >= 100 ? [4, 4, 4, 4] : [4, 0, 0, 4]}
              />
              <Bar
                dataKey="remaining"
                stackId="storage"
                fill={freeColor}
                radius={pct >= 100 ? [0, 0, 0, 0] : [0, 4, 4, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </div>

      {!compact && (
        <div className="flex items-center justify-between text-[11px] pt-0.5">
          <span className={cn("font-medium", isDark ? "text-slate-300" : "text-slate-500")}>
            {quota.remaining_bytes_human} free space remaining
          </span>
          {quota.subscription_status && quota.subscription_status !== "none" && (
            <span className="rounded-full bg-purple-50 border border-purple-200 px-2 py-0.5 text-[9px] font-black text-[#7c3aed] uppercase tracking-wider">
              {quota.subscription_status} Plan
            </span>
          )}
        </div>
      )}
    </div>
  )
}
