"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Search, Users, TrendingUp, Wallet, AlertCircle,
  ChevronRight, Phone, Mail, MapPin, Calendar, CreditCard,
  X, BookOpen,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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

const STATUS_COLORS: Record<string, string> = {
  confirmed: "bg-blue-50 text-blue-700 border border-blue-200",
  pending: "bg-amber-50 text-amber-700 border border-amber-200",
  completed: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  cancelled: "bg-rose-50 text-rose-700 border border-rose-200",
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

export function ReportCustomerTab({ dateRange }: { dateRange: { start: string; end: string } | null }) {
  const [data, setData] = useState<{ customers: CustomerReport[]; totals: any } | null>(null)
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
    } catch { /* silent */ }
    finally { setLoading(false) }
  }, [debouncedSearch, sort, dateRange])

  useEffect(() => {
    load()
  }, [load])

  const totals = data?.totals
  const customers = data?.customers ?? []

  return (
    <div className="space-y-5">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <ReportSummaryCard
          label="Total Customers"
          value={String(totals?.total_customers ?? "—")}
          icon={<Users className="size-5" />}
          color="purple"
        />
        <ReportSummaryCard
          label="Total Billed"
          value={totals ? formatCurrency(totals.total_billed) : "—"}
          icon={<TrendingUp className="size-5" />}
          color="blue"
        />
        <ReportSummaryCard
          label="Total Collected"
          value={totals ? formatCurrency(totals.total_paid) : "—"}
          icon={<Wallet className="size-5" />}
          color="green"
        />
        <ReportSummaryCard
          label="Outstanding Due"
          value={totals ? formatCurrency(totals.balance_due) : "—"}
          icon={<AlertCircle className="size-5" />}
          color={totals?.balance_due > 0 ? "red" : "green"}
        />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-3 p-4 border-b border-slate-100 bg-white">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3.5 size-4 text-slate-400 pointer-events-none" />
            <Input
              placeholder="Search by name, phone, or email…"
              className="pl-10 h-11 rounded-xl border-slate-200 bg-slate-50/50 shadow-none focus-visible:bg-white transition-colors"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-3 overflow-x-auto pb-1 sm:pb-0">
            <DropdownMenu>
              <DropdownMenuTrigger className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition shrink-0">
                Sort: {sort === "recent" ? "Recent Booking" : sort === "most_bookings" ? "Most Bookings" : sort === "highest_billed" ? "Highest Billed" : sort === "highest_due" ? "Highest Due" : "Name A-Z"}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-2xl w-48">
                <DropdownMenuRadioGroup value={sort} onValueChange={setSort}>
                  <DropdownMenuRadioItem value="recent" className="rounded-xl cursor-pointer">Recent Booking</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="most_bookings" className="rounded-xl cursor-pointer">Most Bookings</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="highest_billed" className="rounded-xl cursor-pointer">Highest Billed</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="highest_due" className="rounded-xl cursor-pointer">Highest Due</DropdownMenuRadioItem>
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
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-16 rounded-xl bg-slate-100 animate-pulse" />
              ))}
            </div>
          ) : customers.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-slate-400">
              <Users className="size-12 mb-3 text-slate-200" />
              <p className="font-semibold text-slate-500">No customers found</p>
              <p className="text-sm mt-1">Try adjusting your search or date range.</p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/60">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Customer</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Bookings</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Billed</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Paid</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Due</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Last Booking</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {customers.map((c) => (
                      <tr
                        key={c.id}
                        className="hover:bg-slate-50/60 transition-colors cursor-pointer group"
                        onClick={() => setSelected(c)}
                      >
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-[#7c3aed] font-bold text-sm">
                              {c.customer_name.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900">{c.customer_name}</p>
                              <p className="text-xs text-slate-400">{c.phone}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <span className="inline-flex items-center justify-center rounded-lg bg-purple-50 text-[#7c3aed] font-bold text-xs px-2 py-0.5 border border-purple-100">
                            {c.booking_count}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right font-semibold text-slate-700">{formatCurrency(c.total_billed)}</td>
                        <td className="px-4 py-3.5 text-right font-semibold text-emerald-600">{formatCurrency(c.total_paid)}</td>
                        <td className="px-4 py-3.5 text-right font-bold">
                          <span className={c.balance_due > 0 ? "text-rose-600" : "text-slate-400"}>
                            {c.balance_due > 0 ? formatCurrency(c.balance_due) : "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right text-slate-400 text-xs">{formatDate(c.last_booking_date ?? "")}</td>
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
                {customers.map((c) => (
                  <div
                    key={c.id}
                    className="p-4 cursor-pointer hover:bg-slate-50/60 transition"
                    onClick={() => setSelected(c)}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-[#7c3aed] font-bold text-sm">
                          {c.customer_name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{c.customer_name}</p>
                          <p className="text-xs text-slate-400">{c.phone}</p>
                        </div>
                      </div>
                      <span className="inline-flex items-center rounded-lg bg-purple-50 text-[#7c3aed] font-bold text-xs px-2 py-0.5 border border-purple-100">
                        {c.booking_count} {c.booking_count === 1 ? "Booking" : "Bookings"}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-xl bg-slate-50 p-2 border border-slate-100/50">
                        <p className="text-[10px] text-slate-400 uppercase tracking-wider">Billed</p>
                        <p className="text-xs font-bold text-slate-700 mt-0.5">{formatCurrency(c.total_billed)}</p>
                      </div>
                      <div className="rounded-xl bg-emerald-50 p-2 border border-emerald-100/50">
                        <p className="text-[10px] text-emerald-500 uppercase tracking-wider">Paid</p>
                        <p className="text-xs font-bold text-emerald-700 mt-0.5">{formatCurrency(c.total_paid)}</p>
                      </div>
                      <div className={cn("rounded-xl p-2 border", c.balance_due > 0 ? "bg-rose-50 border-rose-100/50" : "bg-slate-50 border-slate-100/50")}>
                        <p className={cn("text-[10px] uppercase tracking-wider", c.balance_due > 0 ? "text-rose-400" : "text-slate-400")}>Due</p>
                        <p className={cn("text-xs font-bold mt-0.5", c.balance_due > 0 ? "text-rose-700" : "text-slate-400")}>
                          {c.balance_due > 0 ? formatCurrency(c.balance_due) : "—"}
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

      {/* Detail Drawer */}
      <Sheet open={!!selected} onOpenChange={(o: boolean) => { if (!o) setSelected(null) }}>
        <SheetContent side="right" className="w-full sm:max-w-4xl overflow-y-auto p-0">
          {selected && (
            <div className="flex flex-col h-full">
              {/* Header */}
              <SheetHeader className="px-6 pt-6 pb-4 border-b border-slate-100 shrink-0 bg-gradient-to-br from-[#7c3aed]/5 to-transparent">
                <div className="flex items-center gap-4">
                  <div className="flex size-14 items-center justify-center rounded-2xl bg-purple-100 text-[#7c3aed] font-bold text-xl shadow-sm">
                    {selected.customer_name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <SheetTitle className="text-xl font-bold text-slate-900 truncate">{selected.customer_name}</SheetTitle>
                    <p className="text-sm text-slate-500 mt-0.5">{selected.phone}</p>
                  </div>
                </div>
              </SheetHeader>

              <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-6 pt-4">
                {/* Contact Info */}
                <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4 space-y-2.5 text-sm">
                  {selected.email && (
                    <div className="flex items-center gap-2.5 text-slate-600">
                      <Mail className="size-3.5 text-slate-400 shrink-0" />
                      <span>{selected.email}</span>
                    </div>
                  )}
                  {selected.alt_phone && (
                    <div className="flex items-center gap-2.5 text-slate-600">
                      <Phone className="size-3.5 text-slate-400 shrink-0" />
                      <span>{selected.alt_phone} (alt)</span>
                    </div>
                  )}
                  {selected.address && (
                    <div className="flex items-start gap-2.5 text-slate-600">
                      <MapPin className="size-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <span>{selected.address}</span>
                    </div>
                  )}
                  {selected.reference_by && (
                    <div className="flex items-center gap-2.5 text-slate-600">
                      <Users className="size-3.5 text-slate-400 shrink-0" />
                      <span>Referred by {selected.reference_by}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2.5 text-slate-400">
                    <Calendar className="size-3.5 shrink-0" />
                    <span className="text-xs">Member since {formatDate(selected.created_at)}</span>
                  </div>
                </div>

                {/* Financial Summary */}
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2.5">Financial Summary</h3>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-2xl bg-blue-50 border border-blue-100 p-3 text-center">
                      <p className="text-[10px] text-blue-400 font-semibold uppercase tracking-wider">Billed</p>
                      <p className="text-sm font-bold text-blue-700 mt-1">{formatCurrency(selected.total_billed)}</p>
                    </div>
                    <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-3 text-center">
                      <p className="text-[10px] text-emerald-500 font-semibold uppercase tracking-wider">Paid</p>
                      <p className="text-sm font-bold text-emerald-700 mt-1">{formatCurrency(selected.total_paid)}</p>
                    </div>
                    <div className={cn("rounded-2xl border p-3 text-center", selected.balance_due > 0 ? "bg-rose-50 border-rose-100" : "bg-slate-50 border-slate-100")}>
                      <p className={cn("text-[10px] font-semibold uppercase tracking-wider", selected.balance_due > 0 ? "text-rose-400" : "text-slate-400")}>Due</p>
                      <p className={cn("text-sm font-bold mt-1", selected.balance_due > 0 ? "text-rose-700" : "text-slate-400")}>
                        {selected.balance_due > 0 ? formatCurrency(selected.balance_due) : "—"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Booking History */}
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2.5">
                    Booking History ({selected.booking_count})
                  </h3>
                  {selected.bookings.length === 0 ? (
                    <p className="text-sm text-slate-400 italic">No bookings yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {selected.bookings.map((b: any) => {
                        const services = (b.booking_services ?? []) as any[]
                        const charges = (b.booking_additional_charges ?? []) as any[]
                        const payments = (b.booking_payments ?? []) as any[]
                        const serviceTotal = services.reduce((s: number, sv: any) => s + ((sv.unit_price ?? sv.service?.price ?? 0) * (sv.quantity ?? 1)), 0)
                        const chargesTotal = charges.reduce((s: number, ch: any) => s + ((ch.rate ?? 0) * (ch.quantity ?? 1)), 0)
                        const billed = serviceTotal + chargesTotal - Number(b.discount ?? 0)
                        const paid = payments.reduce((s: number, p: any) => s + Number(p.amount), 0)
                        const due = billed - paid
                        const serviceNames = services.map((s: any) => s.service?.service_name).filter(Boolean)

                        return (
                          <div key={b.id} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm space-y-3">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="flex items-center gap-2">
                                  <BookOpen className="size-3.5 text-slate-400 shrink-0" />
                                  <span className="text-sm font-semibold text-slate-700">{formatDate(b.booking_date)}</span>
                                </div>
                                {serviceNames.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-1.5">
                                    {serviceNames.map((n: string) => (
                                      <span key={n} className="text-[10px] rounded-md bg-purple-50 text-[#7c3aed] px-1.5 py-0.5 font-medium border border-purple-100">{n}</span>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <span className={cn("text-[10px] font-bold px-2 py-1 rounded-lg capitalize shrink-0", STATUS_COLORS[b.status] ?? "bg-slate-100 text-slate-500")}>
                                {b.status}
                              </span>
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-center">
                              <div>
                                <p className="text-[10px] text-slate-400 uppercase">Billed</p>
                                <p className="text-xs font-bold text-slate-700">{formatCurrency(billed)}</p>
                              </div>
                              <div>
                                <p className="text-[10px] text-emerald-400 uppercase">Paid</p>
                                <p className="text-xs font-bold text-emerald-600">{formatCurrency(paid)}</p>
                              </div>
                              <div>
                                <p className={cn("text-[10px] uppercase", due > 0 ? "text-rose-400" : "text-slate-400")}>Due</p>
                                <p className={cn("text-xs font-bold", due > 0 ? "text-rose-600" : "text-slate-400")}>{due > 0 ? formatCurrency(due) : "—"}</p>
                              </div>
                            </div>
                            {payments.length > 0 && (
                              <div className="space-y-1.5 border-t border-slate-50 pt-2">
                                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Payments</p>
                                {payments.map((p: any) => (
                                  <div key={p.id} className="flex items-center justify-between text-xs">
                                    <div className="flex items-center gap-1.5">
                                      <CreditCard className="size-3 text-slate-300" />
                                      <span className="text-slate-500">{p.payment_type}</span>
                                      <span className="text-slate-300">·</span>
                                      <span className="text-slate-400">{p.payment_method}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-slate-400 text-[10px]">{formatDate(p.payment_date)}</span>
                                      <span className="font-bold text-emerald-600">{formatCurrency(Number(p.amount))}</span>
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
