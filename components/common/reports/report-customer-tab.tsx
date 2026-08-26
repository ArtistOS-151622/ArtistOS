"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import {
  Search,
  Users,
  TrendingUp,
  Wallet,
  AlertCircle,
  ChevronRight,
  Phone,
  Mail,
  MapPin,
  Calendar,
  CreditCard,
  X,
  BookOpen,
  ExternalLink,
  Download,
  MessageCircle,
  Award,
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
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
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
  type ChartConfig,
} from "@/components/ui/chart"
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

const STATUS_COLORS: Record<string, string> = {
  confirmed: "bg-blue-50 text-blue-700 border border-blue-200/80",
  pending: "bg-amber-50 text-amber-700 border border-amber-200/80",
  completed: "bg-emerald-50 text-emerald-700 border border-emerald-200/80",
  cancelled: "bg-rose-50 text-rose-700 border border-rose-200/80",
}

const topCustomersChartConfig = {
  billed: {
    label: "Total Billed",
    color: "#7c3aed",
  },
  paid: {
    label: "Paid",
    color: "#10b981",
  },
} satisfies ChartConfig

const statusPieChartConfig = {
  paid: { label: "Collected", color: "#10b981" },
  due: { label: "Outstanding", color: "#f43f5e" },
} satisfies ChartConfig

const AVATAR_GRADIENTS = [
  "from-purple-500 to-indigo-600 text-white",
  "from-pink-500 to-rose-500 text-white",
  "from-blue-500 to-cyan-600 text-white",
  "from-emerald-500 to-teal-600 text-white",
  "from-amber-500 to-orange-500 text-white",
]

function getAvatarGradient(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  const index = Math.abs(hash) % AVATAR_GRADIENTS.length
  return AVATAR_GRADIENTS[index]
}

type CustomerReport = {
  id: number
  customer_name: string
  phone: string
  alt_phone?: string
  email?: string
  address?: string
  reference_by?: string
  created_at: string
  booking_count: number
  total_billed: number
  total_paid: number
  balance_due: number
  last_booking_date: string | null
  bookings: any[]
}

