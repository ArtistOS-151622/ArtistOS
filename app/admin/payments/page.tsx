"use client"

import { useEffect } from "react"
import { useHeaderContext } from "@/components/common/dashboard/dashboard-header-context"
import { CreditCard } from "lucide-react"

export default function AdminPaymentsPage() {
  const { setTitle } = useHeaderContext()

  useEffect(() => {
    setTitle("Platform Payments")
  }, [setTitle])

  return (
    <div className="space-y-6">
      <div className="flex min-h-[50vh] flex-col items-center justify-center rounded-[2rem] border border-slate-100 bg-white shadow-sm p-8 text-center">
        <div className="flex size-16 items-center justify-center rounded-2xl bg-slate-50 text-slate-400 mb-4">
          <CreditCard className="size-8" />
        </div>
        <h3 className="text-xl font-bold text-slate-900 mb-2">No Payments Yet</h3>
        <p className="max-w-md text-sm text-slate-500">
          Once you integrate platform-level payments (like subscriptions or customized plans), the transaction history will appear here.
        </p>
      </div>
    </div>
  )
}

