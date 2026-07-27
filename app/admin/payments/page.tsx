"use client"

import { useEffect, useState } from "react"
import { useHeaderContext } from "@/components/common/dashboard/dashboard-header-context"
import { Loader2 } from "lucide-react"
import { format } from "date-fns"

type PaymentData = {
  id: number
  amount: number
  payment_type: string
  payment_method: string
  payment_date: string
  remark: string
  created_at: string
  users: {
    id: number
    artist_name: string
    studio_name: string
  }
}

export default function AdminPaymentsPage() {
  const { setTitle } = useHeaderContext()
  const [payments, setPayments] = useState<PaymentData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setTitle("Platform Payments")
    
    const fetchPayments = async () => {
      try {
        const res = await fetch("/api/admin/payments")
        if (res.ok) {
          const data = await res.json()
          setPayments(data)
        }
      } catch (e) {
        console.error("Failed to fetch payments", e)
      } finally {
        setLoading(false)
      }
    }
    
    fetchPayments()
  }, [setTitle])

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-slate-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[2rem] border border-slate-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-6 py-4 font-medium">Artist / Studio</th>
                <th className="px-6 py-4 font-medium">Amount</th>
                <th className="px-6 py-4 font-medium">Payment Details</th>
                <th className="px-6 py-4 font-medium">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payments.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                    No payments found.
                  </td>
                </tr>
              ) : (
                payments.map((payment) => (
                  <tr key={payment.id} className="transition-colors hover:bg-slate-50/50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">{payment.users?.artist_name}</div>
                      <div className="text-slate-500">{payment.users?.studio_name}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900">
                        ₹{payment.amount.toLocaleString('en-IN')}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-600">
                          {payment.payment_type}
                        </span>
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                          {payment.payment_method}
                        </span>
                      </div>
                      {payment.remark && (
                        <div className="mt-1 text-xs text-slate-500 max-w-[200px] truncate" title={payment.remark}>
                          {payment.remark}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {format(new Date(payment.payment_date), "MMM d, yyyy")}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
