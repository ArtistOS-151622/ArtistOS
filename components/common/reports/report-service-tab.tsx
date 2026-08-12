"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Search, Flower2, TrendingUp, Hash, ChevronRight,
  Calendar, Clock, Star, BookOpen,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup,
  DropdownMenuRadioItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ReportSummaryCard } from "./report-summary-card"
import { cn } from "@/lib/utils"

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n)
}

function formatDate(d: string) {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
}

function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes} min`
  const h = minutes / 60
  return Number.isInteger(h) ? `${h} hr` : `${h.toFixed(1)} hr`
}

const STATUS_COLORS: Record<string, string> = {
  confirmed: "bg-blue-50 text-blue-700 border border-blue-200",
  pending: "bg-amber-50 text-amber-700 border border-amber-200",
  completed: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  cancelled: "bg-rose-50 text-rose-700 border border-rose-200",
}

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

export function ReportServiceTab({ dateRange }: { dateRange: { start: string; end: string } | null }) {
  const [data, setData] = useState<{ services: ServiceReport[]; totals: any } | null>(null)
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
    } catch { /* silent */ }
    finally { setLoading(false) }
  }, [debouncedSearch, sort, dateRange])

  useEffect(() => {
    load()
  }, [load])

  const totals = data?.totals
  const services = data?.services ?? []

  return (
    <div className="space-y-5">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <ReportSummaryCard
          label="Total Services"
          value={String(totals?.total_services ?? "—")}
          icon={<Flower2 className="size-5" />}
          color="purple"
        />
        <ReportSummaryCard
          label="Total Usage"
          value={totals ? `${totals.total_usage} times` : "—"}
          icon={<Hash className="size-5" />}
          color="blue"
        />
        <ReportSummaryCard
          label="Total Revenue"
          value={totals ? formatCurrency(totals.total_revenue) : "—"}
          icon={<TrendingUp className="size-5" />}
          color="green"
          className="col-span-2 lg:col-span-1"
        />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-3 p-4 border-b border-slate-100 bg-white">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3.5 size-4 text-slate-400 pointer-events-none" />
            <Input
              placeholder="Search services…"
              className="pl-10 h-11 rounded-xl border-slate-200 bg-slate-50/50 shadow-none focus-visible:bg-white transition-colors"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-3 overflow-x-auto pb-1 sm:pb-0">
            <DropdownMenu>
              <DropdownMenuTrigger className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition shrink-0">
                Sort: {sort === "most_used" ? "Most Used" : sort === "most_revenue" ? "Most Revenue" : sort === "price_high" ? "Price High-Low" : "Name A-Z"}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-2xl w-48">
                <DropdownMenuRadioGroup value={sort} onValueChange={setSort}>
                  <DropdownMenuRadioItem value="most_used" className="rounded-xl cursor-pointer">Most Used</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="most_revenue" className="rounded-xl cursor-pointer">Most Revenue</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="price_high" className="rounded-xl cursor-pointer">Price High-Low</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="name" className="rounded-xl cursor-pointer">Name A-Z</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Table / List */}
        <div className="bg-white">
          {loading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-16 rounded-xl bg-slate-100 animate-pulse" />
              ))}
            </div>
          ) : services.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-slate-400">
              <Flower2 className="size-12 mb-3 text-slate-200" />
              <p className="font-semibold text-slate-500">No services found</p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/60">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Service</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Duration</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Base Price</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Used</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Revenue</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {services.map((s) => (
                      <tr
                        key={s.id}
                        className="hover:bg-slate-50/60 transition-colors cursor-pointer group"
                        onClick={() => setSelected(s)}
                      >
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-[#7c3aed]">
                              <Flower2 className="size-4" />
                            </div>
                            <p className="font-semibold text-slate-900">{s.service_name}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-right text-slate-500">{formatDuration(s.duration_minutes)}</td>
                        <td className="px-4 py-3.5 text-right font-semibold text-slate-700">{formatCurrency(Number(s.price))}</td>
                        <td className="px-4 py-3.5 text-right">
                          <span className="inline-flex items-center justify-center rounded-lg bg-blue-50 text-blue-700 font-bold text-xs px-2 py-0.5 border border-blue-100">
                            {s.usage_count}×
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right font-bold text-emerald-600">{formatCurrency(s.total_revenue)}</td>
                        <td className="px-4 py-3.5 text-right">
                          <ChevronRight className="size-4 text-slate-300 group-hover:text-[#7c3aed] transition-colors ml-auto" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile List */}
              <div className="md:hidden divide-y divide-slate-100">
                {services.map((s) => (
                  <div
                    key={s.id}
                    className="p-4 cursor-pointer hover:bg-slate-50/60 transition"
                    onClick={() => setSelected(s)}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-[#7c3aed]">
                          <Flower2 className="size-4" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{s.service_name}</p>
                          <p className="text-xs text-slate-400">{formatDuration(s.duration_minutes)}</p>
                        </div>
                      </div>
                      <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-100 font-bold px-2 py-0.5 rounded-lg">{s.usage_count}×</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-center">
                      <div className="rounded-xl bg-slate-50 p-2 border border-slate-100/50">
                        <p className="text-[10px] text-slate-400 uppercase tracking-wider">Base Price</p>
                        <p className="text-xs font-bold text-slate-700 mt-0.5">{formatCurrency(Number(s.price))}</p>
                      </div>
                      <div className="rounded-xl bg-emerald-50 p-2 border border-emerald-100/50">
                        <p className="text-[10px] text-emerald-500 uppercase tracking-wider">Revenue</p>
                        <p className="text-xs font-bold text-emerald-700 mt-0.5">{formatCurrency(s.total_revenue)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Detail Drawer */}
      <Sheet open={!!selected} onOpenChange={(o: boolean) => { if (!o) setSelected(null) }}>
        <SheetContent side="right" className="w-full sm:max-w-4xl overflow-y-auto p-0">
          {selected && (
            <div className="flex flex-col h-full">
              <SheetHeader className="px-6 pt-6 pb-4 border-b border-slate-100 shrink-0 bg-gradient-to-br from-[#7c3aed]/5 to-transparent">
                <div className="flex items-center gap-4">
                  <div className="flex size-14 items-center justify-center rounded-2xl bg-purple-100 text-[#7c3aed] shadow-sm">
                    <Flower2 className="size-7" />
                  </div>
                  <div>
                    <SheetTitle className="text-xl font-bold text-slate-900">{selected.service_name}</SheetTitle>
                    <p className="text-sm text-slate-400 mt-0.5">{formatDuration(selected.duration_minutes)} · {formatCurrency(Number(selected.price))}</p>
                  </div>
                </div>
              </SheetHeader>

              <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-6 pt-4">
                {/* Stats */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-2xl bg-blue-50 border border-blue-100 p-3 text-center">
                    <p className="text-[10px] text-blue-400 uppercase tracking-wider">Used</p>
                    <p className="text-lg font-bold text-blue-700 mt-1">{selected.usage_count}×</p>
                  </div>
                  <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-3 text-center">
                    <p className="text-[10px] text-emerald-400 uppercase tracking-wider">Revenue</p>
                    <p className="text-sm font-bold text-emerald-700 mt-1">{formatCurrency(selected.total_revenue)}</p>
                  </div>
                  <div className="rounded-2xl bg-purple-50 border border-purple-100 p-3 text-center">
                    <p className="text-[10px] text-purple-400 uppercase tracking-wider">Avg Price</p>
                    <p className="text-sm font-bold text-[#7c3aed] mt-1">{formatCurrency(selected.avg_price)}</p>
                  </div>
                </div>

                {/* Booking History */}
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2.5">Booking History ({selected.recent_bookings.length})</h3>
                  {selected.recent_bookings.length === 0 ? (
                    <p className="text-sm text-slate-400 italic">No bookings yet.</p>
                  ) : (
                    <div className="space-y-2.5">
                      {selected.recent_bookings.map((b, idx) => (
                        <div key={`${b.booking_id}-${idx}`} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <BookOpen className="size-3.5 text-slate-400" />
                                <span className="text-sm font-semibold text-slate-700">{b.customer_name}</span>
                              </div>
                              <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-400">
                                <Calendar className="size-3" />
                                <span>{formatDate(b.booking_date)}</span>
                                {b.quantity > 1 && <span className="text-purple-500 font-semibold ml-1">×{b.quantity}</span>}
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <span className={cn("text-[10px] font-bold px-2 py-1 rounded-lg capitalize block mb-1", STATUS_COLORS[b.status] ?? "bg-slate-100 text-slate-500")}>
                                {b.status}
                              </span>
                              <span className="text-sm font-bold text-emerald-600">{formatCurrency(b.unit_price * b.quantity)}</span>
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
