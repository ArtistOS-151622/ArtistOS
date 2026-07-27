"use client"

import { useState } from "react"
import { HardDrive, Loader2 } from "lucide-react"

import { AppModal } from "@/components/common/shared/app-modal"
import { Button } from "@/components/ui/button"
import type { StoragePlanRow } from "@/lib/portfolio/types"

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { 
      open: () => void
      on: (event: string, callback: (response: any) => void) => void
    }
  }
}

type RazorpayCheckoutResponse = {
  razorpay_order_id?: string
  razorpay_subscription_id?: string
  razorpay_payment_id?: string
  razorpay_signature?: string
}

type StoragePlansModalProps = {
  open: boolean
  onClose: () => void
  plans: StoragePlanRow[]
  gstRate?: number
  onSuccess?: () => void
}

export function StoragePlansModal({
  open,
  onClose,
  plans,
  gstRate = 0.18,
  onSuccess,
}: StoragePlansModalProps) {
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null)
  const quantity = 1
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const effectiveSelectedPlanId = selectedPlanId ?? plans[0]?.id ?? null
  const selectedPlan = plans.find((p) => p.id === effectiveSelectedPlanId)
  const baseAmount = selectedPlan ? Number(selectedPlan.price_inr) * quantity : 0
  const gstAmount = Math.round(baseAmount * gstRate * 100) / 100
  const totalAmount = Math.round((baseAmount + gstAmount) * 100) / 100

  async function loadRazorpayScript() {
    if (window.Razorpay) return
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement("script")
      script.src = "https://checkout.razorpay.com/v1/checkout.js"
      script.onload = () => resolve()
      script.onerror = () => reject(new Error("Failed to load Razorpay"))
      document.body.appendChild(script)
    })
  }

  async function handlePurchase() {
    if (!effectiveSelectedPlanId) return
    setLoading(true)
    setError("")

    try {
      const res = await fetch("/api/portfolio/purchase-storage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan_id: effectiveSelectedPlanId, quantity }),
      })
      const json = await res.json()
      if (!json.status) throw new Error(json.message || "Purchase failed")

      if (json.data.demo_mode || !json.data.checkout) {
        onSuccess?.()
        onClose()
        return
      }

      await loadRazorpayScript()
      const checkout = json.data.checkout

      const options: Record<string, unknown> = {
        key: checkout.key,
        name: checkout.name,
        description: checkout.description,
        amount: checkout.amount,
        currency: "INR",
        handler: async (response: RazorpayCheckoutResponse) => {
          setLoading(true)
          setError("")

          try {
            const verifyRes = await fetch("/api/portfolio/purchase-storage/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                purchase_id: checkout.purchase_id,
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

            onSuccess?.()
            onClose()
          } catch (err) {
            setError(err instanceof Error ? err.message : "Payment verification failed")
          } finally {
            setLoading(false)
          }
        },
        modal: {
          ondismiss: async () => {
            setLoading(false)
            try {
              // Physically delete the pending record if user closes the modal
              await fetch("/api/portfolio/purchase-storage/cancel", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ purchase_id: checkout.purchase_id }),
              })
            } catch (e) {
              console.error("Failed to cancel purchase", e)
            }
          },
        },
      }

      if (checkout.type === "subscription") {
        options.subscription_id = checkout.subscription_id
      } else {
        options.order_id = checkout.order_id
      }

      const rzp = new window.Razorpay!(options)
      
      rzp.on('payment.failed', async function (response: any) {
        try {
          // Update status to 'failed' if the payment is rejected by bank
          await fetch("/api/portfolio/purchase-storage/failed", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
              purchase_id: checkout.purchase_id,
              error_description: response.error?.description || "Payment failed"
            }),
          })
        } catch (e) {
          console.error("Failed to log payment failure", e)
        }
      })

      rzp.open()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Purchase failed")
    } finally {
      // Don't set loading false here, let ondismiss or success handle it
      // otherwise it flickers off while modal is open
    }
  }

  return (
    <AppModal
      open={open}
      icon={<HardDrive className="size-5" />}
      onClose={onClose}
      title="Upgrade Storage"
      description={`Choose a one-time storage plan. GST (${gstRate * 100}%) applies.`}
      footer={
        <Button
          className="w-full h-11 rounded-2xl bg-[#7c3aed] hover:bg-[#6d28d9] text-white shadow-md shadow-purple-950/10"
          disabled={loading || !effectiveSelectedPlanId}
          onClick={handlePurchase}
        >
          {loading ? <Loader2 className="size-4 animate-spin" /> : "Continue to Payment"}
        </Button>
      }
    >
      <div className="space-y-4">
        {error && (
          <div className="rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="grid gap-2">
          {plans.map((plan) => (
            <button
              key={plan.id}
              type="button"
              onClick={() => setSelectedPlanId(plan.id)}
              className={`rounded-2xl border p-4 text-left transition-all ${
                effectiveSelectedPlanId === plan.id
                  ? "border-[#7c3aed] bg-purple-50/50"
                  : "border-slate-100 hover:border-purple-200"
              }`}
            >
              <div className="font-semibold text-slate-800">{plan.name.replace(' / month', '')}</div>
              <div className="text-sm text-slate-500">₹{plan.price_inr} + GST</div>
            </button>
          ))}
        </div>

        <div className="rounded-2xl border border-slate-100 p-4 text-sm space-y-1">
          <div className="flex justify-between"><span>Base</span><span>₹{baseAmount.toFixed(2)}</span></div>
          <div className="flex justify-between"><span>GST ({gstRate * 100}%)</span><span>₹{gstAmount.toFixed(2)}</span></div>
          <div className="flex justify-between font-semibold pt-2 border-t border-slate-100"><span>Total</span><span>₹{totalAmount.toFixed(2)}</span></div>
        </div>
      </div>
    </AppModal>
  )
}
