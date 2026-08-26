"use client"

import { useState } from "react"
import {
  Users,
  Flower2,
  CreditCard,
  CalendarDays,
  X,
} from "lucide-react"
import {
  PageHeader,
} from "@/components/common/dashboard/dashboard-header-context"
import { Button } from "@/components/ui/button"
import { ReportCustomerTab } from "@/components/common/reports/report-customer-tab"
import { ReportServiceTab } from "@/components/common/reports/report-service-tab"
import { ReportPaymentTab } from "@/components/common/reports/report-payment-tab"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

type Tab = "customers" | "services" | "payments"
type DateRange = { start: string; end: string } | null

const QUICK_RANGES = [
  {
    label: "This Month",
    getValue: () => {
      const now = new Date()
      return {
        start: new Date(now.getFullYear(), now.getMonth(), 1)
          .toISOString()
          .slice(0, 10),
        end: new Date(now.getFullYear(), now.getMonth() + 1, 0)
          .toISOString()
          .slice(0, 10),
      }
    },
  },
  {
    label: "Last Month",
    getValue: () => {
      const now = new Date()
      return {
        start: new Date(now.getFullYear(), now.getMonth() - 1, 1)
          .toISOString()
          .slice(0, 10),
        end: new Date(now.getFullYear(), now.getMonth(), 0)
          .toISOString()
          .slice(0, 10),
      }
    },
  },
  {
    label: "Last 3 Months",
    getValue: () => {
      const now = new Date()
      const start = new Date(now)
      start.setMonth(start.getMonth() - 3)
      return {
        start: start.toISOString().slice(0, 10),
        end: now.toISOString().slice(0, 10),
      }
    },
  },
  {
    label: "This Year",
    getValue: () => {
      const now = new Date()
      return {
        start: new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10),
        end: now.toISOString().slice(0, 10),
      }
    },
  },
]

const TABS: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "customers", label: "Customers", icon: Users },
  { id: "services", label: "Services", icon: Flower2 },
  { id: "payments", label: "Payments", icon: CreditCard },
]

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("customers")
  const [dateRange, setDateRange] = useState<DateRange>(null)
  const [activeQuickRange, setActiveQuickRange] = useState<string | null>(null)

  function applyQuickRange(label: string | null, range: DateRange) {
    setDateRange(range)
    setActiveQuickRange(label)
  }

  return (
    <>
      <PageHeader
        title="Reports & Analytics"
        description="Comprehensive insights across your client base, popular services, and payment collections."
      />

      <div className="space-y-5 pb-12 w-full max-w-full min-w-0 overflow-x-hidden">
        {/* Navigation & Global Filters Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/60 p-1.5 sm:p-2 rounded-2xl border border-slate-200/80 shadow-xs w-full min-w-0">
          {/* Segmented Tab Switcher */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-xl shadow-xs border border-slate-200/60 w-full sm:w-auto min-w-0">
            {TABS.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex-1 sm:flex-initial flex items-center justify-center gap-1.5 sm:gap-2 rounded-lg px-2.5 sm:px-4 py-2 text-xs sm:text-sm font-bold transition-all duration-150 min-w-0",
                    isActive
                      ? "bg-[#7c3aed] text-white shadow-sm shadow-purple-500/25"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  )}
                >
                  <Icon className={cn("size-3.5 sm:size-4 shrink-0", isActive ? "text-white" : "text-slate-400")} />
                  <span className="truncate">{tab.label}</span>
                </button>
              )
            })}
          </div>

          {/* Date Filter & Presets */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end min-w-0">
            {dateRange && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => applyQuickRange(null, null)}
                className="h-10 rounded-xl px-2.5 text-xs font-bold text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition shrink-0"
              >
                <X className="size-3.5 mr-1" />
                Clear
              </Button>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger className="inline-flex h-10 items-center justify-between sm:justify-start gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs sm:text-sm font-bold text-slate-700 shadow-xs hover:bg-slate-50 transition flex-1 sm:flex-initial min-w-0">
                <div className="flex items-center gap-2 min-w-0 truncate">
                  <CalendarDays
                    className={cn(
                      "size-4 shrink-0",
                      activeQuickRange ? "text-[#7c3aed]" : "text-slate-400"
                    )}
                  />
                  <span className="truncate">
                    {activeQuickRange ? `Period: ${activeQuickRange}` : "Date: All Time"}
                  </span>
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-2xl w-52 p-1.5">
                <DropdownMenuRadioGroup
                  value={activeQuickRange || "all"}
                  onValueChange={(val) => {
                    if (val === "all") {
                      applyQuickRange(null, null)
                    } else {
                      const r = QUICK_RANGES.find((x) => x.label === val)
                      if (r) {
                        applyQuickRange(r.label, r.getValue())
                      }
                    }
                  }}
                >
                  <DropdownMenuRadioItem
                    value="all"
                    className="rounded-xl cursor-pointer font-medium text-xs py-2"
                  >
                    All Time
                  </DropdownMenuRadioItem>
                  {QUICK_RANGES.map((r) => (
                    <DropdownMenuRadioItem
                      key={r.label}
                      value={r.label}
                      className="rounded-xl cursor-pointer font-medium text-xs py-2"
                    >
                      {r.label}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Tab Content */}
        <div className="w-full min-w-0 max-w-full overflow-x-hidden">
          {activeTab === "customers" && (
            <ReportCustomerTab dateRange={dateRange} />
          )}
          {activeTab === "services" && (
            <ReportServiceTab dateRange={dateRange} />
          )}
          {activeTab === "payments" && (
            <ReportPaymentTab dateRange={dateRange} />
          )}
        </div>
      </div>
    </>
  )
}
