"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import {
  Search,
  Flower2,
  TrendingUp,
  Hash,
  ChevronRight,
  Calendar,
  Clock,
  BookOpen,
  Download,
  X,
  Sparkles,
  PieChart as PieChartIcon,
  ExternalLink,
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { useIsMobile } from "@/lib/hooks/use-is-mobile"
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

function formatDuration(minutes: number) {
  if (!minutes) return "—"
  if (minutes < 60) return `${minutes}m`
  const h = minutes / 60
  return Number.isInteger(h) ? `${h}h` : `${h.toFixed(1)}h`
}

const STATUS_COLORS: Record<string, string> = {
  confirmed: "bg-blue-50 text-blue-700 border border-blue-200/80",
  pending: "bg-amber-50 text-amber-700 border border-amber-200/80",
  completed: "bg-emerald-50 text-emerald-700 border border-emerald-200/80",
  cancelled: "bg-rose-50 text-rose-700 border border-rose-200/80",
}

const topServicesChartConfig = {
  revenue: {
    label: "Total Revenue",
    color: "#7c3aed",
  },
  usage_count: {
    label: "Times Booked",
    color: "#0ea5e9",
  },
} satisfies ChartConfig

const DONUT_COLORS = [
  "#7c3aed",
  "#0ea5e9",
  "#10b981",
  "#f59e0b",
  "#ec4899",
  "#8b5cf6",
  "#64748b",
]

type ServiceReport = {
  id: number
  service_name: string
  duration_minutes: number
  price: number | string
  created_at: string
  usage_count: number
  total_revenue: number
  avg_price: number
  recent_bookings: {
    booking_id: number
    booking_date: string
    status: string
    quantity: number
    unit_price: number
    customer_name: string
    customer_phone: string
  }[]
}

