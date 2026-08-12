"use client"

import { useState } from "react"
import { BarChart3, Users, Flower2, CreditCard, CalendarDays, X } from "lucide-react"
import { PageHeader, HeaderPortal } from "@/components/common/dashboard/dashboard-header-context"
import { Button } from "@/components/ui/button"
import { ReportCustomerTab } from "@/components/common/reports/report-customer-tab"
import { ReportServiceTab } from "@/components/common/reports/report-service-tab"
import { ReportPaymentTab } from "@/components/common/reports/report-payment-tab"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup,
  DropdownMenuRadioItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

type Tab = "customers" | "services" | "payments"
type DateRange = { start: string; end: string } | null

const QUICK_RANGES = [
  { label: "This Month", getValue: () => {
    const now = new Date()
    return {
      start: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10),
      end: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10),
    }
  }},
  { label: "Last Month", getValue: () => {
    const now = new Date()
    return {
      start: new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 10),
      end: new Date(now.getFullYear(), now.getMonth(), 0).toISOString().slice(0, 10),
    }
  }},
  { label: "Last 3 Months", getValue: () => {
    const now = new Date()
    const start = new Date(now)
    start.setMonth(start.getMonth() - 3)
    return {
      start: start.toISOString().slice(0, 10),
      end: now.toISOString().slice(0, 10),
    }
  }},
  { label: "This Year", getValue: () => {
    const now = new Date()
    return {
      start: new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10),
      end: now.toISOString().slice(0, 10),
    }
  }},
]

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "customers", label: "Customers", icon: <Users className="size-4" /> },
  { id: "services",  label: "Services",  icon: <Flower2 className="size-4" /> },
  { id: "payments",  label: "Payments",  icon: <CreditCard className="size-4" /> },
]

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("customers")
  const [dateRange, setDateRange] = useState<DateRange>(null)
  const [activeQuickRange, setActiveQuickRange] = useState<string | null>(null)

  function applyQuickRange(label: string, range: DateRange) {
    if (activeQuickRange === label) {
      setDateRange(null)
      setActiveQuickRange(null)
    } else {
      setDateRange(range)
      setActiveQuickRange(label)
    }
  }

  return (
    <>
      <PageHeader
        title="Reports"
        description="Analytics and insights across your customers, services, and payments."
      />

      <HeaderPortal
        actions={
          <div className="flex items-center gap-2">
            <BarChart3 className="size-5 text-[#7c3aed]" />
          </div>
        }
      />

      <div className="space-y-6 pb-12">
        {/* Unified Sub-Header */}
        <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between">
          {/* Tab switcher */}
          <div className="flex rounded-2xl border border-slate-200 bg-white p-1 shadow-sm self-start">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all",
                  activeTab === tab.id
                    ? "bg-[#7c3aed] text-white shadow-md shadow-purple-500/25"
                    : "text-slate-500 hover:text-slate-800"
                )}
              >
                {tab.icon}
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Global Date Filter */}
          <div className="flex items-center gap-2">
            {dateRange && (
              <button
                onClick={() => { setDateRange(null); setActiveQuickRange(null) }}
                className="flex items-center gap-1 rounded-2xl bg-white border border-slate-200 px-3 h-11 text-sm font-semibold text-slate-500 hover:text-slate-800 shadow-sm transition shrink-0"
              >
                <X className="size-4" /> Clear
              </button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger className="inline-flex h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition shrink-0">
                <CalendarDays className={cn("size-4", activeQuickRange ? "text-[#7c3aed]" : "text-slate-400")} />
                {activeQuickRange || "All Time"}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-2xl w-48">
                <DropdownMenuRadioGroup
                  value={activeQuickRange || "all"}
                  onValueChange={(val) => {
                    if (val === "all") {
                      setDateRange(null)
                      setActiveQuickRange(null)
                    } else {
                      const r = QUICK_RANGES.find(x => x.label === val)
                      if (r) {
                        setDateRange(r.getValue())
                        setActiveQuickRange(r.label)
                      }
                    }
                  }}
                >
                  <DropdownMenuRadioItem value="all" className="rounded-xl cursor-pointer">All Time</DropdownMenuRadioItem>
                  {QUICK_RANGES.map(r => (
                    <DropdownMenuRadioItem key={r.label} value={r.label} className="rounded-xl cursor-pointer">
                      {r.label}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === "customers" && <ReportCustomerTab dateRange={dateRange} />}
        {activeTab === "services"  && <ReportServiceTab  dateRange={dateRange} />}
        {activeTab === "payments"  && <ReportPaymentTab  dateRange={dateRange} />}
      </div>
    </>
  )
}
