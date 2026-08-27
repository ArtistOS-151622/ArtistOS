"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import {
  Search,
  Wallet,
  AlertCircle,
  TrendingUp,
  CreditCard,
  Download,
  X,
  PieChart as PieChartIcon,
  CheckCircle2,
  ExternalLink,
  Receipt,
  Building2,
  Banknote,
  Smartphone,
  Phone,
  Calendar,
  MessageCircle,
  BookOpen,
  ChevronRight,
} from "lucide-react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { useIsMobile } from "@/lib/hooks/use-is-mobile"
import { ReportSummaryCard } from "./report-summary-card"
import { cn } from "@/lib/utils"

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n || 0)
}

function formatDate(d: string) {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

const PAYMENT_TYPE_COLORS: Record<string, string> = {
  Advance: "bg-blue-50 text-blue-700 border border-blue-200/80",
  Installment: "bg-amber-50 text-amber-700 border border-amber-200/80",
  "Final Payment": "bg-emerald-50 text-emerald-700 border border-emerald-200/80",
}

const STATUS_COLORS: Record<string, string> = {
  confirmed: "bg-blue-50 text-blue-700 border border-blue-200/80",
  pending: "bg-amber-50 text-amber-700 border border-amber-200/80",
  completed: "bg-emerald-50 text-emerald-700 border border-emerald-200/80",
  cancelled: "bg-rose-50 text-rose-700 border border-rose-200/80",
}

function getPaymentMethodIcon(method: string) {
  const lower = (method || "").toLowerCase()
  if (lower.includes("upi") || lower.includes("gpay") || lower.includes("phonepe") || lower.includes("paytm")) {
    return <Smartphone className="size-3.5 text-purple-600 shrink-0" />
  }
  if (lower.includes("cash")) {
    return <Banknote className="size-3.5 text-emerald-600 shrink-0" />
  }
  if (lower.includes("card") || lower.includes("credit") || lower.includes("debit")) {
    return <CreditCard className="size-3.5 text-blue-600 shrink-0" />
  }
  if (lower.includes("bank") || lower.includes("transfer") || lower.includes("neft") || lower.includes("rtgs")) {
    return <Building2 className="size-3.5 text-indigo-600 shrink-0" />
  }
  return <Receipt className="size-3.5 text-slate-400 shrink-0" />
}

type PaymentRow = {
  id: number
  payment_type: string
  payment_method: string
  amount: number
  payment_date: string
  remark: string | null
  booking_id: number
  booking_date: string
  booking_status: string
  customer_name: string
  customer_phone: string
  services: string[]
  total_billed: number
}

type PendingBooking = {
  booking_id: number
  booking_date: string
  booking_status: string
  customer_name: string
  customer_phone: string
  services: string[]
  total_billed: number
  total_paid: number
  balance_due: number
}

export function ReportPaymentTab({
  dateRange,
}: {
  dateRange: { start: string; end: string } | null
}) {
  const router = useRouter()
  const isMobile = useIsMobile()
  const [data, setData] = useState<{
    payments: PaymentRow[]
    pending_bookings: PendingBooking[]
    totals: any
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [paymentType, setPaymentType] = useState("all")
  const [view, setView] = useState<"all" | "pending">("all")
  const [selectedPayment, setSelectedPayment] = useState<PaymentRow | null>(null)
  const [selectedPending, setSelectedPending] = useState<PendingBooking | null>(null)

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(t)
  }, [search])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        search: debouncedSearch,
        payment_type: paymentType,
        view,
      })
      if (dateRange) {
        params.set("start_date", dateRange.start)
        params.set("end_date", dateRange.end)
      }
      const res = await fetch(`/api/reports/payments?${params}`)
      const json = await res.json()
      if (res.ok) setData(json)
    } catch {
      /* silent */
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, paymentType, view, dateRange])

  useEffect(() => {
    load()
  }, [load])

  const totals = data?.totals
  const payments = data?.payments ?? []
  const pendingBookings = data?.pending_bookings ?? []

  // Donut chart of payment type breakdown
  const paymentTypePieData = useMemo(() => {
    if (!totals) return []
    const advance = totals.total_advance || 0
    const finalVal = totals.total_final || 0
    const totalCollected = totals.total_collected || 0
    const installment = Math.max(0, totalCollected - advance - finalVal)

    const list = []
    if (advance > 0) list.push({ name: "Advance", value: advance, fill: "#0ea5e9" })
    if (installment > 0) list.push({ name: "Installment", value: installment, fill: "#f59e0b" })
    if (finalVal > 0) list.push({ name: "Final Payment", value: finalVal, fill: "#10b981" })
    return list
  }, [totals])

  // Payment methods breakdown
  const paymentMethodsBarData = useMemo(() => {
    const map = new Map<string, number>()
    payments.forEach((p) => {
      const m = p.payment_method || "Other"
      map.set(m, (map.get(m) || 0) + Number(p.amount || 0))
    })
    return Array.from(map.entries())
      .map(([method, amount]) => ({
        method,
        amount,
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5)
  }, [payments])

  // Export CSV
  function exportCSV() {
    if (view === "pending") {
      if (!pendingBookings.length) return
      const headers = [
        "Customer Name",
        "Phone",
        "Booking Date",
        "Status",
        "Services",
        "Total Billed (INR)",
        "Total Paid (INR)",
        "Balance Due (INR)",
      ]
      const rows = pendingBookings.map((b) => [
        `"${b.customer_name.replace(/"/g, '""')}"`,
        `"${b.customer_phone || ""}"`,
        b.booking_date,
        b.booking_status,
        `"${b.services.join(", ")}"`,
        b.total_billed,
        b.total_paid,
        b.balance_due,
      ])
      const csvContent =
        "data:text/csv;charset=utf-8," +
        [headers.join(","), ...rows.map((e) => e.join(","))].join("\n")
      const encodedUri = encodeURI(csvContent)
      const link = document.createElement("a")
      link.setAttribute("href", encodedUri)
      link.setAttribute(
        "download",
        `pending_dues_report_${new Date().toISOString().slice(0, 10)}.csv`
      )
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } else {
      if (!payments.length) return
      const headers = [
        "Payment Date",
        "Customer Name",
        "Phone",
        "Booking Date",
        "Payment Type",
        "Payment Method",
        "Amount (INR)",
        "Remark",
      ]
      const rows = payments.map((p) => [
        p.payment_date,
        `"${p.customer_name.replace(/"/g, '""')}"`,
        `"${p.customer_phone || ""}"`,
        p.booking_date,
        p.payment_type,
        p.payment_method,
        p.amount,
        `"${(p.remark || "").replace(/"/g, '""')}"`,
      ])
      const csvContent =
        "data:text/csv;charset=utf-8," +
        [headers.join(","), ...rows.map((e) => e.join(","))].join("\n")
      const encodedUri = encodeURI(csvContent)
      const link = document.createElement("a")
      link.setAttribute("href", encodedUri)
      link.setAttribute(
        "download",
        `payments_report_${new Date().toISOString().slice(0, 10)}.csv`
      )
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  return (
    <div className="space-y-5 w-full min-w-0 max-w-full overflow-x-hidden">
      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3.5 lg:grid-cols-4 w-full min-w-0">
        <ReportSummaryCard
          label="Total Collected"
          value={totals ? formatCurrency(totals.total_collected) : "—"}
          subLabel={totals ? "Net cash flow" : undefined}
          icon={<Wallet className="size-4 sm:size-5" />}
          color="green"
        />
        <ReportSummaryCard
          label="Advance Paid"
          value={totals ? formatCurrency(totals.total_advance) : "—"}
          subLabel={totals ? "Secured upfront" : undefined}
          icon={<TrendingUp className="size-4 sm:size-5" />}
          color="blue"
        />
        <ReportSummaryCard
          label="Final Payments"
          value={totals ? formatCurrency(totals.total_final) : "—"}
          subLabel={totals ? "Settlements" : undefined}
          icon={<CreditCard className="size-4 sm:size-5" />}
          color="purple"
        />
        <ReportSummaryCard
          label="Total Pending Due"
          value={totals ? formatCurrency(totals.total_pending) : "—"}
          subLabel={totals ? `${totals.pending_count} bookings due` : undefined}
          icon={<AlertCircle className="size-4 sm:size-5" />}
          color={totals?.total_pending > 0 ? "red" : "green"}
        />
      </div>

      {/* Visual Analytics Section */}
      {payments.length > 0 && !loading && (
        <div className="grid gap-4 lg:grid-cols-3 w-full min-w-0 max-w-full overflow-hidden">
          {/* Payment Methods Bar Chart */}
          <div className="lg:col-span-2 rounded-2xl border border-slate-200/80 bg-white p-3.5 sm:p-5 shadow-sm min-w-0 max-w-full overflow-hidden w-full">
            <div className="flex items-center justify-between pb-2.5 mb-2 border-b border-slate-100 min-w-0 gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="flex size-7 sm:size-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                  <CreditCard className="size-4" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs sm:text-sm font-bold text-slate-800 truncate">
                    Collections by Payment Method
                  </h4>
                  <p className="text-[11px] text-slate-400 truncate">
                    UPI, Cash, Card & Bank
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] sm:text-xs shrink-0">
                <div className="size-2 rounded-full bg-[#10b981]" />
                <span className="text-slate-500 font-medium">Collected</span>
              </div>
            </div>

            <div className="h-[210px] w-full min-w-0 max-w-full overflow-hidden pt-1">
              <ChartContainer
                config={{
                  amount: { label: "Collected Amount", color: "#10b981" },
                }}
                className="aspect-auto h-full w-full min-w-0 max-w-full"
              >
                <BarChart
                  data={paymentMethodsBarData}
                  layout="vertical"
                  margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    horizontal={false}
                    stroke="#f1f5f9"
                  />
                  <XAxis
                    type="number"
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val) =>
                      `₹${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`
                    }
                    tick={{ fill: "#94a3b8", fontSize: 10 }}
                  />
                  <YAxis
                    type="category"
                    dataKey="method"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "#475569", fontSize: 10, fontWeight: 500 }}
                    width={65}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(val) => formatCurrency(Number(val))}
                      />
                    }
                  />
                  <Bar
                    dataKey="amount"
                    fill="#10b981"
                    radius={[0, 4, 4, 0]}
                    barSize={14}
                  />
                </BarChart>
              </ChartContainer>
            </div>
          </div>

          {/* Payment Type Split Donut */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-3.5 sm:p-5 shadow-sm flex flex-col justify-between min-w-0 max-w-full overflow-hidden w-full">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 min-w-0 gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="flex size-7 sm:size-8 shrink-0 items-center justify-center rounded-lg bg-purple-50 text-[#7c3aed]">
                  <PieChartIcon className="size-4" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs sm:text-sm font-bold text-slate-800 truncate">
                    Payment Stages
                  </h4>
                  <p className="text-[11px] text-slate-400 truncate">
                    Advance vs Final
                  </p>
                </div>
              </div>
            </div>

            <div className="relative flex items-center justify-center py-3 min-w-0">
              <div className="h-[130px] w-[130px] flex items-center justify-center">
                <ChartContainer
                  config={{
                    value: { label: "Amount", color: "#7c3aed" },
                  }}
                  className="aspect-auto h-full w-full min-w-0"
                >
                  <PieChart>
                    <Pie
                      data={paymentTypePieData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={40}
                      outerRadius={58}
                      paddingAngle={3}
                      strokeWidth={2}
                      stroke="#fff"
                    >
                      {paymentTypePieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          formatter={(val) => formatCurrency(Number(val))}
                        />
                      }
                    />
                  </PieChart>
                </ChartContainer>
              </div>
            </div>

            <div className="space-y-1.5 pt-2 border-t border-slate-100 text-xs">
              {paymentTypePieData.map((item, i) => (
                <div key={i} className="flex items-center justify-between min-w-0 gap-2">
                  <div className="flex items-center gap-1.5 min-w-0 truncate">
                    <div
                      className="size-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: item.fill }}
                    />
                    <span className="text-slate-600 font-medium truncate">
                      {item.name}
                    </span>
                  </div>
                  <span className="font-bold text-slate-800 shrink-0">
                    {formatCurrency(item.value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Payment View Toggle & Controls */}
      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden w-full min-w-0 max-w-full">
        {/* Card Header & Filters */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 p-3 sm:p-4 border-b border-slate-100 bg-white w-full min-w-0">
          {/* View Switcher Tabs */}
          <div className="flex rounded-xl bg-slate-100/90 p-1 shrink-0 w-full sm:w-auto min-w-0">
            <button
              onClick={() => setView("all")}
              className={cn(
                "flex-1 sm:flex-none flex items-center justify-center gap-1.5 sm:gap-2 rounded-xl px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold transition-all whitespace-nowrap min-w-0",
                view === "all"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-500 hover:text-slate-700"
              )}
            >
              <CreditCard className="size-3.5 sm:size-4 shrink-0" />
              <span>All Payments</span>
            </button>
            <button
              onClick={() => setView("pending")}
              className={cn(
                "flex-1 sm:flex-none flex items-center justify-center gap-1.5 sm:gap-2 rounded-xl px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold transition-all whitespace-nowrap min-w-0",
                view === "pending"
                  ? "bg-rose-600 text-white shadow-xs"
                  : "text-slate-500 hover:text-slate-700"
              )}
            >
              <AlertCircle className="size-3.5 sm:size-4 shrink-0" />
              <span>Pending Due</span>
              {totals?.pending_count > 0 && (
                <span
                  className={cn(
                    "ml-1 rounded-full px-1.5 py-0.2 text-[10px] font-extrabold shrink-0",
                    view === "pending"
                      ? "bg-white/20 text-white"
                      : "bg-rose-100 text-rose-600"
                  )}
                >
                  {totals.pending_count}
                </span>
              )}
            </button>
          </div>

          {/* Search & Filters */}
          <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full xl:w-auto min-w-0">
            {view === "all" && (
              <>
                <div className="relative w-full sm:w-60 shrink-0 min-w-0">
                  <Search className="absolute left-3.5 top-3.5 size-4 text-slate-400 pointer-events-none" />
                  <Input
                    placeholder="Search customer or service…"
                    className="pl-10 pr-8 h-10 sm:h-11 rounded-xl border-slate-200 bg-slate-50/50 shadow-none focus-visible:bg-white w-full transition-colors text-xs sm:text-sm"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  {search && (
                    <button
                      onClick={() => setSearch("")}
                      className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                    >
                      <X className="size-4" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end min-w-0">
                  <DropdownMenu>
                    <DropdownMenuTrigger className="inline-flex h-10 sm:h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs sm:text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition flex-1 sm:flex-initial min-w-0 truncate">
                      <span className="truncate">
                        {paymentType === "all" ? "All Types" : paymentType}
                      </span>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="rounded-2xl w-48">
                      <DropdownMenuRadioGroup
                        value={paymentType}
                        onValueChange={setPaymentType}
                      >
                        <DropdownMenuRadioItem
                          value="all"
                          className="rounded-xl cursor-pointer font-medium text-xs"
                        >
                          All Types
                        </DropdownMenuRadioItem>
                        <DropdownMenuRadioItem
                          value="Advance"
                          className="rounded-xl cursor-pointer font-medium text-xs"
                        >
                          Advance
                        </DropdownMenuRadioItem>
                        <DropdownMenuRadioItem
                          value="Installment"
                          className="rounded-xl cursor-pointer font-medium text-xs"
                        >
                          Installment
                        </DropdownMenuRadioItem>
                        <DropdownMenuRadioItem
                          value="Final Payment"
                          className="rounded-xl cursor-pointer font-medium text-xs"
                        >
                          Final Payment
                        </DropdownMenuRadioItem>
                      </DropdownMenuRadioGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {payments.length > 0 && (
                    <Button
                      variant="outline"
                      onClick={exportCSV}
                      className="h-10 sm:h-11 rounded-xl border-slate-200 font-semibold text-slate-700 hover:bg-slate-50 shrink-0 text-xs sm:text-sm px-3"
                    >
                      <Download className="mr-1.5 size-3.5 text-slate-500" />
                      <span>Export</span>
                    </Button>
                  )}
                </div>
              </>
            )}

            {view === "pending" && pendingBookings.length > 0 && (
              <Button
                variant="outline"
                onClick={exportCSV}
                className="h-10 sm:h-11 rounded-xl border-slate-200 font-semibold text-slate-700 hover:bg-slate-50 shrink-0 w-full sm:w-auto text-xs sm:text-sm px-3"
              >
                <Download className="mr-1.5 size-3.5 text-slate-500" />
                <span>Export CSV</span>
              </Button>
            )}
          </div>
        </div>

        {/* Card Body */}
        <div className="bg-white w-full min-w-0">
          {loading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="h-16 rounded-xl bg-slate-100 animate-pulse"
                />
              ))}
            </div>
          ) : view === "pending" ? (
            /* Pending Bookings View */
            pendingBookings.length === 0 ? (
              <div className="flex flex-col items-center py-16 text-slate-400">
                <div className="flex size-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 mb-3">
                  <CheckCircle2 className="size-8" />
                </div>
                <p className="font-bold text-slate-700 text-base">
                  All customer payments are settled!
                </p>
                <p className="text-sm mt-1 text-slate-400">
                  No outstanding balances or overdue amounts.
                </p>
              </div>
            ) : (
              <>
                {/* Pending Desktop Table */}
                <div className="hidden md:block overflow-x-auto w-full">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 bg-rose-50/50">
                        <th className="text-left px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">
                          Customer
                        </th>
                        <th className="text-left px-4 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">
                          Booking Date
                        </th>
                        <th className="text-left px-4 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">
                          Services
                        </th>
                        <th className="text-right px-4 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">
                          Billed
                        </th>
                        <th className="text-right px-4 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">
                          Paid
                        </th>
                        <th className="text-right px-4 py-3.5 text-xs font-bold text-rose-600 uppercase tracking-wider">
                          Balance Due
                        </th>
                        <th className="px-4 py-3.5" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {pendingBookings.map((b) => (
                        <tr
                          key={b.booking_id}
                          onClick={() => setSelectedPending(b)}
                          className="hover:bg-rose-50/20 transition-colors cursor-pointer group"
                        >
                          <td className="px-5 py-3.5 max-w-[260px] whitespace-nowrap">
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                className="font-bold text-slate-900 group-hover:text-rose-600 transition-colors truncate max-w-[130px] lg:max-w-[180px] inline-block align-middle"
                                title={b.customer_name}
                              >
                                {b.customer_name}
                              </span>
                              {b.customer_phone && (
                                <>
                                  <span className="text-slate-300 shrink-0">·</span>
                                  <span className="text-xs text-slate-400 shrink-0 whitespace-nowrap">
                                    {b.customer_phone}
                                  </span>
                                </>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-slate-700">
                                {formatDate(b.booking_date)}
                              </span>
                              <span
                                className={cn(
                                  "text-[10px] font-bold px-2 py-0.5 rounded capitalize",
                                  STATUS_COLORS[b.booking_status]
                                )}
                              >
                                {b.booking_status}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <div className="flex flex-wrap gap-1 max-w-[200px]">
                              {b.services.slice(0, 2).map((s) => (
                                <span
                                  key={s}
                                  className="text-[10px] rounded-md bg-purple-50 text-[#7c3aed] px-2 py-0.5 font-medium border border-purple-100 truncate max-w-[100px]"
                                >
                                  {s}
                                </span>
                              ))}
                              {b.services.length > 2 && (
                                <span className="text-[10px] text-slate-400 font-medium px-1">
                                  +{b.services.length - 2}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3.5 text-right font-bold text-slate-800 whitespace-nowrap">
                            {formatCurrency(b.total_billed)}
                          </td>
                          <td className="px-4 py-3.5 text-right font-bold text-emerald-600 whitespace-nowrap">
                            {formatCurrency(b.total_paid)}
                          </td>
                          <td className="px-4 py-3.5 text-right whitespace-nowrap">
                            <span className="font-extrabold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200/80">
                              {formatCurrency(b.balance_due)}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-right whitespace-nowrap">
                            <div className="flex size-7 items-center justify-center rounded-lg bg-slate-50 text-slate-400 group-hover:bg-rose-100 group-hover:text-rose-600 transition-colors ml-auto">
                              <ChevronRight className="size-4" />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pending Mobile List */}
                <div className="md:hidden divide-y divide-slate-100 w-full min-w-0">
                  {pendingBookings.map((b) => (
                    <div
                      key={b.booking_id}
                      onClick={() => setSelectedPending(b)}
                      className="p-3.5 bg-rose-50/20 cursor-pointer hover:bg-rose-50/40 transition-colors w-full min-w-0 overflow-hidden"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2 min-w-0">
                        <div className="flex items-center gap-1.5 min-w-0 flex-1">
                          <span
                            className="font-bold text-slate-900 truncate text-sm inline-block max-w-[130px] xs:max-w-[170px]"
                            title={b.customer_name}
                          >
                            {b.customer_name}
                          </span>
                          {b.customer_phone && (
                            <>
                              <span className="text-slate-300 shrink-0">·</span>
                              <span className="text-xs text-slate-400 font-medium shrink-0 whitespace-nowrap">{b.customer_phone}</span>
                            </>
                          )}
                        </div>
                        <span
                          className={cn(
                            "text-[10px] font-bold px-2 py-0.5 rounded capitalize shrink-0 whitespace-nowrap",
                            STATUS_COLORS[b.booking_status]
                          )}
                        >
                          {b.booking_status}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1 mb-2.5">
                        {b.services.map((s) => (
                          <span
                            key={s}
                            className="text-[10px] rounded-md bg-purple-50 text-[#7c3aed] px-2 py-0.5 border border-purple-100 truncate max-w-[120px]"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                      <div className="grid grid-cols-3 gap-1.5 text-center mt-2 w-full min-w-0">
                        <div className="rounded-xl bg-white p-2 border border-slate-200/70 min-w-0">
                          <p className="text-[10px] text-slate-400 uppercase font-bold truncate">
                            Billed
                          </p>
                          <p className="text-xs font-bold text-slate-800 mt-0.5 truncate">
                            {formatCurrency(b.total_billed)}
                          </p>
                        </div>
                        <div className="rounded-xl bg-emerald-50/80 p-2 border border-emerald-100 min-w-0">
                          <p className="text-[10px] text-emerald-600 uppercase font-bold truncate">
                            Paid
                          </p>
                          <p className="text-xs font-bold text-emerald-700 mt-0.5 truncate">
                            {formatCurrency(b.total_paid)}
                          </p>
                        </div>
                        <div className="rounded-xl bg-rose-50 p-2 border border-rose-200 min-w-0">
                          <p className="text-[10px] text-rose-500 uppercase font-bold truncate">
                            Due
                          </p>
                          <p className="text-xs font-extrabold text-rose-700 mt-0.5 truncate">
                            {formatCurrency(b.balance_due)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )
          ) : (
            /* All Payments View */
            payments.length === 0 ? (
              <div className="flex flex-col items-center py-16 text-slate-400">
                <CreditCard className="size-12 mb-3 text-slate-200" />
                <p className="font-semibold text-slate-600">No payments found</p>
                <p className="text-sm mt-1 text-slate-400">
                  Try adjusting your search query, type filter, or date range.
                </p>
              </div>
            ) : (
              <>
                {/* All Payments Desktop Table */}
                <div className="hidden md:block overflow-x-auto w-full">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/70">
                        <th className="text-left px-5 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider">
                          Payment Date
                        </th>
                        <th className="text-left px-4 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider">
                          Customer
                        </th>
                        <th className="text-left px-4 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider">
                          Services
                        </th>
                        <th className="text-left px-4 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider">
                          Type
                        </th>
                        <th className="text-left px-4 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider">
                          Method
                        </th>
                        <th className="text-right px-5 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider">
                          Amount
                        </th>
                        <th className="px-4 py-3.5" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {payments.map((p) => (
                        <tr
                          key={p.id}
                          onClick={() => setSelectedPayment(p)}
                          className="hover:bg-purple-50/30 transition-colors cursor-pointer group"
                        >
                          <td className="px-5 py-3.5 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-800">
                                {formatDate(p.payment_date)}
                              </span>
                              <span className="text-slate-300">·</span>
                              <span className="text-xs text-slate-400">
                                {formatDate(p.booking_date)}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3.5 max-w-[260px] whitespace-nowrap">
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                className="font-bold text-slate-900 group-hover:text-[#7c3aed] transition-colors truncate max-w-[130px] lg:max-w-[180px] inline-block align-middle"
                                title={p.customer_name}
                              >
                                {p.customer_name}
                              </span>
                              {p.customer_phone && (
                                <>
                                  <span className="text-slate-300 shrink-0">·</span>
                                  <span className="text-xs text-slate-400 shrink-0 whitespace-nowrap">
                                    {p.customer_phone}
                                  </span>
                                </>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <div className="flex flex-wrap gap-1 max-w-[200px]">
                              {p.services.slice(0, 2).map((s) => (
                                <span
                                  key={s}
                                  className="text-[10px] rounded-md bg-purple-50 text-[#7c3aed] px-2 py-0.5 font-medium border border-purple-100 truncate max-w-[100px]"
                                >
                                  {s}
                                </span>
                              ))}
                              {p.services.length > 2 && (
                                <span className="text-[10px] text-slate-400 font-medium px-1">
                                  +{p.services.length - 2}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <span
                              className={cn(
                                "text-[10px] font-bold px-2.5 py-1 rounded-lg",
                                PAYMENT_TYPE_COLORS[p.payment_type] ??
                                  "bg-slate-100 text-slate-500"
                              )}
                            >
                              {p.payment_type}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <div className="flex items-center gap-1.5 text-slate-700 font-medium text-xs">
                              {getPaymentMethodIcon(p.payment_method)}
                              <span>{p.payment_method}</span>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-right whitespace-nowrap">
                            <span className="font-extrabold text-emerald-600 text-sm">
                              {formatCurrency(p.amount)}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-right whitespace-nowrap">
                            <div className="flex size-7 items-center justify-center rounded-lg bg-slate-50 text-slate-400 group-hover:bg-purple-100 group-hover:text-[#7c3aed] transition-colors ml-auto">
                              <ChevronRight className="size-4" />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* All Payments Mobile List */}
                <div className="md:hidden divide-y divide-slate-100 w-full min-w-0">
                  {payments.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => setSelectedPayment(p)}
                      className="p-3.5 hover:bg-slate-50/80 transition-colors cursor-pointer w-full min-w-0 overflow-hidden"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2 min-w-0">
                        <div className="flex items-center gap-1.5 min-w-0 flex-1">
                          <span
                            className="font-bold text-slate-900 truncate text-sm inline-block max-w-[130px] xs:max-w-[170px]"
                            title={p.customer_name}
                          >
                            {p.customer_name}
                          </span>
                          {p.customer_phone && (
                            <>
                              <span className="text-slate-300 shrink-0">·</span>
                              <span className="text-xs text-slate-400 font-medium shrink-0 whitespace-nowrap">{p.customer_phone}</span>
                            </>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-extrabold text-emerald-600">
                            {formatCurrency(p.amount)}
                          </p>
                          <span
                            className={cn(
                              "text-[10px] font-bold px-1.5 py-0.2 rounded mt-0.5 inline-block whitespace-nowrap",
                              PAYMENT_TYPE_COLORS[p.payment_type] ??
                                "bg-slate-100 text-slate-500"
                            )}
                          >
                            {p.payment_type}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1 mb-2">
                        {p.services.map((s) => (
                          <span
                            key={s}
                            className="text-[10px] rounded-md bg-purple-50 text-[#7c3aed] px-2 py-0.5 border border-purple-100 truncate max-w-[120px]"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-100 min-w-0 gap-2">
                        <div className="flex items-center gap-1.5 min-w-0 truncate">
                          {getPaymentMethodIcon(p.payment_method)}
                          <span className="truncate">{p.payment_method}</span>
                        </div>
                        <span className="shrink-0 text-[11px]">Bk: {formatDate(p.booking_date)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )
          )}
        </div>
      </div>

      {/* Payment Detail Drawer / Bottom Modal */}
      <Sheet
        open={!!selectedPayment}
        onOpenChange={(o: boolean) => {
          if (!o) setSelectedPayment(null)
        }}
      >
        <SheetContent
          side={isMobile ? "bottom" : "right"}
          showCloseButton={false}
          className={cn(
            "p-0 bg-slate-50/70 border-slate-200/80 shadow-2xl flex flex-col focus:outline-none",
            isMobile
              ? "w-full max-h-[88vh] rounded-t-[28px] border-t overflow-hidden"
              : "w-full sm:max-w-xl md:max-w-2xl h-full border-l overflow-y-auto"
          )}
        >
          {selectedPayment && (
            <div className="flex flex-col h-full w-full min-w-0 overflow-hidden">
              {/* Mobile Drag Indicator */}
              <div className="sm:hidden flex flex-col items-center pt-2.5 pb-1 bg-white border-b border-slate-100/60 shrink-0">
                <div className="h-1.5 w-12 rounded-full bg-slate-300" />
              </div>

              {/* Header */}
              <SheetHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-4 sm:pb-5 border-b border-slate-200/80 bg-white shrink-0 relative">
                <div className="flex items-start justify-between gap-3 pr-8 sm:pr-10">
                  <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                    <div className="flex size-12 sm:size-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 shadow-xs ring-2 ring-emerald-100 shrink-0">
                      <Wallet className="size-6 sm:size-7" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <SheetTitle className="text-xl sm:text-2xl font-extrabold text-emerald-600 tracking-tight truncate">
                          {formatCurrency(selectedPayment.amount)}
                        </SheetTitle>
                        <Badge
                          variant="outline"
                          className={cn(
                            "font-bold text-[10px] sm:text-xs shrink-0 rounded-lg",
                            PAYMENT_TYPE_COLORS[selectedPayment.payment_type] ?? "bg-slate-100 text-slate-700"
                          )}
                        >
                          {selectedPayment.payment_type}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5 font-medium">
                        <Calendar className="size-3 text-slate-400 shrink-0" />
                        <span>Paid on {formatDate(selectedPayment.payment_date)}</span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Close Button */}
                <button
                  onClick={() => setSelectedPayment(null)}
                  className="absolute right-3.5 top-3.5 sm:top-5 size-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 flex items-center justify-center transition-colors"
                  aria-label="Close"
                >
                  <X className="size-4" />
                </button>
              </SheetHeader>

              {/* Body */}
              <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-5 space-y-4 sm:space-y-5">
                {/* Method & Attributes */}
                <div className="rounded-2xl border border-slate-200/80 bg-white p-3.5 sm:p-4 shadow-xs space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Payment Method
                  </h3>
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="flex size-10 items-center justify-center rounded-xl bg-white shadow-xs border border-slate-200/60">
                      {getPaymentMethodIcon(selectedPayment.payment_method)}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">
                        {selectedPayment.payment_method}
                      </p>
                      <p className="text-xs text-slate-400">
                        Verified transaction record
                      </p>
                    </div>
                  </div>

                  {selectedPayment.remark && (
                    <div className="p-3 rounded-xl bg-purple-50/50 border border-purple-100/80 text-xs">
                      <span className="font-bold text-purple-700 block mb-0.5">
                        Transaction Note:
                      </span>
                      <p className="text-slate-600">{selectedPayment.remark}</p>
                    </div>
                  )}
                </div>

                {/* Customer Information */}
                <div className="rounded-2xl border border-slate-200/80 bg-white p-3.5 sm:p-4 shadow-xs space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Payer / Customer
                  </h3>
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-slate-900 truncate">
                        {selectedPayment.customer_name}
                      </p>
                      {selectedPayment.customer_phone && (
                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                          <Phone className="size-3 text-slate-400 shrink-0" />
                          <span>{selectedPayment.customer_phone}</span>
                        </p>
                      )}
                    </div>
                    {selectedPayment.customer_phone && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <a
                          href={`tel:${selectedPayment.customer_phone}`}
                          className="flex size-8 items-center justify-center rounded-xl bg-purple-50 text-[#7c3aed] border border-purple-100 hover:bg-purple-100 transition"
                          title="Call"
                        >
                          <Phone className="size-3.5" />
                        </a>
                        <a
                          href={`https://wa.me/${selectedPayment.customer_phone.replace(/[^0-9]/g, "")}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex size-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100 transition"
                          title="WhatsApp"
                        >
                          <MessageCircle className="size-3.5" />
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                {/* Associated Booking Context */}
                <div className="rounded-2xl border border-slate-200/80 bg-white p-3.5 sm:p-4 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Associated Booking
                    </h3>
                    <span
                      className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded capitalize",
                        STATUS_COLORS[selectedPayment.booking_status]
                      )}
                    >
                      {selectedPayment.booking_status}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <BookOpen className="size-3.5 text-purple-600 shrink-0" />
                    <span>Booking Date: <strong>{formatDate(selectedPayment.booking_date)}</strong></span>
                  </div>

                  {selectedPayment.services.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {selectedPayment.services.map((s) => (
                        <span
                          key={s}
                          className="text-[10px] rounded-md bg-purple-50 text-[#7c3aed] px-2 py-0.5 font-semibold border border-purple-100"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-100">
                    <Button
                      onClick={() => {
                        setSelectedPayment(null)
                        router.push(`/bookings/${selectedPayment.booking_id}`)
                      }}
                      className="w-full h-10 rounded-xl bg-[#7c3aed] hover:bg-[#6d28d9] text-white font-bold text-xs shadow-sm flex items-center justify-center gap-1.5"
                    >
                      <span>Open Full Booking Details</span>
                      <ExternalLink className="size-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Pending Due Detail Drawer / Bottom Modal */}
      <Sheet
        open={!!selectedPending}
        onOpenChange={(o: boolean) => {
          if (!o) setSelectedPending(null)
        }}
      >
        <SheetContent
          side={isMobile ? "bottom" : "right"}
          showCloseButton={false}
          className={cn(
            "p-0 bg-slate-50/70 border-slate-200/80 shadow-2xl flex flex-col focus:outline-none",
            isMobile
              ? "w-full max-h-[88vh] rounded-t-[28px] border-t overflow-hidden"
              : "w-full sm:max-w-xl md:max-w-2xl h-full border-l overflow-y-auto"
          )}
        >
          {selectedPending && (
            <div className="flex flex-col h-full w-full min-w-0 overflow-hidden">
              {/* Mobile Drag Indicator */}
              <div className="sm:hidden flex flex-col items-center pt-2.5 pb-1 bg-white border-b border-slate-100/60 shrink-0">
                <div className="h-1.5 w-12 rounded-full bg-slate-300" />
              </div>

              {/* Header */}
              <SheetHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-4 sm:pb-5 border-b border-slate-200/80 bg-white shrink-0 relative">
                <div className="flex items-start justify-between gap-3 pr-8 sm:pr-10">
                  <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                    <div className="flex size-12 sm:size-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 shadow-xs ring-2 ring-rose-100 shrink-0">
                      <AlertCircle className="size-6 sm:size-7" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <SheetTitle className="text-xl sm:text-2xl font-extrabold text-rose-600 tracking-tight truncate">
                          {formatCurrency(selectedPending.balance_due)}
                        </SheetTitle>
                        <Badge
                          variant="outline"
                          className="bg-rose-50 text-rose-700 border-rose-200 font-bold text-[10px] sm:text-xs shrink-0 rounded-lg"
                        >
                          Payment Due
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5 font-medium truncate">
                        <span>Client: <strong>{selectedPending.customer_name}</strong></span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Close Button */}
                <button
                  onClick={() => setSelectedPending(null)}
                  className="absolute right-3.5 top-3.5 sm:top-5 size-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 flex items-center justify-center transition-colors"
                  aria-label="Close"
                >
                  <X className="size-4" />
                </button>

                {/* Quick Remind Actions */}
                {selectedPending.customer_phone && (
                  <div className="grid grid-cols-2 gap-2 mt-3.5 pt-3 border-t border-slate-100">
                    <a
                      href={`https://wa.me/${selectedPending.customer_phone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(`Hi ${selectedPending.customer_name}, this is a gentle reminder regarding the outstanding balance of ${formatCurrency(selectedPending.balance_due)} for your booking on ${formatDate(selectedPending.booking_date)}. Please let us know once paid. Thank you!`)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50/60 hover:bg-emerald-100/70 py-2 sm:py-2.5 text-xs font-bold text-emerald-700 shadow-xs transition"
                    >
                      <MessageCircle className="size-3.5 shrink-0" />
                      <span>WhatsApp Reminder</span>
                    </a>
                    <a
                      href={`tel:${selectedPending.customer_phone}`}
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-purple-200 bg-purple-50/50 hover:bg-purple-100/60 py-2 sm:py-2.5 text-xs font-bold text-[#7c3aed] shadow-xs transition"
                    >
                      <Phone className="size-3.5 shrink-0" />
                      <span>Call Client</span>
                    </a>
                  </div>
                )}
              </SheetHeader>

              {/* Body */}
              <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-5 space-y-4 sm:space-y-5">
                {/* Financial Summary */}
                <div className="rounded-2xl border border-slate-200/80 bg-white p-3.5 sm:p-4 shadow-xs space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Settlement Status
                  </h3>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-xl bg-slate-50 p-2.5 sm:p-3 text-center border border-slate-100 min-w-0">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider truncate">
                        Billed
                      </p>
                      <p className="text-xs sm:text-base font-extrabold text-slate-800 mt-1 truncate">
                        {formatCurrency(selectedPending.total_billed)}
                      </p>
                    </div>
                    <div className="rounded-xl bg-emerald-50/80 border border-emerald-100 p-2.5 sm:p-3 text-center min-w-0">
                      <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider truncate">
                        Paid
                      </p>
                      <p className="text-xs sm:text-base font-extrabold text-emerald-700 mt-1 truncate">
                        {formatCurrency(selectedPending.total_paid)}
                      </p>
                    </div>
                    <div className="rounded-xl bg-rose-50 border border-rose-200/80 p-2.5 sm:p-3 text-center min-w-0">
                      <p className="text-[10px] text-rose-500 font-bold uppercase tracking-wider truncate">
                        Due
                      </p>
                      <p className="text-xs sm:text-base font-extrabold text-rose-700 mt-1 truncate">
                        {formatCurrency(selectedPending.balance_due)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Booking & Services Context */}
                <div className="rounded-2xl border border-slate-200/80 bg-white p-3.5 sm:p-4 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Booking Information
                    </h3>
                    <span
                      className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded capitalize",
                        STATUS_COLORS[selectedPending.booking_status]
                      )}
                    >
                      {selectedPending.booking_status}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <Calendar className="size-3.5 text-slate-400 shrink-0" />
                    <span>Booking Date: <strong>{formatDate(selectedPending.booking_date)}</strong></span>
                  </div>

                  {selectedPending.services.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <p className="text-[11px] font-medium text-slate-400">Booked Services:</p>
                      <div className="flex flex-wrap gap-1">
                        {selectedPending.services.map((s) => (
                          <span
                            key={s}
                            className="text-[10px] rounded-md bg-purple-50 text-[#7c3aed] px-2 py-0.5 font-semibold border border-purple-100"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-100">
                    <Button
                      onClick={() => {
                        setSelectedPending(null)
                        router.push(`/bookings/${selectedPending.booking_id}`)
                      }}
                      className="w-full h-10 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-1.5"
                    >
                      <span>Open Booking & Settle Payment</span>
                      <ExternalLink className="size-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
