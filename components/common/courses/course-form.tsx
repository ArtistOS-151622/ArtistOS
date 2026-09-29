"use client"

import { useState } from "react"
import {
  BookOpen,
  Calendar,
  Check,
  Clock,
  DollarSign,
  Flower2,
  Users,
} from "lucide-react"

import type {
  Course,
  CourseFormValues,
  CourseLearnedService,
} from "@/components/common/courses/course-types"
import { Button } from "@/components/ui/button"
import { DatePicker } from "@/components/common/shared/date-picker"
import {
  FloatingInput,
  FloatingTextarea,
} from "@/components/common/shared/floating-input"

type CourseFormProps = {
  initialData?: Course | null
  availableServices: CourseLearnedService[]
  onSubmit: (values: CourseFormValues) => Promise<void>
  onCancel: () => void
  loading: boolean
}

export function CourseForm({
  initialData,
  availableServices,
  onSubmit,
  onCancel,
  loading,
}: CourseFormProps) {
  const [name, setName] = useState(initialData?.name || "")
  const [duration, setDuration] = useState(initialData?.duration || "")
  const [fee, setFee] = useState(initialData ? String(initialData.fee) : "")
  const [description, setDescription] = useState(initialData?.description || "")
  const [batchTiming, setBatchTiming] = useState(initialData?.batch_timing || "")
  const [startDate, setStartDate] = useState(initialData?.start_date || "")
  const [maxStudents, setMaxStudents] = useState(
    initialData?.max_students ? String(initialData.max_students) : ""
  )
  const [selectedServiceIds, setSelectedServiceIds] = useState<number[]>(
    initialData?.services?.map((s) => s.id) || []
  )
  const [errors, setErrors] = useState<Record<string, string>>({})

  const toggleService = (id: number) => {
    setSelectedServiceIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const newErrors: Record<string, string> = {}

    if (!name.trim()) newErrors.name = "Course name is required."
    if (!duration.trim()) newErrors.duration = "Duration is required (e.g. 15 Days, 1 Month)."
    const numFee = Number(fee)
    if (!fee || isNaN(numFee) || numFee < 0) {
      newErrors.fee = "Please enter a valid fee amount."
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    try {
      await onSubmit({
        name: name.trim(),
        duration: duration.trim(),
        fee: fee.trim(),
        description: description.trim(),
        batch_timing: batchTiming.trim(),
        start_date: startDate || "",
        max_students: maxStudents.trim(),
        service_ids: selectedServiceIds,
      })
    } catch (err: any) {
      setErrors({ form: err?.message || "Failed to save course." })
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-1">
      {errors.form && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
          {errors.form}
        </div>
      )}

      {/* Course Name */}
      <FloatingInput
        id="course_name"
        label="Course Name"
        icon={<BookOpen className="size-4" />}
        value={name}
        onChange={(e) => {
          setName(e.target.value)
          if (errors.name) setErrors((prev) => ({ ...prev, name: "" }))
        }}
        error={errors.name}
        disabled={loading}
        required
      />

      {/* Duration & Fee Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FloatingInput
          id="course_duration"
          label="Duration"
          icon={<Clock className="size-4" />}
          value={duration}
          onChange={(e) => {
            setDuration(e.target.value)
            if (errors.duration) setErrors((prev) => ({ ...prev, duration: "" }))
          }}
          error={errors.duration}
          disabled={loading}
          required
        />

        <FloatingInput
          id="course_fee"
          label="Course Fee (₹)"
          icon={<DollarSign className="size-4" />}
          type="number"
          min="0"
          value={fee}
          onChange={(e) => {
            setFee(e.target.value)
            if (errors.fee) setErrors((prev) => ({ ...prev, fee: "" }))
          }}
          error={errors.fee}
          disabled={loading}
          required
        />
      </div>

      {/* Batch Timing & Max Seats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FloatingInput
          id="batch_timing"
          label="Batch Timing (Optional)"
          icon={<Clock className="size-4" />}
          value={batchTiming}
          onChange={(e) => setBatchTiming(e.target.value)}
          disabled={loading}
        />

        <FloatingInput
          id="max_students"
          label="Max Seats / Batch Capacity (Optional)"
          icon={<Users className="size-4" />}
          type="number"
          min="1"
          value={maxStudents}
          onChange={(e) => setMaxStudents(e.target.value)}
          disabled={loading}
        />
      </div>

      {/* Batch Start Date Picker */}
      <div>
        <DatePicker
          label="Batch Start Date (Optional)"
          value={startDate}
          onChange={(val) => setStartDate(val)}
          placeholder="Select batch start date..."
          disabled={loading}
        />
      </div>

      {/* Services Learned Multi-Select */}
      {availableServices.length > 0 && (
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
            <span className="flex items-center gap-1.5">
              <Flower2 className="size-3.5 text-purple-600" />
              Services Students Will Learn
            </span>
            <span className="text-[11px] font-normal text-slate-400">
              {selectedServiceIds.length} selected
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-2.5 rounded-xl border border-slate-200 bg-slate-50/50">
            {availableServices.map((service) => {
              const isSelected = selectedServiceIds.includes(service.id)
              return (
                <button
                  type="button"
                  key={service.id}
                  onClick={() => toggleService(service.id)}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                    isSelected
                      ? "bg-purple-600 text-white shadow-sm"
                      : "bg-white text-slate-700 border border-slate-200 hover:border-purple-300"
                  }`}
                >
                  {isSelected && <Check className="size-3" />}
                  {service.service_name}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Description / Syllabus */}
      <FloatingTextarea
        id="course_description"
        label="Course Description & Syllabus (Optional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={3}
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
          className="rounded-xl bg-[#7c3aed] hover:bg-[#6d28d9] text-white shadow-md shadow-purple-950/10 min-w-28 font-bold"
        >
          {loading ? "Saving..." : initialData ? "Update Course" : "Create Course"}
        </Button>
      </div>
    </form>
  )
}
