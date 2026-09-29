"use client"

import { useState } from "react"
import { DollarSign } from "lucide-react"

import type { CourseStudent } from "@/components/common/courses/course-types"
import { Button } from "@/components/ui/button"
import { FloatingInput } from "@/components/common/shared/floating-input"

type StudentPaymentModalProps = {
  student: CourseStudent
  onSavePayment: (studentId: number, amount: number) => Promise<void>
  onCancel: () => void
  loading: boolean
}

export function StudentPaymentModal({
  student,
  onSavePayment,
  onCancel,
  loading,
}: StudentPaymentModalProps) {
  const [amount, setAmount] = useState("")
  const [error, setError] = useState("")

  const numAmount = Number(amount) || 0
  const currentPending = student.pending_fee || Math.max(0, student.total_fee - student.paid_fee)
  const newPaid = student.paid_fee + numAmount
  const newPending = Math.max(0, student.total_fee - newPaid)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!amount || numAmount <= 0) {
      setError("Please enter a valid installment payment amount.")
      return
    }

    if (numAmount > currentPending) {
      setError(`Payment amount cannot exceed pending due of ₹${currentPending.toLocaleString("en-IN")}.`)
      return
    }

    try {
      await onSavePayment(student.id, numAmount)
    } catch (err: any) {
      setError(err?.message || "Failed to record payment.")
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-1">
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
          {error}
        </div>
      )}

      {/* Summary Box */}
      <div className="rounded-2xl border border-purple-100 bg-purple-50/50 p-4 space-y-2 text-xs">
        <div className="flex justify-between items-center">
          <span className="text-slate-600 font-medium">Student:</span>
          <span className="font-bold text-slate-900">{student.name}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-slate-600 font-medium">Course:</span>
          <span className="font-semibold text-purple-700">{student.course?.name || "Course"}</span>
        </div>
        <div className="border-t border-purple-200/60 pt-2 flex justify-between items-center">
          <span className="text-slate-600 font-medium">Total Course Fee:</span>
          <span className="font-bold text-slate-900">₹{student.total_fee.toLocaleString("en-IN")}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-slate-600 font-medium">Already Paid:</span>
          <span className="font-bold text-emerald-700">₹{student.paid_fee.toLocaleString("en-IN")}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-slate-600 font-medium">Current Balance Due:</span>
          <span className="font-extrabold text-amber-700 text-sm">
            ₹{currentPending.toLocaleString("en-IN")}
          </span>
        </div>
      </div>

      {/* Amount Input with FloatingInput */}
      <FloatingInput
        id="installment_amount"
        label="Installment Amount Paid Now (₹)"
        icon={<DollarSign className="size-4" />}
        type="number"
        min="1"
        max={currentPending}
        value={amount}
        onChange={(e) => {
          setAmount(e.target.value)
          if (error) setError("")
        }}
        disabled={loading}
        required
        autoFocus
      />

      {/* Quick Fill Buttons */}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setAmount(String(currentPending))}
          className="text-xs h-8 rounded-xl border-purple-200 text-purple-700 hover:bg-purple-50 font-semibold"
        >
          Pay Full Balance (₹{currentPending.toLocaleString("en-IN")})
        </Button>
        {currentPending >= 2000 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setAmount(String(Math.round(currentPending / 2)))}
            className="text-xs h-8 rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold"
          >
            Half (₹{Math.round(currentPending / 2).toLocaleString("en-IN")})
          </Button>
        )}
      </div>

      {/* Live Preview */}
      {numAmount > 0 && numAmount <= currentPending && (
        <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 space-y-1 text-xs">
          <div className="flex justify-between text-slate-600">
            <span>New Total Paid:</span>
            <span className="font-bold text-emerald-700">₹{newPaid.toLocaleString("en-IN")}</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Remaining Due After This:</span>
            <span className={`font-bold ${newPending === 0 ? "text-emerald-700" : "text-amber-700"}`}>
              {newPending === 0 ? "Fully Paid! 🎉" : `₹${newPending.toLocaleString("en-IN")}`}
            </span>
          </div>
        </div>
      )}

      {/* Modal Actions */}
      <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={loading}
          className="rounded-xl border-slate-200 text-slate-700"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={loading || !numAmount || numAmount > currentPending}
          className="rounded-xl bg-[#7c3aed] hover:bg-[#6d28d9] text-white shadow-md shadow-purple-950/10 min-w-32 font-bold"
        >
          {loading ? "Recording..." : "Record Payment"}
        </Button>
      </div>
    </form>
  )
}
