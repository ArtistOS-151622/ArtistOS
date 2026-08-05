"use client"

import { useEffect, useState, useRef } from "react"
import { useHeaderContext } from "@/components/common/dashboard/dashboard-header-context"
import {
  Crown, CheckCircle2, Download, Receipt, CreditCard,
  Sparkles, ArrowRight, Loader2, FileText, Calendar,
  ShieldCheck, Zap, BadgeCheck
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { format } from "date-fns"
import useSWR from "swr"
import { toast } from "sonner"

const fetcher = (url: string) => fetch(url).then(r => r.json())

type Plan = {
  id: number
  name: string
  description: string
  amount_inr: number
  billing_period: string
  features: string[]
  is_featured: boolean
  is_active: boolean
}

type Payment = {
  id: string
  amount: number
  plan_name: string
  status: string
  created_at: string
  invoice_number: string
  type: string
}

type BillingData = {
  subscription: {
    id: number
    status: string
    current_period_end: string
    platform_subscriptions: Plan
  } | null
  payments: Payment[]
}

const statusColor: Record<string, string> = {
  paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  failed: "bg-red-50 text-red-700 border-red-200",
}

export default function BillingPage() {
  const { setTitle } = useHeaderContext()

  const { data: billing, isLoading: billingLoading } = useSWR<BillingData>("/api/billing", fetcher)
  const { data: plans, isLoading: plansLoading } = useSWR<Plan[]>("/api/platform-subscriptions", fetcher)

  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  const isLoading = billingLoading || plansLoading
  const currentPlan = billing?.subscription?.platform_subscriptions ?? null
  const payments = billing?.payments ?? []

  useEffect(() => {
    setTitle("Billing & Payment")
  }, [setTitle])

  const handleDownloadInvoice = async (payment: Payment) => {
    setDownloadingId(payment.id)
    try {
      const response = await fetch(`/api/billing/invoice/${payment.id}`)
      if (!response.ok) throw new Error("Failed to generate PDF")
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `Invoice-${payment.invoice_number || payment.id}.pdf`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error(err)
      toast.error("Failed to download invoice. Please try again.")
    } finally {
      setDownloadingId(null)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">

      {/* Current Plan Card */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400 mb-4 px-1">Current Plan</h2>
        {isLoading ? (
          <div className="rounded-3xl bg-white border border-slate-100 shadow-sm p-6 space-y-3">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-10 w-20" />
            <Skeleton className="h-4 w-64" />
          </div>
        ) : currentPlan ? (
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#7c3aed] via-[#6d28d9] to-[#5b21b6] p-7 text-white shadow-xl shadow-purple-600/25">
            {/* Decorative orb */}
            <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
            <div className="pointer-events-none absolute -left-8 bottom-0 h-32 w-32 rounded-full bg-white/5 blur-2xl" />

            <div className="relative flex flex-col sm:flex-row sm:items-start sm:justify-between gap-5">
              <div>
                <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-widest mb-3">
                  <BadgeCheck className="size-3.5" /> Active Plan
                </div>
                <h3 className="text-3xl font-bold">{currentPlan.name}</h3>
                <p className="mt-1 text-white/70 text-sm">{currentPlan.description}</p>
                <div className="mt-4 flex items-end gap-1">
                  <span className="text-4xl font-bold">
                    {currentPlan.amount_inr === 0 ? "Custom" : `₹${currentPlan.amount_inr}`}
                  </span>
                  {currentPlan.billing_period && (
                    <span className="text-white/60 text-sm mb-1">{currentPlan.billing_period}</span>
                  )}
                </div>
                {billing?.subscription?.current_period_end && (
                  <p className="mt-3 text-white/60 text-xs flex items-center gap-1.5">
                    <Calendar className="size-3.5" />
                    Renews on {format(new Date(billing.subscription.current_period_end), "MMMM d, yyyy")}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-2 shrink-0">
                <div className="space-y-2">
                  {currentPlan.features.slice(0, 4).map(f => (
                    <div key={f} className="flex items-center gap-2 text-sm text-white/85">
                      <CheckCircle2 className="size-4 text-white/60 shrink-0" />
                      {f}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-3xl bg-white border border-slate-100 shadow-sm p-7 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-slate-50">
                <Zap className="size-6 text-slate-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-slate-900">Free Plan</h3>
                  <span className="text-[11px] font-bold uppercase tracking-wider bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">Current</span>
                </div>
                <p className="text-sm text-slate-500 mt-0.5">You're on the free tier. Upgrade to unlock premium features.</p>
              </div>
            </div>
            <a href="#plans">
              <Button className="shrink-0 h-11 rounded-xl bg-[#7c3aed] hover:bg-[#6d28d9] text-white shadow-lg shadow-purple-600/20">
                <Crown className="size-4 mr-2" /> Upgrade Plan
              </Button>
            </a>
          </div>
        )}
      </section>

      {/* Available Plans (shown when on free plan or always to allow upgrades) */}
      {!isLoading && plans && plans.length > 0 && (
        <section id="plans">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400 mb-4 px-1">
            {currentPlan ? "Available Plans" : "Choose a Plan"}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {plans.map(plan => {
              const isCurrent = currentPlan?.id === plan.id
              const isFeatured = plan.is_featured
              return (
                <div
                  key={plan.id}
                  className={`relative flex flex-col overflow-hidden rounded-2xl border p-6 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg ${
                    isFeatured
                      ? "bg-gradient-to-br from-[#7c3aed] to-[#5b21b6] border-[#7c3aed] text-white shadow-lg shadow-purple-600/20"
                      : "bg-white border-slate-100 shadow-sm"
                  }`}
                >
                  {isFeatured && (
                    <span className="absolute right-4 top-4 flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                      <Sparkles className="size-3" /> Best Value
                    </span>
                  )}
                  {isCurrent && (
                    <span className="absolute right-4 top-4 flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                      <ShieldCheck className="size-3" /> Current
                    </span>
                  )}
                  <p className={`text-xs font-bold uppercase tracking-widest mb-2 ${isFeatured ? "text-white/70" : "text-[#7c3aed]"}`}>
                    {plan.name}
                  </p>
                  <div className="flex items-end gap-1 mb-3">
                    <span className={`text-3xl font-bold ${isFeatured ? "text-white" : "text-slate-900"}`}>
                      {plan.amount_inr === 0 ? "Custom" : `₹${plan.amount_inr}`}
                    </span>
                    {plan.billing_period && (
                      <span className={`text-xs mb-1 ${isFeatured ? "text-white/60" : "text-slate-400"}`}>{plan.billing_period}</span>
                    )}
                  </div>
                  <p className={`text-xs leading-5 mb-4 ${isFeatured ? "text-white/70" : "text-slate-500"}`}>{plan.description}</p>
                  <div className="flex-1 space-y-2 mb-5">
                    {plan.features.slice(0, 4).map(f => (
                      <div key={f} className={`flex items-start gap-2 text-xs ${isFeatured ? "text-white/85" : "text-slate-600"}`}>
                        <CheckCircle2 className={`size-3.5 shrink-0 mt-0.5 ${isFeatured ? "text-white/70" : "text-[#7c3aed]"}`} />
                        {f}
                      </div>
                    ))}
                  </div>
                  <button
                    disabled={isCurrent}
                    className={`w-full h-10 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                      isCurrent
                        ? "bg-emerald-50 text-emerald-700 cursor-not-allowed"
                        : isFeatured
                          ? "bg-white text-[#7c3aed] hover:bg-[#f3e8ff]"
                          : "bg-[#7c3aed] text-white hover:bg-[#6d28d9] shadow-md shadow-purple-600/20"
                    }`}
                  >
                    {isCurrent ? (<><ShieldCheck className="size-3.5" /> Current Plan</>) : (<>Get Started <ArrowRight className="size-3.5" /></>)}
                  </button>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Payment History */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400 mb-4 px-1">Payment History</h2>
        {isLoading ? (
          <div className="rounded-3xl bg-white border border-slate-100 shadow-sm overflow-hidden">
            {[1, 2, 3].map(i => (
              <div key={i} className="p-5 border-b last:border-0 border-slate-50 flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-8 w-24 rounded-xl" />
              </div>
            ))}
          </div>
        ) : payments.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-3xl bg-white border border-slate-100 shadow-sm p-12 text-center">
            <div className="flex size-16 items-center justify-center rounded-2xl bg-slate-50 mb-4">
              <Receipt className="size-7 text-slate-300" />
            </div>
            <h3 className="font-bold text-slate-900 mb-1">No payments yet</h3>
            <p className="text-sm text-slate-400 max-w-xs">
              Once you subscribe to a plan, your invoice history will appear here. You can download each invoice as a PDF.
            </p>
          </div>
        ) : (
          <div className="rounded-3xl bg-white border border-slate-100 shadow-sm overflow-hidden">
            <div className="divide-y divide-slate-50">
              {payments.map(payment => (
                <div
                  key={payment.id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 hover:bg-slate-50/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className={`flex size-11 shrink-0 items-center justify-center rounded-2xl ${payment.type === 'storage' ? 'bg-amber-50' : 'bg-purple-50'}`}>
                      <FileText className={`size-5 ${payment.type === 'storage' ? 'text-amber-500' : 'text-[#7c3aed]'}`} />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 text-sm">{payment.plan_name}</p>
                      <div className="flex items-center gap-3 mt-0.5">
                        <p className="text-xs text-slate-400">
                          {format(new Date(payment.created_at), "MMM d, yyyy")}
                        </p>
                        {payment.invoice_number && (
                          <p className="text-xs text-slate-400">#{payment.invoice_number}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 sm:gap-5 ml-15 sm:ml-0">
                    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${statusColor[payment.status] || statusColor.paid}`}>
                      {payment.status}
                    </span>
                    <p className="font-bold text-slate-900 text-sm w-20 text-right">
                      ₹{payment.amount.toLocaleString("en-IN")}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadInvoice(payment)}
                      disabled={downloadingId === payment.id}
                      className="h-9 rounded-xl text-xs border-slate-200 hover:border-[#7c3aed] hover:text-[#7c3aed]"
                    >
                      {downloadingId === payment.id ? (
                        <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                      ) : (
                        <Download className="size-3.5 mr-1.5" />
                      )}
                      Invoice
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

    </div>
  )
}