export function ReportServiceTab({
  dateRange,
}: {
  dateRange: { start: string; end: string } | null
}) {
  const router = useRouter()
  const isMobile = useIsMobile()
  const [data, setData] = useState<{
    services: ServiceReport[]
    totals: any
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [sort, setSort] = useState("most_used")
  const [selected, setSelected] = useState<ServiceReport | null>(null)

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
      const res = await fetch(`/api/reports/services?${params}`)
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
  const services = data?.services ?? []

  // Top 5 services by revenue for bar chart
  const topServicesData = useMemo(() => {
    return [...services]
      .sort((a, b) => (b.total_revenue || 0) - (a.total_revenue || 0))
      .slice(0, 5)
      .map((s) => ({
        name:
          s.service_name.length > 8
            ? `${s.service_name.slice(0, 8)}…`
            : s.service_name,
        fullName: s.service_name,
        revenue: s.total_revenue,
        usage_count: s.usage_count,
      }))
  }, [services])

  // Donut chart distribution
  const revenueDistributionData = useMemo(() => {
    if (!services.length) return []
    const sorted = [...services].sort(
      (a, b) => (b.total_revenue || 0) - (a.total_revenue || 0)
    )
    const top4 = sorted.slice(0, 4)
    const othersRevenue = sorted
      .slice(4)
      .reduce((sum, item) => sum + (item.total_revenue || 0), 0)

    const result = top4.map((item, idx) => ({
      name: item.service_name,
      value: item.total_revenue,
      fill: DONUT_COLORS[idx % DONUT_COLORS.length],
    }))

    if (othersRevenue > 0) {
      result.push({
        name: "Other Services",
        value: othersRevenue,
        fill: "#94a3b8",
      })
    }
    return result
  }, [services])

  const avgRevenuePerBooking = useMemo(() => {
    if (!totals || !totals.total_usage || totals.total_usage === 0) return 0
    return Math.round((totals.total_revenue || 0) / totals.total_usage)
  }, [totals])

  // Export CSV
  function exportCSV() {
    if (!services.length) return
    const headers = [
      "Service Name",
      "Duration (Mins)",
      "Base Price (INR)",
      "Total Usages",
      "Total Revenue (INR)",
      "Average Price (INR)",
    ]
    const rows = services.map((s) => [
      `"${s.service_name.replace(/"/g, '""')}"`,
      s.duration_minutes,
      s.price,
      s.usage_count,
      s.total_revenue,
      s.avg_price,
    ])
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n")
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute(
      "download",
      `services_report_${new Date().toISOString().slice(0, 10)}.csv`
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
          label="Total Services"
          value={String(totals?.total_services ?? "—")}
          subLabel={totals ? "In catalog" : undefined}
          icon={<Flower2 className="size-4 sm:size-5" />}
          color="purple"
        />
        <ReportSummaryCard
          label="Total Booked"
          value={totals ? `${totals.total_usage} times` : "—"}
          subLabel={totals ? "Volume generated" : undefined}
          icon={<Hash className="size-4 sm:size-5" />}
          color="blue"
        />
        <ReportSummaryCard
          label="Total Revenue"
          value={totals ? formatCurrency(totals.total_revenue) : "—"}
          subLabel={totals ? "From sales" : undefined}
          icon={<TrendingUp className="size-4 sm:size-5" />}
          color="green"
        />
        <ReportSummaryCard
          label="Avg Ticket"
          value={totals ? formatCurrency(avgRevenuePerBooking) : "—"}
          subLabel="Per booking"
          icon={<Sparkles className="size-4 sm:size-5" />}
          color="indigo"
        />
      </div>

      {/* Visual Analytics Section */}
      {services.length > 0 && !loading && (
        <div className="grid gap-4 lg:grid-cols-3 w-full min-w-0 max-w-full overflow-hidden">
          {/* Top Services Bar Chart */}
          <div className="lg:col-span-2 rounded-2xl border border-slate-200/80 bg-white p-3.5 sm:p-5 shadow-sm min-w-0 max-w-full overflow-hidden w-full">
            <div className="flex items-center justify-between pb-2.5 mb-2 border-b border-slate-100 min-w-0 gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="flex size-7 sm:size-8 shrink-0 items-center justify-center rounded-lg bg-purple-50 text-[#7c3aed]">
                  <TrendingUp className="size-4" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs sm:text-sm font-bold text-slate-800 truncate">
                    Highest Revenue Services
                  </h4>
                  <p className="text-[11px] text-slate-400 truncate">
                    Top grossing services in menu
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] sm:text-xs shrink-0">
                <div className="size-2 rounded-full bg-[#7c3aed]" />
                <span className="text-slate-500 font-medium">Revenue</span>
              </div>
            </div>

            <div className="h-[210px] w-full min-w-0 max-w-full overflow-hidden pt-1">
              <ChartContainer
                config={topServicesChartConfig}
                className="aspect-auto h-full w-full min-w-0 max-w-full"
              >
                <BarChart
                  data={topServicesData}
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
                    dataKey="revenue"
                    fill="#7c3aed"
                    radius={[0, 4, 4, 0]}
                    barSize={14}
                  />
                </BarChart>
              </ChartContainer>
            </div>
          </div>

          {/* Revenue Distribution Donut Chart */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-3.5 sm:p-5 shadow-sm flex flex-col justify-between min-w-0 max-w-full overflow-hidden w-full">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 min-w-0 gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="flex size-7 sm:size-8 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
                  <PieChartIcon className="size-4" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs sm:text-sm font-bold text-slate-800 truncate">
                    Revenue Share
                  </h4>
                  <p className="text-[11px] text-slate-400 truncate">
                    By service
                  </p>
                </div>
              </div>
            </div>

            <div className="relative flex items-center justify-center py-3 min-w-0">
              <div className="h-[130px] w-[130px] flex items-center justify-center">
                <ChartContainer
                  config={{
                    revenue: { label: "Revenue", color: "#7c3aed" },
                  }}
                  className="aspect-auto h-full w-full min-w-0"
                >
                  <PieChart>
                    <Pie
                      data={revenueDistributionData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={40}
                      outerRadius={58}
                      paddingAngle={3}
                      strokeWidth={2}
                      stroke="#fff"
                    >
                      {revenueDistributionData.map((entry, index) => (
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
              {revenueDistributionData.slice(0, 3).map((item, i) => (
                <div key={i} className="flex items-center justify-between min-w-0 gap-2">
                  <div className="flex items-center gap-2 min-w-0 truncate">
                    <div
                      className="size-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: item.fill }}
                    />
                    <span className="text-slate-600 truncate font-medium">
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

      {/* Services List Table Card */}
      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden w-full min-w-0 max-w-full">
        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-2.5 p-3 sm:p-4 border-b border-slate-100 bg-white items-stretch sm:items-center justify-between w-full min-w-0">
          <div className="relative flex-1 w-full min-w-0 max-w-full sm:max-w-md">
            <Search className="absolute left-3.5 top-3.5 size-4 text-slate-400 pointer-events-none" />
            <Input
              placeholder="Search services by title…"
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
                  {sort === "most_used"
                    ? "Most Booked"
                    : sort === "most_revenue"
                      ? "Highest Revenue"
                      : sort === "price_high"
                        ? "Price High-Low"
                        : "Name A-Z"}
                </span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-2xl w-48">
                <DropdownMenuRadioGroup value={sort} onValueChange={setSort}>
                  <DropdownMenuRadioItem
                    value="most_used"
                    className="rounded-xl cursor-pointer font-medium text-xs"
                  >
                    Most Booked
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem
                    value="most_revenue"
                    className="rounded-xl cursor-pointer font-medium text-xs"
                  >
                    Highest Revenue
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem
                    value="price_high"
                    className="rounded-xl cursor-pointer font-medium text-xs"
                  >
                    Price High to Low
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

            {services.length > 0 && (
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
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-16 rounded-xl bg-slate-100 animate-pulse"
                />
              ))}
            </div>
          ) : services.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-slate-400">
              <Flower2 className="size-12 mb-3 text-slate-200" />
              <p className="font-semibold text-slate-600">No services found</p>
              <p className="text-sm mt-1 text-slate-400">
                Try adjusting your search query or filters.
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
                        Service
                      </th>
                      <th className="text-left px-4 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider">
                        Duration
                      </th>
                      <th className="text-right px-4 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider">
                        Base Price
                      </th>
                      <th className="text-center px-4 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider">
                        Times Booked
                      </th>
                      <th className="text-right px-4 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider">
                        Total Revenue
                      </th>
                      <th className="px-4 py-3.5" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {services.map((s) => (
                      <tr
                        key={s.id}
                        className="hover:bg-purple-50/30 transition-colors cursor-pointer group"
                        onClick={() => setSelected(s)}
                      >
                        <td className="px-5 py-3.5 max-w-[280px] lg:max-w-[340px] whitespace-nowrap">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-purple-100 text-[#7c3aed] ring-1 ring-purple-200/50 shadow-xs">
                              <Flower2 className="size-4" />
                            </div>
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                className="font-bold text-slate-900 group-hover:text-[#7c3aed] transition-colors truncate max-w-[130px] lg:max-w-[180px] inline-block align-middle"
                                title={s.service_name}
                              >
                                {s.service_name}
                              </span>
                              <span className="text-slate-300 shrink-0">·</span>
                              <span className="text-xs text-slate-400 shrink-0 whitespace-nowrap">
                                Avg: {formatCurrency(s.avg_price)}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
                            <Clock className="size-3 text-slate-400" />
                            {formatDuration(s.duration_minutes)}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right font-semibold text-slate-700 whitespace-nowrap">
                          {formatCurrency(Number(s.price))}
                        </td>
                        <td className="px-4 py-3.5 text-center whitespace-nowrap">
                          <span className="inline-flex items-center justify-center rounded-lg bg-sky-50 text-sky-700 font-bold text-xs px-2.5 py-1 border border-sky-100">
                            {s.usage_count}× booked
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right whitespace-nowrap">
                          <span className="font-bold text-emerald-600">
                            {formatCurrency(s.total_revenue)}
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

              {/* Mobile List */}
              <div className="md:hidden divide-y divide-slate-100 w-full min-w-0">
                {services.map((s) => (
                  <div
                    key={s.id}
                    className="p-3.5 cursor-pointer hover:bg-slate-50/80 transition-colors w-full min-w-0 overflow-hidden"
                    onClick={() => setSelected(s)}
                  >
                    <div className="flex items-center justify-between gap-2 mb-2.5 min-w-0">
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-[#7c3aed]">
                          <Flower2 className="size-4.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <span
                            className="font-bold text-slate-900 truncate text-sm inline-block max-w-[140px] xs:max-w-[180px]"
                            title={s.service_name}
                          >
                            {s.service_name}
                          </span>
                          <div className="flex items-center gap-1.5 mt-0.5 text-xs text-slate-400 truncate">
                            <span>{formatDuration(s.duration_minutes)}</span>
                            <span>·</span>
                            <span className="font-semibold text-slate-600">
                              {formatCurrency(Number(s.price))}
                            </span>
                          </div>
                        </div>
                      </div>
                      <span className="text-xs bg-sky-50 text-sky-700 border border-sky-100 font-bold px-2 py-0.5 rounded-lg shrink-0 whitespace-nowrap">
                        {s.usage_count}×
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 text-center mt-2.5 w-full min-w-0">
                      <div className="rounded-xl bg-slate-50 p-2 border border-slate-100 min-w-0">
                        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider truncate">
                          Avg Price
                        </p>
                        <p className="text-xs font-bold text-slate-700 mt-0.5 truncate">
                          {formatCurrency(s.avg_price)}
                        </p>
                      </div>
                      <div className="rounded-xl bg-emerald-50/80 p-2 border border-emerald-100 min-w-0">
                        <p className="text-[10px] text-emerald-600 uppercase font-bold tracking-wider truncate">
                          Revenue
                        </p>
                        <p className="text-xs font-bold text-emerald-700 mt-0.5 truncate">
                          {formatCurrency(s.total_revenue)}
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

      {/* Service Detail Drawer / Bottom Modal */}
      <Sheet
        open={!!selected}
        onOpenChange={(o: boolean) => {
          if (!o) setSelected(null)
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
          {selected && (
            <div className="flex flex-col h-full w-full min-w-0 overflow-hidden">
              {/* Mobile Drag Indicator */}
              <div className="sm:hidden flex flex-col items-center pt-2.5 pb-1 bg-white border-b border-slate-100/60 shrink-0">
                <div className="h-1.5 w-12 rounded-full bg-slate-300" />
              </div>

              {/* Header */}
              <SheetHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-4 sm:pb-5 border-b border-slate-200/80 bg-white shrink-0 relative">
                <div className="flex items-start justify-between gap-3 pr-8 sm:pr-10">
                  <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                    <div className="flex size-12 sm:size-14 items-center justify-center rounded-2xl bg-purple-100 text-[#7c3aed] shadow-xs ring-2 ring-purple-100 shrink-0">
                      <Flower2 className="size-6 sm:size-7" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <SheetTitle className="text-base sm:text-xl font-extrabold text-slate-900 truncate">
                        {selected.service_name}
                      </SheetTitle>
                      <div className="flex items-center gap-1.5 sm:gap-2 mt-1.5 flex-wrap">
                        <Badge
                          variant="outline"
                          className="bg-slate-100 text-slate-600 border-slate-200 font-semibold text-[10px] sm:text-xs shrink-0 rounded-lg"
                        >
                          <Clock className="size-3 mr-1 text-slate-400" />
                          {formatDuration(selected.duration_minutes)}
                        </Badge>
                        <Badge
                          variant="outline"
                          className="bg-purple-50 text-[#7c3aed] border-purple-200 font-bold text-[10px] sm:text-xs shrink-0 rounded-lg"
                        >
                          Base: {formatCurrency(Number(selected.price))}
                        </Badge>
                        <Badge
                          variant="outline"
                          className="bg-sky-50 text-sky-700 border-sky-200 font-bold text-[10px] sm:text-xs shrink-0 rounded-lg"
                        >
                          {selected.usage_count}× Booked
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Close Button */}
                <button
                  onClick={() => setSelected(null)}
                  className="absolute right-3.5 top-3.5 sm:top-5 size-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 flex items-center justify-center transition-colors"
                  aria-label="Close"
                >
                  <X className="size-4" />
                </button>
              </SheetHeader>

              {/* Scrollable Content Body */}
              <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-5 space-y-5 sm:space-y-6">
                {/* Stats Grid */}
                <div className="rounded-2xl border border-slate-200/80 bg-white p-3.5 sm:p-4 shadow-xs space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Performance Breakdown
                  </h3>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-xl bg-sky-50/70 border border-sky-100 p-2.5 sm:p-3 text-center min-w-0">
                      <p className="text-[10px] text-sky-600 font-bold uppercase tracking-wider truncate">
                        Total Usages
                      </p>
                      <p className="text-sm sm:text-lg font-extrabold text-slate-800 mt-1 truncate">
                        {selected.usage_count}×
                      </p>
                    </div>
                    <div className="rounded-xl bg-emerald-50/80 border border-emerald-100 p-2.5 sm:p-3 text-center min-w-0">
                      <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider truncate">
                        Total Revenue
                      </p>
                      <p className="text-xs sm:text-base font-extrabold text-emerald-700 mt-1 truncate">
                        {formatCurrency(selected.total_revenue)}
                      </p>
                    </div>
                    <div className="rounded-xl bg-purple-50/80 border border-purple-100 p-2.5 sm:p-3 text-center min-w-0">
                      <p className="text-[10px] text-[#7c3aed] font-bold uppercase tracking-wider truncate">
                        Avg Price
                      </p>
                      <p className="text-xs sm:text-base font-extrabold text-[#7c3aed] mt-1 truncate">
                        {formatCurrency(selected.avg_price)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Recent Bookings History */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Recent Bookings ({selected.recent_bookings.length})
                    </h3>
                  </div>

                  {selected.recent_bookings.length === 0 ? (
                    <div className="rounded-2xl bg-white border border-slate-200/70 p-6 text-center text-slate-400 italic text-sm">
                      No bookings recorded for this service yet.
                    </div>
                  ) : (
                    <div className="space-y-2.5 sm:space-y-3">
                      {selected.recent_bookings.map((b, idx) => (
                        <div
                          key={`${b.booking_id}-${idx}`}
                          onClick={() =>
                            router.push(`/bookings/${b.booking_id}`)
                          }
                          className="rounded-2xl border border-slate-200/80 bg-white p-3.5 sm:p-4 shadow-xs hover:border-purple-300 hover:shadow-md hover:bg-purple-50/20 transition-all duration-150 cursor-pointer group"
                        >
                          <div className="flex items-start justify-between gap-2 min-w-0">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 min-w-0">
                                <BookOpen className="size-3.5 text-purple-600 shrink-0" />
                                <span className="text-xs sm:text-sm font-bold text-slate-800 group-hover:text-[#7c3aed] transition-colors truncate">
                                  {b.customer_name}
                                </span>
                                <ExternalLink className="size-3 text-slate-300 group-hover:text-[#7c3aed] transition-colors ml-1 shrink-0" />
                              </div>
                              <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 flex-wrap">
                                <Calendar className="size-3 text-slate-400 shrink-0" />
                                <span>{formatDate(b.booking_date)}</span>
                                {b.quantity > 1 && (
                                  <span className="text-purple-600 font-bold bg-purple-50 px-1.5 py-0.2 rounded border border-purple-100 shrink-0 text-[10px]">
                                    Qty: {b.quantity}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <span
                                className={cn(
                                  "text-[10px] font-bold px-2 py-0.5 rounded-md capitalize inline-block mb-1",
                                  STATUS_COLORS[b.status] ??
                                    "bg-slate-100 text-slate-500"
                                )}
                              >
                                {b.status}
                              </span>
                              <p className="text-xs sm:text-sm font-extrabold text-emerald-600">
                                {formatCurrency(b.unit_price * b.quantity)}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
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
