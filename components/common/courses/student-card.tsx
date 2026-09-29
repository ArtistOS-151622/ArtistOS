"use client"

import {
  CreditCard,
  Edit3,
  GraduationCap,
  Mail,
  MapPin,
  MessageCircle,
  MoreVertical,
  Phone,
  PhoneCall,
  Receipt,
  Trash2,
} from "lucide-react"

import type { CourseStudent } from "@/components/common/courses/course-types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Progress } from "@/components/ui/progress"

type StudentCardProps = {
  student: CourseStudent
  studioName?: string
  onEdit: (student: CourseStudent) => void
  onDelete: (student: CourseStudent) => void
  onAddPayment: (student: CourseStudent) => void
}

export function StudentCard({
  student,
  studioName = "Our Academy",
  onEdit,
  onDelete,
  onAddPayment,
}: StudentCardProps) {
  const initials =
    student.name
      .split(" ")
      .map((p) => p[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "ST"

  const cleanPhone = student.phone.replace(/[^0-9]/g, "")
  const paidPercent =
    student.total_fee > 0
      ? Math.min(100, Math.round((student.paid_fee / student.total_fee) * 100))
      : 100

  // WhatsApp Admission Message Generator
  const sendWhatsAppReceipt = () => {
    const dueText =
      student.pending_fee > 0
        ? `⏳ *Pending Balance Due:* ₹${student.pending_fee.toLocaleString("en-IN")}`
        : `✅ *Fee Status:* Fully Paid`

    const message = `🎓 *ADMISSION CONFIRMATION & FEE RECEIPT*

Dear *${student.name}*,
Your admission for *${student.course?.name || "Professional Course"}* at *${studioName}* is confirmed!

━━━━━━━━━━━━━━━━━━━
🗓 *Duration:* ${student.course?.duration || "N/A"}
⏰ *Timing:* ${student.course?.batch_timing || "Regular Batch"}
💰 *Total Course Fee:* ₹${student.total_fee.toLocaleString("en-IN")}
💳 *Fee Paid:* ₹${student.paid_fee.toLocaleString("en-IN")}
${dueText}
━━━━━━━━━━━━━━━━━━━
📍 *Location:* ${student.address || "Studio"}

We are excited to have you in class! See you soon. ✨`

    const url = `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(message)}`
    window.open(url, "_blank")
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs sm:text-sm px-2 sm:px-2.5 py-0.5 font-semibold">Completed 🎓</Badge>
      case "ongoing":
        return <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-xs sm:text-sm px-2 sm:px-2.5 py-0.5 font-semibold">Ongoing</Badge>
      case "cancelled":
        return <Badge className="bg-rose-100 text-rose-700 border-rose-200 text-xs sm:text-sm px-2 sm:px-2.5 py-0.5 font-semibold">Cancelled</Badge>
      default:
        return <Badge className="bg-purple-100 text-purple-700 border-purple-200 text-xs sm:text-sm px-2 sm:px-2.5 py-0.5 font-semibold">Enrolled</Badge>
    }
  }

  return (
    <Card className="group relative overflow-hidden min-w-0 w-full rounded-2xl sm:rounded-3xl border-slate-100 bg-white shadow-md shadow-purple-950/5 transition duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-purple-950/10 flex flex-col justify-between">
      <CardContent className="relative z-10 p-3.5 sm:p-5 flex flex-col h-full justify-between gap-3.5 sm:gap-4.5 min-w-0 overflow-hidden">
        {/* Top: Avatar + Name + Course + Menu */}
        <div className="min-w-0">
          <div className="flex items-start justify-between gap-1.5 sm:gap-2.5 min-w-0">
            <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0 flex-1">
              <div className="flex size-10 sm:size-13 shrink-0 items-center justify-center rounded-xl sm:rounded-2xl bg-purple-100 text-[#7c3aed] border border-[#7c3aed]/20 font-bold text-sm sm:text-lg shadow-sm">
                {initials}
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                  <h3 className="truncate text-sm sm:text-lg font-bold text-slate-900 leading-snug">
                    {student.name}
                  </h3>
                  {getStatusBadge(student.status)}
                </div>
                <p className="text-xs sm:text-sm font-semibold text-[#7c3aed] truncate flex items-center gap-1 sm:gap-1.5 mt-0.5">
                  <GraduationCap className="size-3.5 sm:size-4 shrink-0" />
                  <span className="truncate">{student.course?.name || "Course"}</span>
                </p>
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger className="inline-flex size-7 sm:size-8 items-center justify-center rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition outline-none shrink-0">
                <MoreVertical className="size-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={sendWhatsAppReceipt} className="cursor-pointer">
                  <MessageCircle className="size-4 mr-2 text-emerald-600" /> Send WhatsApp Slip
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onAddPayment(student)} className="cursor-pointer">
                  <CreditCard className="size-4 mr-2 text-blue-600" /> Add Payment
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onEdit(student)} className="cursor-pointer">
                  <Edit3 className="size-4 mr-2 text-slate-600" /> Edit Student
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onDelete(student)} className="text-rose-600 focus:text-rose-600 cursor-pointer">
                  <Trash2 className="size-4 mr-2" /> Delete Record
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Contact Details */}
          <div className="mt-3.5 sm:mt-4 space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-slate-600">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 sm:gap-2 font-medium">
                <Phone className="size-3.5 sm:size-4 text-slate-400 shrink-0" />
                +91 {student.phone}
              </span>
              <div className="flex items-center gap-1">
                <a
                  href={`tel:${student.phone}`}
                  className="p-1 sm:p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition"
                  title="Call Student"
                >
                  <PhoneCall className="size-3.5 sm:size-4" />
                </a>
                <button
                  type="button"
                  onClick={sendWhatsAppReceipt}
                  className="p-1 sm:p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-600 transition"
                  title="WhatsApp Admission Slip"
                >
                  <MessageCircle className="size-3.5 sm:size-4" />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 text-slate-500 truncate">
              <MapPin className="size-3.5 sm:size-4 shrink-0 text-slate-400" />
              <span className="truncate">{student.address}</span>
            </div>

            {student.email && (
              <div className="flex items-center gap-1.5 sm:gap-2 text-slate-500 truncate">
                <Mail className="size-3.5 sm:size-4 shrink-0 text-slate-400" />
                <span className="truncate">{student.email}</span>
              </div>
            )}
          </div>
        </div>

        {/* Financial Breakdown Card */}
        <div className="rounded-xl sm:rounded-2xl border border-slate-100 bg-slate-50/80 p-3 sm:p-4 flex flex-col gap-2 sm:gap-2.5">
          <div className="flex items-center justify-between text-xs sm:text-sm">
            <span className="text-slate-500 font-medium">Fee Status</span>
            {student.payment_status === "full_paid" ? (
              <span className="font-bold text-emerald-700 bg-emerald-100/80 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md sm:rounded-lg text-[11px] sm:text-xs">
                Full Paid
              </span>
            ) : student.payment_status === "partial" ? (
              <span className="font-bold text-amber-700 bg-amber-100/80 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md sm:rounded-lg text-[11px] sm:text-xs">
                ₹{student.pending_fee.toLocaleString("en-IN")} Due
              </span>
            ) : (
              <span className="font-bold text-rose-700 bg-rose-100/80 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md sm:rounded-lg text-[11px] sm:text-xs">
                Unpaid (₹{student.total_fee.toLocaleString("en-IN")})
              </span>
            )}
          </div>

          {/* Progress Bar */}
          <Progress
            value={paidPercent}
            className={`h-1.5 sm:h-2 ${
              student.payment_status === "full_paid"
                ? "bg-slate-200 text-emerald-500"
                : student.payment_status === "partial"
                ? "bg-slate-200 text-amber-500"
                : "bg-slate-200 text-rose-500"
            }`}
          />

          <div className="flex items-center justify-between text-[11px] sm:text-xs text-slate-500 font-medium">
            <span>Paid: <strong className="text-slate-800 text-xs sm:text-sm">₹{student.paid_fee.toLocaleString("en-IN")}</strong></span>
            <span>Total: <strong className="text-slate-800 text-xs sm:text-sm">₹{student.total_fee.toLocaleString("en-IN")}</strong></span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2 sm:gap-2.5">
          {student.pending_fee > 0 ? (
            <Button
              variant="outline"
              onClick={() => onAddPayment(student)}
              className="w-full h-9 sm:h-11 text-xs sm:text-sm font-semibold sm:font-bold rounded-xl sm:rounded-2xl border-amber-300 bg-amber-50/50 hover:bg-amber-100 hover:text-amber-900 text-amber-800 transition-all shadow-xs"
            >
              + Log Payment
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={() => onEdit(student)}
              className="w-full h-9 sm:h-11 text-xs sm:text-sm font-semibold sm:font-bold rounded-xl sm:rounded-2xl border-slate-200 hover:bg-slate-50 text-slate-700 transition-all shadow-xs"
            >
              Edit Details
            </Button>
          )}

          <Button
            onClick={sendWhatsAppReceipt}
            className="w-full h-9 sm:h-11 text-xs sm:text-sm font-semibold sm:font-bold rounded-xl sm:rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-950/10 flex items-center justify-center gap-1.5 transition-all"
          >
            <MessageCircle className="size-3.5 sm:size-4" />
            WhatsApp Slip
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
