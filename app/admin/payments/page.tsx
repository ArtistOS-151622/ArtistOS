"use client"

import { useEffect, useState } from "react"
import { useHeaderContext } from "@/components/common/dashboard/dashboard-header-context"
import { Loader2, CreditCard, Receipt, Crown, IndianRupee } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"

type PlatformPayment = {
  id: number
  user_id: number
  plan_name: string
  base_amount: number
  gst_amount: number
  amount: number
  status: string
  invoice_number: string | null
  created_at: string
  users: {
    artist_name: string
    studio_name: string
    phone: string
  } | null
}

const statusStyle: Record<string, string> = {
  completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  pending:   "bg-amber-50 text-amber-700 border-amber-200",
  failed:    "bg-red-50 text-red-700 border-red-200",
}

export default function AdminPaymentsPage() {
  const { setTitle } = useHeaderContext()
  const [payments, setPayments] = useState<PlatformPayment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setTitle("Platform Payments")
    fetch("/api/admin/payments")
      .then(r => r.json())
      .then(data => setPayments(Array.isArray(data) ? data : []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [setTitle])

  const totalRevenue = payments
    .filter(p => p.status === "completed")
    .reduce((s, p) => s + Number(p.amount), 0)

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-slate-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-5">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Total Revenue</div>
          <div className="text-2xl font-bold text-slate-900 flex items-center gap-1">
            <IndianRupee className="size-5" />
            {totalRevenue.toLocaleString("en-IN")}
          </div>
        </div>
        <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-5">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Total Transactions</div>
          <div className="text-2xl font-bold text-slate-900">{payments.length}</div>
        </div>
        <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-5">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Completed</div>
          <div className="text-2xl font-bold text-emerald-600">
            {payments.filter(p => p.status === "completed").length}
          </div>
        </div>
      </div>

      {/* Payments table */}
      <div className="overflow-hidden rounded-[2rem] border border-slate-100 bg-white shadow-sm">
        {payments.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <div className="flex size-16 items-center justify-center rounded-2xl bg-slate-50 text-slate-400 mb-4">
              <CreditCard className="size-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">No Platform Payments Yet</h3>
            <p className="max-w-md text-sm text-slate-500">
              Platform subscription payments will appear here once users start purchasing plans.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="border-b border-slate-100 bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-6 py-4 font-medium">Artist / Studio</th>
                  <th className="px-6 py-4 font-medium">Plan</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium">Amount</th>
                  <th className="px-6 py-4 font-medium">Invoice</th>
                  <th className="px-6 py-4 font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">{p.users?.artist_name ?? "—"}</div>
                      <div className="text-slate-500 text-xs">{p.users?.studio_name ?? p.users?.phone ?? "—"}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="inline-flex items-center gap-1.5 rounded-full bg-purple-50 border border-purple-200 px-2.5 py-0.5 text-xs font-semibold text-purple-700">
                        <Crown className="size-3" />
                        {p.plan_name}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize", statusStyle[p.status] ?? statusStyle.pending)}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900">₹{Number(p.amount).toLocaleString("en-IN")}</div>
                      {p.gst_amount > 0 && (
                        <div className="text-xs text-slate-400">incl. ₹{Number(p.gst_amount).toLocaleString("en-IN")} GST</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-slate-500 text-xs">
                        <Receipt className="size-3.5" />
                        {p.invoice_number ?? "—"}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {format(new Date(p.created_at), "MMM d, yyyy")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}


