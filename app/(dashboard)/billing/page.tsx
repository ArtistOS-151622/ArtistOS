"use client"

import { useEffect, useState } from "react"
import { useHeaderContext } from "@/components/common/dashboard/dashboard-header-context"
import {
  Crown, CheckCircle2, Download, Receipt,
  Sparkles, Loader2, FileText, Calendar,
  ShieldCheck, Zap, BadgeCheck
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { format } from "date-fns"
import useSWR, { mutate } from "swr"
import { toast } from "sonner"

const fetcher = (url: string) => fetch(url).then(r => r.json())

type CheckoutData = {
  key?: string
  name: string
  description: string
  amount: number
  type: "subscription" | "order"
  subscription_id?: string
  order_id?: string
  payment_id: string
}

type RazorpaySuccessResponse = {
  razorpay_order_id?: string
  razorpay_subscription_id?: string
  razorpay_payment_id?: string
  razorpay_signature?: string
}

type RazorpayFailedResponse = {
  error?: {
    description?: string
  }
}

type RazorpayOptions = {
  key: string
  name: string
  description: string
  amount: number
  currency: "INR"
  subscription_id?: string
  order_id?: string
  handler: (response: RazorpaySuccessResponse) => Promise<void>
  modal: {
    ondismiss: () => Promise<void>
  }
}

type RazorpayInstance = {
  on: (event: "payment.failed", handler: (response: RazorpayFailedResponse) => Promise<void>) => void
  open: () => void
}

type RazorpayConstructor = new (options: RazorpayOptions) => RazorpayInstance

type WindowWithRazorpay = Window & {
  Razorpay?: RazorpayConstructor
}

type Plan = {
  id: number
  name: string
  description: string
  amount_inr: number
  compare_at_amount_inr?: number | null
  discount_percentage?: number | null
  gst_percentage?: number | null
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

const isFreeTierPlan = (plan: Plan) => plan.amount_inr === 0 && plan.billing_period !== ""

const statusColor: Record<string, string> = {
  paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  failed: "bg-red-50 text-red-700 border-red-200",
}

export default function BillingPage() {
  const { setTitle } = useHeaderContext()

  const { data: billing, isLoading: billingLoading, mutate: mutateBilling } = useSWR<BillingData>("/api/billing", fetcher)
  const { data: plans, isLoading: plansLoading } = useSWR<Plan[]>("/api/platform-subscriptions", fetcher)

  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [loadingPlanId, setLoadingPlanId] = useState<number | null>(null)

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

  async function loadRazorpayScript() {
    if ((window as WindowWithRazorpay).Razorpay) return
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement("script")
      script.src = "https://checkout.razorpay.com/v1/checkout.js"
      script.onload = () => resolve()
      script.onerror = () => reject(new Error("Failed to load Razorpay"))
      document.body.appendChild(script)
    })
  }

  const handlePurchase = async (plan: Plan) => {
    if (plan.name.toLowerCase() === 'custom') {
      toast.info("Please contact support to setup a custom plan.")
      return
    }

    setLoadingPlanId(plan.id)
    try {
      const res = await fetch("/api/platform-subscriptions/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan_id: plan.id }),
      })
      const json = await res.json()
      if (!json.status) throw new Error(json.message || "Purchase failed")

      if (json.data.free_plan) {
        toast.success("Free plan activated successfully!")
        mutateBilling()
        mutate("/api/subscription-status")
        setLoadingPlanId(null)
        return
      }

      const checkout = json.data.checkout as CheckoutData
      if (!checkout.key) throw new Error("Razorpay public key is missing")

      await loadRazorpayScript()

      const options: RazorpayOptions = {
        key: checkout.key,
        name: checkout.name,
        description: checkout.description,
        amount: checkout.amount,
        currency: "INR",
        ...(checkout.type === "subscription" 
          ? { subscription_id: checkout.subscription_id } 
          : { order_id: checkout.order_id }),
        handler: async (response) => {
          setLoadingPlanId(plan.id)
          try {
            const verifyRes = await fetch("/api/platform-subscriptions/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                payment_id: checkout.payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_subscription_id: response.razorpay_subscription_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            })
            const verifyJson = await verifyRes.json()
            if (!verifyJson.status) {
              throw new Error(verifyJson.message || "Payment verification failed")
            }

            toast.success("Subscription updated successfully!")
            mutateBilling()
            mutate("/api/subscription-status")
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Verification failed")
          } finally {
            setLoadingPlanId(null)
          }
        },
        modal: {
          ondismiss: async () => {
            setLoadingPlanId(null)
            try {
              await fetch("/api/platform-subscriptions/cancel", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ payment_id: checkout.payment_id }),
              })
            } catch (e) {
              console.error(e)
            }
          },
        },
      }

      const Razorpay = (window as WindowWithRazorpay).Razorpay
      if (!Razorpay) throw new Error("Razorpay failed to load")

      const rzp = new Razorpay(options)
      rzp.on('payment.failed', async function (response) {
        try {
          await fetch("/api/platform-subscriptions/failed", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
              payment_id: checkout.payment_id,
              error_description: response.error?.description || "Payment failed"
            }),
          })
        } catch (e) {
          console.error(e)
        }
      })
      rzp.open()

    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Purchase failed")
      setLoadingPlanId(null)
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
                  <div>
                    {currentPlan.compare_at_amount_inr ? (
                      <div className="mb-1 flex items-center gap-2">
                        <span className="text-sm font-semibold text-white/50 line-through">
                          ₹{currentPlan.compare_at_amount_inr}
                        </span>
                        {currentPlan.discount_percentage ? (
                          <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                            {currentPlan.discount_percentage}% off
                          </span>
                        ) : null}
                      </div>
                    ) : null}
                    <span className="text-4xl font-bold">₹{currentPlan.amount_inr}</span>
                  </div>
                  {!isFreeTierPlan(currentPlan) && currentPlan.gst_percentage ? (
                    <span className="text-white/70 text-sm mb-1">+ {currentPlan.gst_percentage}% GST</span>
                  ) : null}
                  {isFreeTierPlan(currentPlan) ? (
                    <span className="text-white/60 text-sm mb-1">First Month</span>
                  ) : currentPlan.billing_period ? (
                    <span className="text-white/60 text-sm mb-1">{currentPlan.billing_period}</span>
                  ) : null}
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
                  {currentPlan.features.map((f: string) => (
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
                <p className="text-sm text-slate-500 mt-0.5">You are on the free tier. Upgrade to unlock premium features.</p>
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
        (() => {
          const filteredPlans = plans.filter(plan => !(currentPlan && plan.amount_inr === 0))
          if (filteredPlans.length === 0) return null
          
          return (
            <section id="plans" className={filteredPlans.length === 2 ? "max-w-2xl mx-auto mt-12" : "mt-12"}>
              <h2 className={`text-sm font-semibold uppercase tracking-widest text-slate-400 mb-4 px-1 ${filteredPlans.length === 2 ? "text-center" : ""}`}>
                {currentPlan ? "Available Plans" : "Choose a Plan"}
              </h2>
              <div className={`grid gap-4 sm:grid-cols-2 ${filteredPlans.length >= 3 ? 'lg:grid-cols-3' : ''}`}>
                {filteredPlans.map(plan => {
              const isCurrent = currentPlan?.id === plan.id
              const isFeatured = plan.is_featured
              const isFreeTier = isFreeTierPlan(plan)
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
                  {plan.compare_at_amount_inr || plan.discount_percentage ? (
                    <div className="mb-1.5 flex min-h-5 items-center gap-2">
                      {plan.compare_at_amount_inr ? (
                        <span className={`text-sm font-semibold line-through ${isFeatured ? "text-white/45" : "text-slate-400"}`}>
                          ₹{plan.compare_at_amount_inr}
                        </span>
                      ) : null}
                      {plan.discount_percentage ? (
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          isFeatured ? "bg-white/20 text-white" : "bg-emerald-50 text-emerald-700"
                        }`}>
                          {plan.discount_percentage}% off
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                  <div className="mb-3 flex flex-wrap items-end gap-1">
                    <span className={`text-3xl font-bold leading-none ${isFeatured ? "text-white" : "text-slate-900"}`}>
                      ₹{plan.amount_inr}
                    </span>
                    {!isFreeTier && plan.gst_percentage ? (
                      <span className={`text-xs mb-0.5 ${isFeatured ? "text-white/70" : "text-slate-500"}`}>
                        + {plan.gst_percentage}% GST
                      </span>
                    ) : null}
                    {isFreeTier ? (
                      <span className={`text-xs mb-0.5 ${isFeatured ? "text-white/60" : "text-slate-400"}`}>First Month</span>
                    ) : plan.billing_period ? (
                      <span className={`text-xs mb-0.5 ${isFeatured ? "text-white/60" : "text-slate-400"}`}>{plan.billing_period}</span>
                    ) : null}
                  </div>
                  <p className={`text-xs leading-5 mb-4 ${isFeatured ? "text-white/70" : "text-slate-500"}`}>{plan.description}</p>
                  <div className="flex-1 space-y-2 mb-5">
                    {plan.features.map((f: string) => (
                      <div key={f} className={`flex items-start gap-2 text-xs ${isFeatured ? "text-white/85" : "text-slate-600"}`}>
                        <CheckCircle2 className={`size-3.5 shrink-0 mt-0.5 ${isFeatured ? "text-white/70" : "text-[#7c3aed]"}`} />
                        {f}
                      </div>
                    ))}
                  </div>
                  <button
                    disabled={isCurrent || loadingPlanId === plan.id}
                    onClick={() => handlePurchase(plan)}
                    className={`w-full h-10 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                      isCurrent
                        ? "bg-emerald-50 text-emerald-700 cursor-not-allowed"
                        : isFeatured
                          ? "bg-white text-[#7c3aed] hover:bg-[#f3e8ff]"
                          : "bg-[#7c3aed] text-white hover:bg-[#6d28d9] shadow-md shadow-purple-600/20"
                    }`}
                  >
                    {isCurrent ? (
                      <><ShieldCheck className="size-3.5" /> Current Plan</>
                    ) : loadingPlanId === plan.id ? (
                      <><Loader2 className="size-3.5 animate-spin" /> Processing...</>
                    ) : (
                      <><Crown className="size-3.5" /> Get Started</>
                    )}
                  </button>
                </div>
              )
                })}
              </div>
            </section>
          )
        })()
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
