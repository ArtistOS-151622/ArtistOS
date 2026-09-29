"use client"

import {
  Clock,
  CreditCard,
  Edit3,
  Flower2,
  GraduationCap,
  MessageCircle,
  Plus,
  Trash2,
  Users,
} from "lucide-react"

import type {
  Course,
  CourseStudent,
} from "@/components/common/courses/course-types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { AppModal } from "@/components/common/shared/app-modal"

type CourseDetailDrawerProps = {
  course: Course | null
  students: CourseStudent[]
  open: boolean
  onClose: () => void
  onAddStudent: (course: Course) => void
  onEditStudent: (student: CourseStudent) => void
  onAddPayment: (student: CourseStudent) => void
  onDeleteStudent: (student: CourseStudent) => void
  studioName?: string
}

export function CourseDetailDrawer({
  course,
  students,
  open,
  onClose,
  onAddStudent,
  onEditStudent,
  onAddPayment,
  onDeleteStudent,
  studioName = "Our Academy",
}: CourseDetailDrawerProps) {
  if (!course || !open) return null

  const courseStudents = students.filter((s) => s.course_id === course.id)
  const totalCollected = courseStudents.reduce((sum, s) => sum + (Number(s.paid_fee) || 0), 0)
  const totalExpected = courseStudents.reduce((sum, s) => sum + (Number(s.total_fee) || 0), 0)
  const totalDue = Math.max(0, totalExpected - totalCollected)

  const maxSeats = course.max_students || null
  const seatPercent = maxSeats ? Math.min(100, Math.round((courseStudents.length / maxSeats) * 100)) : null

  const sendWhatsAppSlip = (student: CourseStudent) => {
    const cleanPhone = student.phone.replace(/[^0-9]/g, "")
    const dueText =
      student.pending_fee > 0
        ? `⏳ *Pending Balance Due:* ₹${student.pending_fee.toLocaleString("en-IN")}`
        : `✅ *Fee Status:* Fully Paid`

    const message = `🎓 *ADMISSION CONFIRMATION & FEE RECEIPT*

Dear *${student.name}*,
Your admission for *${course.name}* at *${studioName}* is confirmed!

━━━━━━━━━━━━━━━━━━━
🗓 *Duration:* ${course.duration}
⏰ *Timing:* ${course.batch_timing || "Regular Batch"}
💰 *Total Course Fee:* ₹${student.total_fee.toLocaleString("en-IN")}
💳 *Fee Paid:* ₹${student.paid_fee.toLocaleString("en-IN")}
${dueText}
━━━━━━━━━━━━━━━━━━━
📍 *Location:* ${student.address || "Studio"}

We look forward to an amazing learning journey together! ✨`

    window.open(`https://wa.me/91${cleanPhone}?text=${encodeURIComponent(message)}`, "_blank")
  }

  return (
    <AppModal
      open={open}
      onClose={onClose}
      title={course.name}
      description={`${course.duration} ${course.batch_timing ? `• ${course.batch_timing}` : ""}`}
      maxWidth="max-w-2xl"
    >
      <div className="space-y-4">
        {/* Course Info Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3 text-center">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Course Fee</span>
            <span className="text-base font-extrabold text-slate-900">₹{course.fee.toLocaleString("en-IN")}</span>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3 text-center">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Fees Collected</span>
            <span className="text-base font-extrabold text-emerald-700">₹{totalCollected.toLocaleString("en-IN")}</span>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3 text-center col-span-2 sm:col-span-1">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Pending Due</span>
            <span className="text-base font-extrabold text-amber-700">₹{totalDue.toLocaleString("en-IN")}</span>
          </div>
        </div>

        {/* Seat Capacity Progress */}
        {maxSeats && (
          <div className="space-y-1.5 rounded-2xl border border-slate-100 bg-slate-50/50 p-3.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                <Users className="size-3.5 text-purple-600" />
                Batch Capacity
              </span>
              <span className="font-bold text-slate-800">
                {courseStudents.length} / {maxSeats} Seats Filled ({seatPercent}%)
              </span>
            </div>
            <Progress value={seatPercent || 0} className="h-2 bg-slate-200" />
          </div>
        )}

        {/* Syllabus / Description */}
        {course.description && (
          <div className="space-y-1.5">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Course Syllabus & Details</h4>
            <p className="text-xs text-slate-600 bg-slate-50/60 p-3.5 rounded-2xl border border-slate-100 leading-relaxed whitespace-pre-wrap">
              {course.description}
            </p>
          </div>
        )}

        {/* Services Taught */}
        {course.services && course.services.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Flower2 className="size-3.5 text-purple-600" /> Services Taught in this Course
            </h4>
            <div className="flex flex-wrap gap-2">
              {course.services.map((s) => (
                <span
                  key={s.id}
                  className="rounded-xl bg-purple-50 px-3 py-1 text-xs font-semibold text-purple-800 border border-purple-200/60"
                >
                  {s.service_name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Enrolled Students Section */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <GraduationCap className="size-4 text-[#7c3aed]" />
              Enrolled Students ({courseStudents.length})
            </h4>
            <Button
              size="sm"
              onClick={() => onAddStudent(course)}
              className="text-xs font-semibold rounded-xl bg-[#7c3aed] hover:bg-[#6d28d9] text-white shadow-sm h-8"
            >
              <Plus className="size-3.5 mr-1" /> Enroll Student
            </Button>
          </div>

          {courseStudents.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-500">
              No students enrolled in this course yet. Click "+ Enroll Student" above!
            </div>
          ) : (
            <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
              {courseStudents.map((st) => (
                <div
                  key={st.id}
                  className="rounded-2xl border border-slate-100 bg-white p-3.5 shadow-sm flex items-center justify-between gap-3 hover:border-purple-200 transition"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900 truncate">{st.name}</span>
                      {st.payment_status === "full_paid" ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700">
                          Paid
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-700">
                          ₹{st.pending_fee.toLocaleString("en-IN")} Due
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                      <span>{st.phone}</span>
                      <span>•</span>
                      <span>Paid: ₹{st.paid_fee.toLocaleString("en-IN")} / ₹{st.total_fee.toLocaleString("en-IN")}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {st.pending_fee > 0 && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onAddPayment(st)}
                        className="text-xs h-8 rounded-xl border-amber-200 text-amber-800 hover:bg-amber-50"
                      >
                        <CreditCard className="size-3.5 mr-1" /> + Pay
                      </Button>
                    )}
                    <button
                      type="button"
                      onClick={() => sendWhatsAppSlip(st)}
                      className="size-8 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 flex items-center justify-center transition"
                      title="WhatsApp Slip"
                    >
                      <MessageCircle className="size-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onEditStudent(st)}
                      className="size-8 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center transition"
                      title="Edit Student"
                    >
                      <Edit3 className="size-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteStudent(st)}
                      className="size-8 rounded-xl hover:bg-rose-50 text-slate-400 hover:text-rose-600 flex items-center justify-center transition"
                      title="Delete Student"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppModal>
  )
}
