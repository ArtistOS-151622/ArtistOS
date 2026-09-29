"use client"

import { useState } from "react"
import {
  CreditCard,
  GraduationCap,
  Mail,
  MapPin,
  User,
} from "lucide-react"

import type {
  Course,
  CourseStudent,
  StudentFormValues,
} from "@/components/common/courses/course-types"
import { Button } from "@/components/ui/button"
import { DatePicker } from "@/components/common/shared/date-picker"
import { FloatingDropdown } from "@/components/common/shared/floating-dropdown"
import {
  FloatingInput,
  FloatingPhoneInput,
  FloatingTextarea,
} from "@/components/common/shared/floating-input"
import {
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu"

type StudentFormProps = {
  initialData?: CourseStudent | null
  courses: Course[]
  preselectedCourseId?: number | null
  onSubmit: (values: StudentFormValues) => Promise<void>
  onCancel: () => void
  loading: boolean
}

export function StudentForm({
  initialData,
  courses,
  preselectedCourseId,
  onSubmit,
  onCancel,
  loading,
}: StudentFormProps) {
  const [courseId, setCourseId] = useState<string>(() => {
    if (initialData?.course_id) return String(initialData.course_id)
    if (preselectedCourseId) return String(preselectedCourseId)
    if (courses.length > 0) return String(courses[0].id)
    return ""
  })

  const [name, setName] = useState(initialData?.name || "")
  const [phone, setPhone] = useState(initialData?.phone || "")
  const [address, setAddress] = useState(initialData?.address || "")
  const [email, setEmail] = useState(initialData?.email || "")
  const [totalFee, setTotalFee] = useState<string>(() => {
    if (initialData?.total_fee !== undefined) return String(initialData.total_fee)
    const selectedCourse = courses.find((c) => String(c.id) === (preselectedCourseId ? String(preselectedCourseId) : String(courses[0]?.id)))
    return selectedCourse ? String(selectedCourse.fee) : ""
  })
  const [paidFee, setPaidFee] = useState(
    initialData?.paid_fee !== undefined ? String(initialData.paid_fee) : "0"
  )
  const [enrollmentDate, setEnrollmentDate] = useState(
    initialData?.enrollment_date || new Date().toISOString().split("T")[0]
  )
  const [status, setStatus] = useState<"enrolled" | "ongoing" | "completed" | "cancelled">(
    initialData?.status || "enrolled"
  )
  const [certificateIssued, setCertificateIssued] = useState(
    initialData?.certificate_issued || false
  )
  const [notes, setNotes] = useState(initialData?.notes || "")
  const [errors, setErrors] = useState<Record<string, string>>({})

  // When changing course on a new student form, auto-fill fee from course
  const handleCourseChange = (newCourseId: string) => {
    setCourseId(newCourseId)
    if (!initialData) {
      const selected = courses.find((c) => String(c.id) === newCourseId)
      if (selected) {
        setTotalFee(String(selected.fee))
      }
    }
  }

  const selectedCourseObj = courses.find((c) => String(c.id) === courseId)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const newErrors: Record<string, string> = {}

    if (!courseId) newErrors.course_id = "Please select a course."
    if (!name.trim()) newErrors.name = "Student name is required."
    if (!phone.trim()) newErrors.phone = "Phone number is required."
    if (phone.replace(/\D/g, "").length < 10) newErrors.phone = "Please enter a valid 10-digit phone number."
    if (!address.trim()) newErrors.address = "Address is required."

    const numTotal = Number(totalFee)
    const numPaid = Number(paidFee)

    if (isNaN(numTotal) || numTotal < 0) {
      newErrors.total_fee = "Total fee must be a valid amount."
    }
    if (isNaN(numPaid) || numPaid < 0) {
      newErrors.paid_fee = "Paid fee must be a valid amount."
    }
    if (numPaid > numTotal) {
      newErrors.paid_fee = "Paid fee cannot exceed total fee."
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    try {
      await onSubmit({
        course_id: courseId,
        name: name.trim(),
        phone: phone.trim(),
        address: address.trim(),
        email: email.trim(),
        total_fee: totalFee.trim(),
        paid_fee: paidFee.trim(),
        enrollment_date: enrollmentDate,
        status,
        certificate_issued: certificateIssued,
        notes: notes.trim(),
      })
    } catch (err: any) {
      setErrors({ form: err?.message || "Failed to save student." })
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-1">
      {errors.form && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
          {errors.form}
        </div>
      )}

      {/* Course Selection via FloatingDropdown */}
      <FloatingDropdown
        label="Selected Course *"
        value={selectedCourseObj ? `${selectedCourseObj.name} (₹${selectedCourseObj.fee.toLocaleString("en-IN")})` : ""}
        hasValue={Boolean(selectedCourseObj)}
        icon={<GraduationCap className="size-4" />}
        error={errors.course_id}
        disabled={loading}
      >
        <DropdownMenuRadioGroup value={courseId} onValueChange={handleCourseChange}>
          {courses.map((c) => (
            <DropdownMenuRadioItem
              key={c.id}
              value={String(c.id)}
              closeOnClick={true}
              className="h-10 rounded-xl px-3 text-sm cursor-pointer"
            >
              {c.name} — ₹{c.fee.toLocaleString("en-IN")} ({c.duration})
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </FloatingDropdown>

      {/* Student Name */}
      <FloatingInput
        id="student_name"
        label="Student Name"
        icon={<User className="size-4" />}
        value={name}
        onChange={(e) => {
          setName(e.target.value)
          if (errors.name) setErrors((prev) => ({ ...prev, name: "" }))
        }}
        error={errors.name}
        disabled={loading}
        required
      />

      {/* Phone & Email */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FloatingPhoneInput
          id="student_phone"
          label="Phone Number"
          value={phone}
          onChange={(e) => {
            setPhone(e.target.value)
            if (errors.phone) setErrors((prev) => ({ ...prev, phone: "" }))
          }}
          error={errors.phone}
          disabled={loading}
        />

        <FloatingInput
          id="student_email"
          label="Email (Optional)"
          icon={<Mail className="size-4" />}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
        />
      </div>

      {/* Address */}
      <FloatingInput
        id="student_address"
        label="Address / City"
        icon={<MapPin className="size-4" />}
        value={address}
        onChange={(e) => {
          setAddress(e.target.value)
          if (errors.address) setErrors((prev) => ({ ...prev, address: "" }))
        }}
        error={errors.address}
        disabled={loading}
        required
      />

      {/* Total Fee & Paid Fee */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FloatingInput
          id="total_fee"
          label="Total Course Fee (₹)"
          icon={<CreditCard className="size-4" />}
          type="number"
          min="0"
          value={totalFee}
          onChange={(e) => {
            setTotalFee(e.target.value)
            if (errors.total_fee) setErrors((prev) => ({ ...prev, total_fee: "" }))
          }}
          error={errors.total_fee}
          disabled={loading}
          required
        />

        <FloatingInput
          id="paid_fee"
          label="Amount Paid at Admission (₹)"
          icon={<CreditCard className="size-4" />}
          type="number"
          min="0"
          value={paidFee}
          onChange={(e) => {
            setPaidFee(e.target.value)
            if (errors.paid_fee) setErrors((prev) => ({ ...prev, paid_fee: "" }))
          }}
          error={errors.paid_fee}
          disabled={loading}
        />
      </div>

      {/* Due preview */}
      {Number(totalFee) > 0 && (
        <div className="rounded-xl border border-slate-100 bg-slate-50 p-2.5 flex items-center justify-between text-xs">
          <span className="text-slate-500 font-medium">Remaining Balance Due:</span>
          <span className="font-extrabold text-slate-900">
            ₹{Math.max(0, Number(totalFee) - Number(paidFee || 0)).toLocaleString("en-IN")}
          </span>
        </div>
      )}

      {/* Enrollment Date & Status */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <DatePicker
          label="Enrollment Date"
          value={enrollmentDate}
          onChange={(val) => setEnrollmentDate(val)}
          placeholder="Select enrollment date..."
          disabled={loading}
        />

        <FloatingDropdown
          label="Student Status"
          value={
            status === "completed"
              ? "Completed 🎓"
              : status === "ongoing"
              ? "Ongoing"
              : status === "cancelled"
              ? "Cancelled"
              : "Enrolled"
          }
          hasValue={true}
          disabled={loading}
        >
          <DropdownMenuRadioGroup
            value={status}
            onValueChange={(val) => setStatus(val as any)}
          >
            <DropdownMenuRadioItem
              value="enrolled"
              closeOnClick={true}
              className="h-10 rounded-xl px-3 text-sm cursor-pointer"
            >
              Enrolled
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem
              value="ongoing"
              closeOnClick={true}
              className="h-10 rounded-xl px-3 text-sm cursor-pointer"
            >
              Ongoing
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem
              value="completed"
              closeOnClick={true}
              className="h-10 rounded-xl px-3 text-sm cursor-pointer"
            >
              Completed 🎓
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem
              value="cancelled"
              closeOnClick={true}
              className="h-10 rounded-xl px-3 text-sm cursor-pointer"
            >
              Cancelled
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </FloatingDropdown>
      </div>

      {/* Certificate Checkbox */}
      <div className="flex items-center space-x-2.5 pt-1">
        <input
          type="checkbox"
          id="certificate"
          checked={certificateIssued}
          onChange={(e) => setCertificateIssued(e.target.checked)}
          className="size-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
        />
        <label
          htmlFor="certificate"
          className="text-xs font-semibold text-slate-700 cursor-pointer select-none"
        >
          Completion Certificate Issued 🎓
        </label>
      </div>

      {/* Internal Notes */}
      <FloatingTextarea
        id="student_notes"
        label="Notes / Remarks (Optional)"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={2}
        disabled={loading}
      />

      {/* Actions */}
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
          disabled={loading}
          className="rounded-xl bg-[#7c3aed] hover:bg-[#6d28d9] text-white shadow-md shadow-purple-950/10 min-w-32 font-bold"
        >
          {loading ? "Saving..." : initialData ? "Update Student" : "Enroll Student"}
        </Button>
      </div>
    </form>
  )
}
