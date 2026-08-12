"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Search, Wallet, AlertCircle, TrendingUp, CreditCard,
  ChevronRight, Calendar, Users, Scissors, Clock,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
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

const PAYMENT_TYPE_COLORS: Record<string, string> = {
  "Advance": "bg-blue-50 text-blue-700 border border-blue-200",
  "Installment": "bg-amber-50 text-amber-700 border border-amber-200",
  "Final Payment": "bg-emerald-50 text-emerald-700 border border-emerald-200",
}

const STATUS_COLORS: Record<string, string> = {
  confirmed: "bg-blue-50 text-blue-700 border border-blue-200",
  pending: "bg-amber-50 text-amber-700 border border-amber-200",
  completed: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  cancelled: "bg-rose-50 text-rose-700 border border-rose-200",
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

export function ReportPaymentTab({ dateRange }: { dateRange: { start: string; end: string } | null }) {
  const [data, setData] = useState<{ payments: PaymentRow[]; pending_bookings: PendingBooking[]; totals: any } | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [paymentType, setPaymentType] = useState("all")
  const [view, setView] = useState<"all" | "pending">("all")

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(t)
  }, [search])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ search: debouncedSearch, payment_type: paymentType, view })
      if (dateRange) {
        params.set("start_date", dateRange.start)
        params.set("end_date", dateRange.end)
      }
      const res = await fetch(`/api/reports/payments?${params}`)
      const json = await res.json()
      if (res.ok) setData(json)
    } catch { /* silent */ }
    finally { setLoading(false) }
  }, [debouncedSearch, paymentType, view, dateRange])

  useEffect(() => {
    load()
  }, [load])

  const totals = data?.totals
  const payments = data?.payments ?? []
  const pendingBookings = data?.pending_bookings ?? []

  return (
    <div className="space-y-5">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <ReportSummaryCard
          label="Total Collected"
          value={totals ? formatCurrency(totals.total_collected) : "—"}
          icon={<Wallet className="size-5" />}
          color="green"
        />
        <ReportSummaryCard
          label="Advance Paid"
          value={totals ? formatCurrency(totals.total_advance) : "—"}
          icon={<TrendingUp className="size-5" />}
          color="blue"
        />
        <ReportSummaryCard
          label="Final Payments"
          value={totals ? formatCurrency(totals.total_final) : "—"}
          icon={<CreditCard className="size-5" />}
          color="purple"
        />
        <ReportSummaryCard
          label="Total Pending"
          value={totals ? formatCurrency(totals.total_pending) : "—"}
          subLabel={totals ? `${totals.pending_count} bookings` : undefined}
          icon={<AlertCircle className="size-5" />}
          color={totals?.total_pending > 0 ? "red" : "green"}
        />
      </div>

      {/* View Toggle & Controls inside a Unified Card */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {/* Card Header */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 p-4 border-b border-slate-100 bg-white">
          {/* Toggle */}
          <div className="flex rounded-xl bg-slate-100 p-1 shrink-0 w-full sm:w-auto overflow-x-auto">
            <button
              onClick={() => setView("all")}
              className={cn(
                "flex-1 sm:flex-none rounded-xl px-4 py-2 text-sm font-semibold transition-all whitespace-nowrap",
                view === "all" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
              )}
            >
              All Payments
            </button>
            <button
              onClick={() => setView("pending")}
              className={cn(
                "flex-1 sm:flex-none rounded-xl px-4 py-2 text-sm font-semibold transition-all whitespace-nowrap",
                view === "pending" ? "bg-rose-500 text-white shadow-sm" : "text-slate-500 hover:text-slate-700"
              )}
            >
              Pending Due
              {totals?.pending_count > 0 && (
                <span className={cn("ml-2 rounded-full px-1.5 py-0.5 text-[10px] font-bold", view === "pending" ? "bg-white/20" : "bg-rose-100 text-rose-600")}>
                  {totals.pending_count}
                </span>
              )}
            </button>
          </div>

          {/* Controls (Search + Filter) - Only show if view === "all" */}
          {view === "all" && (
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full xl:w-auto">
              <div className="relative w-full sm:w-64 shrink-0">
                <Search className="absolute left-3.5 top-3.5 size-4 text-slate-400 pointer-events-none" />
                <Input
                  placeholder="Search by customer or service…"
                  className="pl-10 h-11 rounded-xl border-slate-200 bg-slate-50/50 shadow-none focus-visible:bg-white w-full transition-colors"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-3 overflow-x-auto w-full sm:w-auto">
                <DropdownMenu>
                  <DropdownMenuTrigger className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition shrink-0">
                    {paymentType === "all" ? "All Types" : paymentType}
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="rounded-2xl w-48">
                    <DropdownMenuRadioGroup value={paymentType} onValueChange={setPaymentType}>
                      <DropdownMenuRadioItem value="all" className="rounded-xl cursor-pointer">All Types</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="Advance" className="rounded-xl cursor-pointer">Advance</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="Installment" className="rounded-xl cursor-pointer">Installment</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="Final Payment" className="rounded-xl cursor-pointer">Final Payment</DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          )}
        </div>

        {/* Card Body (Table/List) */}
        <div className="bg-white">
          {loading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-16 rounded-xl bg-slate-100 animate-pulse" />
              ))}
            </div>
          ) : view === "pending" ? (
            /* Pending Bookings View */
            pendingBookings.length === 0 ? (
              <div className="flex flex-col items-center py-16 text-slate-400">
                <AlertCircle className="size-12 mb-3 text-emerald-200" />
                <p className="font-semibold text-slate-500">All payments are clear!</p>
                <p className="text-sm mt-1">No outstanding dues found.</p>
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 bg-rose-50/60">
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Customer</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Booking Date</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Services</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Billed</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Paid</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-rose-400 uppercase tracking-wider">Due</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {pendingBookings.map((b) => (
                        <tr key={b.booking_id} className="hover:bg-rose-50/30 transition-colors">
                          <td className="px-4 py-3.5">
                            <p className="font-semibold text-slate-900">{b.customer_name}</p>
                            <p className="text-xs text-slate-400">{b.customer_phone}</p>
                          </td>
                          <td className="px-4 py-3.5">
                            <p className="text-slate-600">{formatDate(b.booking_date)}</p>
                            <span className={cn("inline-block mt-1 text-[10px] font-bold px-1.5 py-0.5 rounded capitalize", STATUS_COLORS[b.booking_status])}>
                              {b.booking_status}
                            </span>
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="flex flex-wrap gap-1">
                              {b.services.map(s => (
                                <span key={s} className="text-[10px] rounded-md bg-purple-50 text-[#7c3aed] px-1.5 py-0.5 border border-purple-100">{s}</span>
                              ))}
                            </div>
                          </td>
                          <td className="px-4 py-3.5 text-right font-semibold text-slate-700">{formatCurrency(b.total_billed)}</td>
                          <td className="px-4 py-3.5 text-right font-semibold text-emerald-600">{formatCurrency(b.total_paid)}</td>
                          <td className="px-4 py-3.5 text-right font-bold text-rose-600">{formatCurrency(b.balance_due)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile List */}
                <div className="md:hidden divide-y divide-rose-100/50">
                  {pendingBookings.map((b) => (
                    <div key={b.booking_id} className="p-4 bg-rose-50/20">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-semibold text-slate-900">{b.customer_name}</p>
                          <p className="text-xs text-slate-400">{b.customer_phone}</p>
                        </div>
                        <span className={cn("text-[10px] font-bold px-1.5 py-1 rounded capitalize", STATUS_COLORS[b.booking_status])}>
                          {b.booking_status}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1 mb-3">
                        {b.services.map(s => (
                          <span key={s} className="text-[10px] rounded-md bg-purple-50 text-[#7c3aed] px-1.5 py-0.5 border border-purple-100">{s}</span>
                        ))}
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="rounded-xl bg-slate-50 p-2 border border-slate-100/50">
                          <p className="text-[10px] text-slate-400 uppercase">Billed</p>
                          <p className="text-xs font-bold text-slate-700">{formatCurrency(b.total_billed)}</p>
                        </div>
                        <div className="rounded-xl bg-emerald-50 p-2 border border-emerald-100/50">
                          <p className="text-[10px] text-emerald-400 uppercase">Paid</p>
                          <p className="text-xs font-bold text-emerald-700">{formatCurrency(b.total_paid)}</p>
                        </div>
                        <div className="rounded-xl bg-rose-50 p-2 border border-rose-100/50">
                          <p className="text-[10px] text-rose-400 uppercase">Due</p>
                          <p className="text-xs font-bold text-rose-700">{formatCurrency(b.balance_due)}</p>
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
                <p className="font-semibold text-slate-500">No payments found</p>
                <p className="text-sm mt-1">Try adjusting your search or filters.</p>
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/60">
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Payment Date</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Customer</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Services</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Type</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Method</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {payments.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-4 py-3.5">
                            <p className="font-semibold text-slate-700">{formatDate(p.payment_date)}</p>
                            <p className="text-xs text-slate-400">{formatDate(p.booking_date)}</p>
                          </td>
                          <td className="px-4 py-3.5">
                            <p className="font-semibold text-slate-900">{p.customer_name}</p>
                            <p className="text-xs text-slate-400">{p.customer_phone}</p>
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="flex flex-wrap gap-1">
                              {p.services.slice(0, 2).map(s => (
                                <span key={s} className="text-[10px] rounded-md bg-purple-50 text-[#7c3aed] px-1.5 py-0.5 border border-purple-100">{s}</span>
                              ))}
                              {p.services.length > 2 && <span className="text-[10px] text-slate-400">+{p.services.length - 2}</span>}
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className={cn("text-[10px] font-bold px-2 py-1 rounded-lg", PAYMENT_TYPE_COLORS[p.payment_type] ?? "bg-slate-100 text-slate-500")}>
                              {p.payment_type}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-slate-500">{p.payment_method}</td>
                          <td className="px-4 py-3.5 text-right font-bold text-emerald-600">{formatCurrency(p.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile List */}
                <div className="md:hidden divide-y divide-slate-100">
                  {payments.map((p) => (
                    <div key={p.id} className="p-4 hover:bg-slate-50/60 transition-colors">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-semibold text-slate-900">{p.customer_name}</p>
                          <p className="text-xs text-slate-400">{formatDate(p.payment_date)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-base font-bold text-emerald-600">{formatCurrency(p.amount)}</p>
                          <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded mt-1 inline-block", PAYMENT_TYPE_COLORS[p.payment_type] ?? "bg-slate-100 text-slate-500")}>
                            {p.payment_type}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {p.services.map(s => (
                          <span key={s} className="text-[10px] rounded-md bg-purple-50 text-[#7c3aed] px-1.5 py-0.5 border border-purple-100">{s}</span>
                        ))}
                      </div>
                      <p className="text-xs text-slate-400 mt-2">Via {p.payment_method} · Booking {formatDate(p.booking_date)}</p>
                    </div>
                  ))}
                </div>
              </>
            )
          )}
        </div>
      </div>
    </div>
  )
}