export function ReportCustomerTab({
  dateRange,
}: {
  dateRange: { start: string; end: string } | null
}) {
  const router = useRouter()
  const [data, setData] = useState<{
    customers: CustomerReport[]
    totals: any
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [sort, setSort] = useState("recent")
  const [selected, setSelected] = useState<CustomerReport | null>(null)

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(t)
  }, [search])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ search: debouncedSearch, sort })
      if (dateRange) {
        params.set("start_date", dateRange.start)
        params.set("end_date", dateRange.end)
      }
      const res = await fetch(`/api/reports/customers?${params}`)
      const json = await res.json()
      if (res.ok) setData(json)
    } catch {
      /* silent */
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, sort, dateRange])

  useEffect(() => {
    load()
  }, [load])

  const totals = data?.totals
  const customers = data?.customers ?? []

  // Top 5 customers chart data
  const topCustomersData = useMemo(() => {
    return [...customers]
      .sort((a, b) => (b.total_billed || 0) - (a.total_billed || 0))
      .slice(0, 5)
      .map((c) => ({
        name:
          c.customer_name.length > 8
            ? `${c.customer_name.slice(0, 8)}…`
            : c.customer_name,
        fullName: c.customer_name,
        billed: c.total_billed,
        paid: c.total_paid,
        due: c.balance_due,
      }))
  }, [customers])

  // Collection breakdown pie data
  const collectionPieData = useMemo(() => {
    if (!totals) return []
    const paid = totals.total_paid || 0
    const due = totals.balance_due || 0
    if (paid === 0 && due === 0) return []
    return [
      { name: "Collected", value: paid, fill: "#10b981" },
      { name: "Outstanding", value: due, fill: "#f43f5e" },
    ]
  }, [totals])

  const collectionRate = useMemo(() => {
    if (!totals || !totals.total_billed || totals.total_billed === 0) return 0
    return Math.min(
      100,
      Math.round(((totals.total_paid || 0) / totals.total_billed) * 100)
    )
  }, [totals])

  // Export to CSV
  function exportCSV() {
    if (!customers.length) return
    const headers = [
      "Customer Name",
      "Phone",
      "Email",
      "Bookings Count",
      "Total Billed (INR)",
      "Total Paid (INR)",
      "Balance Due (INR)",
      "Last Booking Date",
    ]
    const rows = customers.map((c) => [
      `"${c.customer_name.replace(/"/g, '""')}"`,
      `"${c.phone || ""}"`,
      `"${c.email || ""}"`,
      c.booking_count,
      c.total_billed,
      c.total_paid,
      c.balance_due,
      c.last_booking_date || "",
    ])
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n")
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute(
      "download",
      `customers_report_${new Date().toISOString().slice(0, 10)}.csv`
    )
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-5 w-full min-w-0 max-w-full overflow-x-hidden">
      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3.5 lg:grid-cols-4 w-full min-w-0">
        <ReportSummaryCard
          label="Total Customers"
          value={String(totals?.total_customers ?? "—")}
          subLabel={totals ? "Active client base" : undefined}
          icon={<Users className="size-4 sm:size-5" />}
          color="purple"
        />
        <ReportSummaryCard
          label="Total Billed"
          value={totals ? formatCurrency(totals.total_billed) : "—"}
          subLabel={totals ? "Gross value" : undefined}
          icon={<TrendingUp className="size-4 sm:size-5" />}
          color="blue"
        />
        <ReportSummaryCard
          label="Total Collected"
          value={totals ? formatCurrency(totals.total_paid) : "—"}
          subLabel={totals ? `${collectionRate}% rate` : undefined}
          icon={<Wallet className="size-4 sm:size-5" />}
          color="green"
        />
        <ReportSummaryCard
          label="Outstanding Due"
          value={totals ? formatCurrency(totals.balance_due) : "—"}
          subLabel={
            totals?.balance_due > 0 ? "Pending dues" : "All clear"
          }
          icon={<AlertCircle className="size-4 sm:size-5" />}
          color={totals?.balance_due > 0 ? "red" : "green"}
        />
      </div>

      {/* Visual Analytics Row */}
      {customers.length > 0 && !loading && (
        <div className="grid gap-4 lg:grid-cols-3 w-full min-w-0 max-w-full overflow-hidden">
          {/* Top 5 Customers Bar Chart */}
          <div className="lg:col-span-2 rounded-2xl border border-slate-200/80 bg-white p-3.5 sm:p-5 shadow-sm min-w-0 max-w-full overflow-hidden w-full">
            <div className="flex items-center justify-between pb-2.5 mb-2 border-b border-slate-100 min-w-0 gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="flex size-7 sm:size-8 shrink-0 items-center justify-center rounded-lg bg-purple-50 text-[#7c3aed]">
                  <Award className="size-4" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs sm:text-sm font-bold text-slate-800 truncate">
                    Top Customers by Revenue
                  </h4>
                  <p className="text-[11px] text-slate-400 truncate">
                    Highest spending clients
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-[11px] sm:text-xs shrink-0">
                <div className="flex items-center gap-1">
                  <div className="size-2 rounded-full bg-[#7c3aed]" />
                  <span className="text-slate-500 font-medium">Billed</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="size-2 rounded-full bg-[#10b981]" />
                  <span className="text-slate-500 font-medium">Paid</span>
                </div>
              </div>
            </div>

            <div className="h-[210px] w-full min-w-0 max-w-full overflow-hidden pt-1">
              <ChartContainer
                config={topCustomersChartConfig}
                className="aspect-auto h-full w-full min-w-0 max-w-full"
              >
                <BarChart
                  data={topCustomersData}
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
                    tickFormatter={(val) => `₹${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                    tick={{ fill: "#94a3b8", fontSize: 10 }}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
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
                    dataKey="billed"
                    fill="#7c3aed"
                    radius={[0, 4, 4, 0]}
                    barSize={10}
                  />
                  <Bar
                    dataKey="paid"
                    fill="#10b981"
                    radius={[0, 4, 4, 0]}
                    barSize={10}
                  />
                </BarChart>
              </ChartContainer>
            </div>
          </div>

          {/* Collection Status Donut Card */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-3.5 sm:p-5 shadow-sm flex flex-col justify-between min-w-0 max-w-full overflow-hidden w-full">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 min-w-0 gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="flex size-7 sm:size-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                  <Wallet className="size-4" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs sm:text-sm font-bold text-slate-800 truncate">
                    Collection Ratio
                  </h4>
                  <p className="text-[11px] text-slate-400 truncate">
                    Collected vs Due
                  </p>
                </div>
              </div>
              <Badge
                variant="outline"
                className="bg-emerald-50 text-emerald-700 border-emerald-200 font-bold text-[10px] sm:text-xs shrink-0"
              >
                {collectionRate}% Paid
              </Badge>
            </div>

            <div className="relative flex items-center justify-center py-3 min-w-0">
              <div className="h-[130px] w-[130px] flex items-center justify-center">
                <ChartContainer
                  config={statusPieChartConfig}
                  className="aspect-auto h-full w-full min-w-0"
                >
                  <PieChart>
                    <Pie
                      data={collectionPieData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={40}
                      outerRadius={58}
                      paddingAngle={3}
                      strokeWidth={2}
                      stroke="#fff"
                    >
                      {collectionPieData.map((entry, index) => (
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
              <div className="absolute flex flex-col items-center justify-center pointer-events-none">
                <span className="text-lg font-extrabold text-slate-800">
                  {collectionRate}%
                </span>
                <span className="text-[9px] uppercase font-bold text-slate-400">
                  Paid
                </span>
              </div>
            </div>

            <div className="space-y-1.5 pt-2 border-t border-slate-100 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 min-w-0">
                  <div className="size-2 rounded-full bg-[#10b981] shrink-0" />
                  <span className="text-slate-600 font-medium truncate">Collected</span>
                </div>
                <span className="font-bold text-slate-800 shrink-0">
                  {totals ? formatCurrency(totals.total_paid) : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 min-w-0">
                  <div className="size-2 rounded-full bg-[#f43f5e] shrink-0" />
                  <span className="text-slate-600 font-medium truncate">Outstanding</span>
                </div>
                <span className="font-bold text-rose-600 shrink-0">
                  {totals ? formatCurrency(totals.balance_due) : "—"}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Customers List Card */}
      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden w-full min-w-0 max-w-full">
        {/* Controls Bar */}
        <div className="flex flex-col sm:flex-row gap-2.5 p-3 sm:p-4 border-b border-slate-100 bg-white items-stretch sm:items-center justify-between w-full min-w-0">
          <div className="relative flex-1 w-full min-w-0 max-w-full sm:max-w-md">
            <Search className="absolute left-3.5 top-3.5 size-4 text-slate-400 pointer-events-none" />
            <Input
              placeholder="Search by name, phone, or email…"
              className="pl-10 pr-9 h-10 sm:h-11 rounded-xl border-slate-200 bg-slate-50/50 shadow-none focus-visible:bg-white transition-colors w-full text-xs sm:text-sm"
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
                  Sort:{" "}
                  {sort === "recent"
                    ? "Recent"
                    : sort === "most_bookings"
                      ? "Most Bookings"
                      : sort === "highest_billed"
                        ? "Highest Billed"
                        : sort === "highest_due"
                          ? "Highest Due"
                          : "Name A-Z"}
                </span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-2xl w-48">
                <DropdownMenuRadioGroup value={sort} onValueChange={setSort}>
                  <DropdownMenuRadioItem
                    value="recent"
                    className="rounded-xl cursor-pointer font-medium text-xs"
                  >
                    Recent Booking
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem
                    value="most_bookings"
                    className="rounded-xl cursor-pointer font-medium text-xs"
                  >
                    Most Bookings
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem
                    value="highest_billed"
                    className="rounded-xl cursor-pointer font-medium text-xs"
                  >
                    Highest Billed
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem
                    value="highest_due"
                    className="rounded-xl cursor-pointer font-medium text-xs"
                  >
                    Highest Due
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem
                    value="name"
                    className="rounded-xl cursor-pointer font-medium text-xs"
                  >
                    Name A-Z
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            {customers.length > 0 && (
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
        </div>

        {/* Table / List */}
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
          ) : customers.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-slate-400">
              <Users className="size-12 mb-3 text-slate-200" />
              <p className="font-semibold text-slate-600">No customers found</p>
              <p className="text-sm mt-1 text-slate-400">
                Try adjusting your search query or date range filters.
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto w-full">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/70">
                      <th className="text-left px-5 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider">
                        Customer
                      </th>
                      <th className="text-center px-4 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider">
                        Bookings
                      </th>
                      <th className="text-right px-4 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider">
                        Total Billed
                      </th>
                      <th className="text-right px-4 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider">
                        Collected
                      </th>
                      <th className="text-right px-4 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider">
                        Due
                      </th>
                      <th className="text-right px-4 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider">
                        Last Booking
                      </th>
                      <th className="px-4 py-3.5" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {customers.map((c) => (
                      <tr
                        key={c.id}
                        className="hover:bg-purple-50/30 transition-colors cursor-pointer group"
                        onClick={() => setSelected(c)}
                      >
                        <td className="px-5 py-3.5 max-w-[280px] lg:max-w-[340px]">
                          <div className="flex items-center gap-3 min-w-0">
                            <Avatar className="size-8 rounded-lg shadow-xs ring-1 ring-black/5 shrink-0">
                              <AvatarFallback
                                className={cn(
                                  "bg-gradient-to-br font-bold text-xs rounded-lg",
                                  getAvatarGradient(c.customer_name)
                                )}
                              >
                                {c.customer_name.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                className="font-bold text-slate-900 group-hover:text-[#7c3aed] transition-colors truncate max-w-[130px] lg:max-w-[180px] inline-block align-middle"
                                title={c.customer_name}
                              >
                                {c.customer_name}
                              </span>
                              {c.phone && (
                                <>
                                  <span className="text-slate-300 shrink-0">·</span>
                                  <span className="text-xs text-slate-500 font-medium shrink-0 whitespace-nowrap">{c.phone}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-center whitespace-nowrap">
                          <span className="inline-flex items-center justify-center rounded-lg bg-purple-50 text-[#7c3aed] font-bold text-xs px-2.5 py-1 border border-purple-100 whitespace-nowrap">
                            {c.booking_count}{" "}
                            {c.booking_count === 1 ? "booking" : "bookings"}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right whitespace-nowrap">
                          <span className="font-bold text-slate-800">
                            {formatCurrency(c.total_billed)}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right whitespace-nowrap">
                          <span className="font-bold text-emerald-600">
                            {formatCurrency(c.total_paid)}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right font-bold whitespace-nowrap">
                          <span
                            className={
                              c.balance_due > 0
                                ? "text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100"
                                : "text-slate-400 font-normal"
                            }
                          >
                            {c.balance_due > 0
                              ? formatCurrency(c.balance_due)
                              : "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right text-slate-500 text-xs whitespace-nowrap">
                          {formatDate(c.last_booking_date ?? "")}
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

              {/* Mobile List */}
              <div className="md:hidden divide-y divide-slate-100 w-full min-w-0">
                {customers.map((c) => (
                  <div
                    key={c.id}
                    className="p-3.5 cursor-pointer hover:bg-slate-50/80 transition-colors w-full min-w-0 overflow-hidden"
                    onClick={() => setSelected(c)}
                  >
                    <div className="flex items-center justify-between gap-2 mb-2 min-w-0">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <Avatar className="size-8 rounded-lg shrink-0">
                          <AvatarFallback
                            className={cn(
                              "bg-gradient-to-br font-bold text-xs rounded-lg",
                              getAvatarGradient(c.customer_name)
                            )}
                          >
                            {c.customer_name.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex items-center gap-1.5 min-w-0 flex-1">
                          <span
                            className="font-bold text-slate-900 truncate text-sm inline-block max-w-[120px] xs:max-w-[160px]"
                            title={c.customer_name}
                          >
                            {c.customer_name}
                          </span>
                          {c.phone && (
                            <>
                              <span className="text-slate-300 shrink-0">·</span>
                              <span className="text-xs text-slate-400 font-medium shrink-0 whitespace-nowrap">{c.phone}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <span className="inline-flex items-center rounded-lg bg-purple-50 text-[#7c3aed] font-bold text-xs px-2 py-0.5 border border-purple-100 shrink-0 whitespace-nowrap">
                        {c.booking_count}{" "}
                        {c.booking_count === 1 ? "bk" : "bks"}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-1.5 text-center mt-2.5 w-full min-w-0">
                      <div className="rounded-xl bg-slate-50 p-2 border border-slate-100 min-w-0">
                        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider truncate">
                          Billed
                        </p>
                        <p className="text-xs font-bold text-slate-800 mt-0.5 truncate">
                          {formatCurrency(c.total_billed)}
                        </p>
                      </div>
                      <div className="rounded-xl bg-emerald-50/80 p-2 border border-emerald-100 min-w-0">
                        <p className="text-[10px] text-emerald-600 uppercase font-bold tracking-wider truncate">
                          Paid
                        </p>
                        <p className="text-xs font-bold text-emerald-700 mt-0.5 truncate">
                          {formatCurrency(c.total_paid)}
                        </p>
                      </div>
                      <div
                        className={cn(
                          "rounded-xl p-2 border min-w-0",
                          c.balance_due > 0
                            ? "bg-rose-50 border-rose-100"
                            : "bg-slate-50 border-slate-100"
                        )}
                      >
                        <p
                          className={cn(
                            "text-[10px] uppercase font-bold tracking-wider truncate",
                            c.balance_due > 0
                              ? "text-rose-500"
                              : "text-slate-400"
                          )}
                        >
                          Due
                        </p>
                        <p
                          className={cn(
                            "text-xs font-bold mt-0.5 truncate",
                            c.balance_due > 0
                              ? "text-rose-700"
                              : "text-slate-400"
                          )}
                        >
                          {c.balance_due > 0
                            ? formatCurrency(c.balance_due)
                            : "—"}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Customer Detail Drawer */}
      <Sheet
        open={!!selected}
        onOpenChange={(o: boolean) => {
          if (!o) setSelected(null)
        }}
      >
        <SheetContent
          side="right"
          className="w-full sm:max-w-xl overflow-y-auto p-0 border-l border-slate-200"
        >
          {selected && (
            <div className="flex flex-col h-full bg-slate-50/40 w-full min-w-0">
              {/* Header */}
              <SheetHeader className="px-4 sm:px-6 pt-6 pb-5 border-b border-slate-200/80 bg-white">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <Avatar className="size-12 sm:size-14 rounded-2xl shadow-sm ring-2 ring-purple-100 shrink-0">
                      <AvatarFallback
                        className={cn(
                          "bg-gradient-to-br font-bold text-base sm:text-lg rounded-2xl",
                          getAvatarGradient(selected.customer_name)
                        )}
                      >
                        {selected.customer_name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <SheetTitle className="text-lg sm:text-xl font-extrabold text-slate-900 truncate">
                        {selected.customer_name}
                      </SheetTitle>
                      <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5 font-medium truncate">
                        <Phone className="size-3 text-slate-400 shrink-0" />
                        {selected.phone}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Quick Action Contact Buttons */}
                <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-100">
                  <a
                    href={`tel:${selected.phone}`}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
                  >
                    <Phone className="size-3.5 text-purple-600 shrink-0" />
                    Call
                  </a>
                  <a
                    href={`https://wa.me/${selected.phone.replace(/[^0-9]/g, "")}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50/50 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-100/50 transition"
                  >
                    <MessageCircle className="size-3.5 text-emerald-600 shrink-0" />
                    WhatsApp
                  </a>
                  {selected.email ? (
                    <a
                      href={`mailto:${selected.email}`}
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition truncate"
                    >
                      <Mail className="size-3.5 text-blue-600 shrink-0" />
                      Email
                    </a>
                  ) : (
                    <button
                      disabled
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-100 bg-slate-50 py-2 text-xs font-bold text-slate-400 opacity-60 cursor-not-allowed"
                    >
                      <Mail className="size-3.5 shrink-0" />
                      Email
                    </button>
                  )}
                </div>
              </SheetHeader>

              <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 space-y-6">
                {/* Financial Summary */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                    Financial Summary
                  </h3>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-2xl bg-white border border-slate-200/80 p-3 text-center shadow-xs min-w-0">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider truncate">
                        Billed
                      </p>
                      <p className="text-sm sm:text-base font-extrabold text-slate-800 mt-1 truncate">
                        {formatCurrency(selected.total_billed)}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-emerald-50/70 border border-emerald-200/70 p-3 text-center shadow-xs min-w-0">
                      <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider truncate">
                        Paid
                      </p>
                      <p className="text-sm sm:text-base font-extrabold text-emerald-700 mt-1 truncate">
                        {formatCurrency(selected.total_paid)}
                      </p>
                    </div>
                    <div
                      className={cn(
                        "rounded-2xl border p-3 text-center shadow-xs min-w-0",
                        selected.balance_due > 0
                          ? "bg-rose-50 border-rose-200/70"
                          : "bg-white border-slate-200/80"
                      )}
                    >
                      <p
                        className={cn(
                          "text-[10px] font-bold uppercase tracking-wider truncate",
                          selected.balance_due > 0
                            ? "text-rose-500"
                            : "text-slate-400"
                        )}
                      >
                        Due
                      </p>
                      <p
                        className={cn(
                          "text-sm sm:text-base font-extrabold mt-1 truncate",
                          selected.balance_due > 0
                            ? "text-rose-700"
                            : "text-slate-400"
                        )}
                      >
                        {selected.balance_due > 0
                          ? formatCurrency(selected.balance_due)
                          : "—"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Contact & Profile Info */}
                <div className="rounded-2xl border border-slate-200/80 bg-white p-4 space-y-2.5 text-sm shadow-xs">
                  {selected.email && (
                    <div className="flex items-center gap-2.5 text-slate-600 min-w-0">
                      <Mail className="size-4 text-slate-400 shrink-0" />
                      <span className="truncate">{selected.email}</span>
                    </div>
                  )}
                  {selected.alt_phone && (
                    <div className="flex items-center gap-2.5 text-slate-600 min-w-0">
                      <Phone className="size-4 text-slate-400 shrink-0" />
                      <span className="truncate">{selected.alt_phone} (Alt)</span>
                    </div>
                  )}
                  {selected.address && (
                    <div className="flex items-start gap-2.5 text-slate-600 min-w-0">
                      <MapPin className="size-4 text-slate-400 shrink-0 mt-0.5" />
                      <span className="break-words">{selected.address}</span>
                    </div>
                  )}
                  {selected.reference_by && (
                    <div className="flex items-center gap-2.5 text-slate-600 min-w-0">
                      <Users className="size-4 text-slate-400 shrink-0" />
                      <span className="truncate">Referred by {selected.reference_by}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2.5 text-slate-400 pt-1 border-t border-slate-100">
                    <Calendar className="size-3.5 shrink-0" />
                    <span className="text-xs truncate">
                      Client since {formatDate(selected.created_at)}
                    </span>
                  </div>
                </div>

                {/* Booking History */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Booking History ({selected.booking_count})
                    </h3>
                  </div>

                  {selected.bookings.length === 0 ? (
                    <div className="rounded-2xl bg-white border border-slate-200/70 p-6 text-center text-slate-400 italic text-sm">
                      No bookings recorded yet.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {selected.bookings.map((b: any) => {
                        const services = (b.booking_services ?? []) as any[]
                        const charges = (b.booking_additional_charges ??
                          []) as any[]
                        const payments = (b.booking_payments ?? []) as any[]
                        const serviceTotal = services.reduce(
                          (s: number, sv: any) =>
                            s +
                            (sv.unit_price ?? sv.service?.price ?? 0) *
                              (sv.quantity ?? 1),
                          0
                        )
                        const chargesTotal = charges.reduce(
                          (s: number, ch: any) =>
                            s + (ch.rate ?? 0) * (ch.quantity ?? 1),
                          0
                        )
                        const billed =
                          serviceTotal + chargesTotal - Number(b.discount ?? 0)
                        const paid = payments.reduce(
                          (s: number, p: any) => s + Number(p.amount),
                          0
                        )
                        const due = billed - paid
                        const serviceNames = services
                          .map((s: any) => s.service?.service_name)
                          .filter(Boolean)

                        const isNavigable =
                          b.status === "confirmed" || b.status === "completed"

                        return (
                          <div
                            key={b.id}
                            onClick={() =>
                              isNavigable && router.push(`/bookings/${b.id}`)
                            }
                            className={cn(
                              "rounded-2xl border border-slate-200/80 bg-white p-3.5 sm:p-4 shadow-xs space-y-3 group transition-all duration-150",
                              isNavigable
                                ? "cursor-pointer hover:border-purple-300 hover:shadow-md hover:bg-purple-50/20"
                                : "cursor-default"
                            )}
                          >
                            <div className="flex items-start justify-between gap-2 min-w-0">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 min-w-0">
                                  <BookOpen className="size-3.5 text-purple-600 shrink-0" />
                                  <span className="text-sm font-bold text-slate-800 truncate">
                                    {formatDate(b.booking_date)}
                                  </span>
                                  {isNavigable && (
                                    <ExternalLink className="size-3 text-slate-300 group-hover:text-[#7c3aed] transition-colors ml-auto shrink-0" />
                                  )}
                                </div>
                                {serviceNames.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-1.5">
                                    {serviceNames.map((n: string) => (
                                      <span
                                        key={n}
                                        className="text-[10px] rounded-md bg-purple-50 text-[#7c3aed] px-2 py-0.5 font-semibold border border-purple-100 truncate max-w-[120px]"
                                      >
                                        {n}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <span
                                className={cn(
                                  "text-[10px] font-bold px-2 py-1 rounded-lg capitalize shrink-0",
                                  STATUS_COLORS[b.status] ??
                                    "bg-slate-100 text-slate-500"
                                )}
                              >
                                {b.status}
                              </span>
                            </div>

                            <div className="grid grid-cols-3 gap-1.5 text-center bg-slate-50/60 p-2.5 rounded-xl border border-slate-100 min-w-0">
                              <div className="min-w-0">
                                <p className="text-[10px] text-slate-400 uppercase font-bold truncate">
                                  Billed
                                </p>
                                <p className="text-xs font-bold text-slate-800 truncate">
                                  {formatCurrency(billed)}
                                </p>
                              </div>
                              <div className="min-w-0">
                                <p className="text-[10px] text-emerald-600 uppercase font-bold truncate">
                                  Paid
                                </p>
                                <p className="text-xs font-bold text-emerald-600 truncate">
                                  {formatCurrency(paid)}
                                </p>
                              </div>
                              <div className="min-w-0">
                                <p
                                  className={cn(
                                    "text-[10px] uppercase font-bold truncate",
                                    due > 0 ? "text-rose-500" : "text-slate-400"
                                  )}
                                >
                                  Due
                                </p>
                                <p
                                  className={cn(
                                    "text-xs font-bold truncate",
                                    due > 0 ? "text-rose-600" : "text-slate-400"
                                  )}
                                >
                                  {due > 0 ? formatCurrency(due) : "—"}
                                </p>
                              </div>
                            </div>

                            {payments.length > 0 && (
                              <div className="space-y-1.5 border-t border-slate-100 pt-2.5">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                  Payments Recorded
                                </p>
                                {payments.map((p: any) => (
                                  <div
                                    key={p.id}
                                    className="flex items-center justify-between text-xs min-w-0 gap-2"
                                  >
                                    <div className="flex items-center gap-1.5 min-w-0 truncate">
                                      <CreditCard className="size-3 text-slate-400 shrink-0" />
                                      <span className="text-slate-600 font-medium truncate">
                                        {p.payment_type}
                                      </span>
                                      <span className="text-slate-300 shrink-0">·</span>
                                      <span className="text-slate-400 truncate">
                                        {p.payment_method}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                      <span className="text-slate-400 text-[10px]">
                                        {formatDate(p.payment_date)}
                                      </span>
                                      <span className="font-bold text-emerald-600">
                                        {formatCurrency(Number(p.amount))}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
