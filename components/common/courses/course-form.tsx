"use client"

import { useEffect, useState } from "react"
import {
  AlertTriangle,
  BookOpen,
  Calendar,
  Check,
  Clock,
  DollarSign,
  Flower2,
  ImageIcon,
  Loader2,
  UploadCloud,
  Users,
  X,
} from "lucide-react"

import type {
  Course,
  CourseFormValues,
  CourseLearnedService,
} from "@/components/common/courses/course-types"
import type { UploadProgressState } from "@/components/common/courses/course-upload-helper"
import { Button } from "@/components/ui/button"
import { DatePicker } from "@/components/common/shared/date-picker"
import {
  FloatingInput,
  FloatingTextarea,
} from "@/components/common/shared/floating-input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

type SlotItem =
  | { type: "existing"; id: number; url: string; name: string; size: number }
  | { type: "new"; file: File; url: string; name: string; size: number }
  | null

type CourseFormProps = {
  initialData?: Course | null
  availableServices: CourseLearnedService[]
  onSubmit: (values: CourseFormValues) => Promise<void>
  onCancel: () => void
  loading: boolean
  uploadProgress?: UploadProgressState | null
}

export function CourseForm({
  initialData,
  availableServices,
  onSubmit,
  onCancel,
  loading,
  uploadProgress,
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

  // 3-Slot Course Images state
  const [slots, setSlots] = useState<[SlotItem, SlotItem, SlotItem]>([null, null, null])
  const [removedImageIds, setRemovedImageIds] = useState<number[]>([])
  const [loadingImages, setLoadingImages] = useState(false)
  const [zoomImage, setZoomImage] = useState<{ url: string; name: string } | null>(null)
  const [storageRemainingBytes, setStorageRemainingBytes] = useState<number | null>(null)
  const [storageRemainingHuman, setStorageRemainingHuman] = useState<string>("")

  useEffect(() => {
    let isMounted = true

    async function loadCourseImages() {
      if (!initialData?.id) return
      try {
        setLoadingImages(true)
        const res = await fetch(`/api/courses/${initialData.id}/portfolio`)
        if (!res.ok) return
        const data = await res.json()
        const files: any[] = data.data?.files || []
        if (isMounted) {
          const newSlots: [SlotItem, SlotItem, SlotItem] = [null, null, null]
          files.slice(0, 3).forEach((f, idx) => {
            newSlots[idx] = {
              type: "existing",
              id: f.id,
              url: f.public_url,
              name: f.original_name || `Image #${idx + 1}`,
              size: Number(f.file_size) || 0,
            }
          })
          setSlots(newSlots)
        }
      } catch (err) {
        console.error("Failed to load course images:", err)
      } finally {
        if (isMounted) setLoadingImages(false)
      }
    }

    async function loadStorageInfo() {
      try {
        const res = await fetch("/api/portfolio/storage-info")
        if (res.ok) {
          const data = await res.json()
          if (isMounted && data.data?.quota) {
            setStorageRemainingBytes(Number(data.data.quota.remaining_bytes) || 0)
            setStorageRemainingHuman(data.data.quota.remaining_bytes_human || "")
          }
        }
      } catch {
        // Ignore quota load errors
      }
    }

    void loadCourseImages()
    void loadStorageInfo()

    return () => {
      isMounted = false
    }
  }, [initialData?.id])

  const newFilesTotalBytes = slots.reduce((sum, slot) => {
    if (slot && slot.type === "new") return sum + slot.size
    return sum
  }, 0)

  const isQuotaExceeded =
    storageRemainingBytes !== null &&
    newFilesTotalBytes > 0 &&
    newFilesTotalBytes > storageRemainingBytes

  const handleSlotChange = (index: number, file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file (JPG, PNG, WebP)")
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image file size must be less than 10 MB")
      return
    }

    const currentSlot = slots[index]
    if (currentSlot?.type === "existing") {
      setRemovedImageIds((prev) => [...prev, currentSlot.id])
    } else if (currentSlot?.type === "new") {
      URL.revokeObjectURL(currentSlot.url)
    }

    const objectUrl = URL.createObjectURL(file)
    const newSlots = [...slots] as [SlotItem, SlotItem, SlotItem]
    newSlots[index] = {
      type: "new",
      file,
      url: objectUrl,
      name: file.name,
      size: file.size,
    }
    setSlots(newSlots)
  }

  const removeSlot = (index: number) => {
    const currentSlot = slots[index]
    if (!currentSlot) return

    if (currentSlot.type === "existing") {
      setRemovedImageIds((prev) => [...prev, currentSlot.id])
    } else if (currentSlot.type === "new") {
      URL.revokeObjectURL(currentSlot.url)
    }

    const newSlots = [...slots] as [SlotItem, SlotItem, SlotItem]
    newSlots[index] = null
    setSlots(newSlots)
  }

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

    if (isQuotaExceeded) {
      newErrors.form = "Selected images exceed your remaining storage quota. Please remove an image or upgrade your storage."
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    const newImages = slots
      .filter((s): s is { type: "new"; file: File; url: string; name: string; size: number } => s !== null && s.type === "new")
      .map((s) => s.file)

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
        images: newImages,
        removed_image_ids: removedImageIds,
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
          label="Duration (e.g. 15 Days, 1 Month)"
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
          type="number"
          icon={<DollarSign className="size-4" />}
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

      {/* Batch Timing & Start Date Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FloatingInput
          id="course_batch_timing"
          label="Batch Timing (e.g. 10:00 AM - 1:00 PM)"
          icon={<Clock className="size-4" />}
          value={batchTiming}
          onChange={(e) => setBatchTiming(e.target.value)}
          disabled={loading}
        />
        <div className="space-y-1">
          <DatePicker
            value={startDate}
            onChange={(val) => setStartDate(val)}
            placeholder="Select Start Date"
            label="Start Date"
            disabled={loading}
          />
        </div>
      </div>

      {/* Maximum Students */}
      <FloatingInput
        id="course_max_students"
        label="Maximum Students per Batch (Optional)"
        type="number"
        icon={<Users className="size-4" />}
        value={maxStudents}
        onChange={(e) => setMaxStudents(e.target.value)}
        disabled={loading}
      />

      {/* Course Images Section (Max 3) */}
      <div className="space-y-3 pt-1">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
            <ImageIcon className="size-3.5 text-[#7c3aed]" />
            Course Images (Optional, Max 3)
          </Label>
          <div className="flex items-center gap-2">
            {storageRemainingHuman && (
              <span
                className={cn(
                  "text-[10px] sm:text-[11px] font-semibold px-2.5 py-0.5 rounded-full border transition-colors",
                  isQuotaExceeded
                    ? "bg-red-50 text-red-600 border-red-200"
                    : "bg-purple-50/70 text-purple-700 border-purple-100"
                )}
              >
                Storage: {storageRemainingHuman} free
              </span>
            )}
            <span className="text-[11px] font-medium text-slate-400">
              {slots.filter(Boolean).length} / 3 selected
            </span>
          </div>
        </div>

        {/* Quota Exceeded Banner */}
        {isQuotaExceeded && (
          <div className="rounded-2xl border border-red-200 bg-red-50/95 p-3.5 sm:p-4 text-red-800 space-y-2 shadow-xs animate-in fade-in duration-200">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="size-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-red-900">
                  Storage Quota Exceeded
                </h4>
                <p className="text-xs text-red-700 mt-0.5 leading-relaxed">
                  These photos require{" "}
                  <span className="font-bold text-red-900">
                    {(newFilesTotalBytes / (1024 * 1024)).toFixed(1)} MB
                  </span>
                  , but your remaining storage quota is only{" "}
                  <span className="font-bold text-red-900">
                    {storageRemainingHuman || "0 MB"}
                  </span>
                  . Please remove photos to save this course.
                </p>
              </div>
            </div>
          </div>
        )}

        {loadingImages ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="min-h-[130px] rounded-2xl border border-slate-200 bg-slate-50/50 p-3 flex flex-col items-center justify-center animate-pulse"
              >
                <div className="w-full h-20 bg-slate-200/70 rounded-xl mb-2" />
                <div className="w-16 h-3 bg-slate-200/70 rounded" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {slots.map((slot, index) => {
              const isThisSlotExceeded = isQuotaExceeded && slot?.type === "new"
              return (
                <div
                  key={index}
                  className={cn(
                    "relative group rounded-2xl border transition-all duration-200 overflow-hidden flex flex-col items-center justify-center p-3 text-center min-h-[130px]",
                    slot
                      ? isThisSlotExceeded
                        ? "border-red-300 bg-red-50/20 ring-1 ring-red-200"
                        : "border-purple-200 bg-purple-50/20"
                      : "border-dashed border-slate-200 hover:border-purple-300 hover:bg-slate-50/60 bg-white"
                  )}
                >
                  {slot ? (
                    <div className="relative w-full h-full flex flex-col items-center">
                      <div
                        className="relative w-full h-24 rounded-xl overflow-hidden bg-slate-100 border border-slate-200/60 mb-2 cursor-pointer group/img"
                        onClick={() => setZoomImage({ url: slot.url, name: slot.name })}
                        title="Click to view image"
                      >
                        <img
                          src={slot.url}
                          alt={slot.name}
                          className="w-full h-full object-cover transition-transform group-hover/img:scale-105"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/25 transition-colors flex items-center justify-center">
                          <span className="opacity-0 group-hover/img:opacity-100 text-white text-[10px] font-medium bg-black/60 px-2 py-0.5 rounded-full transition-opacity shadow-xs">
                            View
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            removeSlot(index)
                          }}
                          className="absolute top-1.5 right-1.5 size-6 rounded-full bg-slate-900/70 hover:bg-red-600 text-white flex items-center justify-center shadow-md transition-colors z-10"
                          title="Remove image"
                        >
                          <X className="size-3.5" />
                        </button>
                      </div>
                      <div className="w-full flex items-center justify-between text-[11px] text-slate-500 px-0.5">
                        <span className="truncate max-w-[110px] font-medium text-slate-700" title={slot.name}>
                          {slot.name}
                        </span>
                        <span className={cn("text-[10px] shrink-0 font-medium", isThisSlotExceeded ? "text-red-600 font-semibold" : "text-slate-400")}>
                          {(slot.size / (1024 * 1024)).toFixed(1)} MB
                        </span>
                      </div>
                    </div>
                  ) : (
                    <label className="w-full h-full cursor-pointer flex flex-col items-center justify-center py-4">
                      <div className="size-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-[#7c3aed] mb-2 group-hover:scale-105 transition-transform shadow-2xs">
                        <UploadCloud className="size-5" />
                      </div>
                      <span className="text-xs font-semibold text-slate-700">
                        Slot {index + 1}
                      </span>
                      <span className="text-[10px] text-slate-400 mt-0.5">
                        Click to choose photo
                      </span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/heic"
                        className="sr-only"
                        disabled={loading}
                        onChange={(e) => {
                          const selected = e.target.files?.[0]
                          if (selected) handleSlotChange(index, selected)
                          e.target.value = ""
                        }}
                      />
                    </label>
                  )}
                </div>
              )
            })}
          </div>
        )}
        <p className="text-[11px] text-slate-400">
          Course images will be stored in a Portfolio folder named with this course and count towards your cloud storage.
        </p>
      </div>

      {/* Services Learned Multi-Select */}
      {availableServices.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <Flower2 className="size-3.5 text-[#7c3aed]" />
              Services Taught in this Course
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

      {/* Upload Progress Bar */}
      {uploadProgress && (
        <div className="rounded-2xl border border-purple-200/80 bg-purple-50/70 p-3.5 space-y-2 animate-in fade-in duration-200 text-left">
          <div className="flex items-center justify-between text-xs font-semibold text-purple-950">
            <div className="flex items-center gap-2">
              <Loader2 className="size-4 animate-spin text-[#7c3aed]" />
              <span>{uploadProgress.message}</span>
            </div>
            <span className="font-mono text-purple-700 font-bold">
              {uploadProgress.percentage}%
            </span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-purple-100/90 shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-[#7c3aed] to-purple-500 transition-all duration-300 rounded-full"
              style={{
                width: `${Math.max(5, uploadProgress.percentage)}%`,
              }}
            />
          </div>
        </div>
      )}

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
          disabled={loading || isQuotaExceeded}
          className="rounded-xl bg-[#7c3aed] hover:bg-[#6d28d9] text-white shadow-md shadow-purple-950/10 min-w-28 font-bold"
        >
          {loading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="size-4 animate-spin" />
              <span>
                {uploadProgress
                  ? `${uploadProgress.percentage}% Uploading...`
                  : "Saving..."}
              </span>
            </div>
          ) : initialData ? (
            "Update Course"
          ) : (
            "Create Course"
          )}
        </Button>
      </div>

      {/* Zoom Lightbox Preview Modal */}
      {zoomImage && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs"
          onClick={() => setZoomImage(null)}
        >
          <div
            className="relative max-w-2xl max-h-[85vh] bg-black rounded-2xl overflow-hidden shadow-2xl flex flex-col items-center border border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setZoomImage(null)}
              className="absolute top-3 right-3 size-8 rounded-full bg-black/70 hover:bg-white hover:text-black text-white flex items-center justify-center transition-colors z-20"
            >
              <X className="size-4" />
            </button>
            <img
              src={zoomImage.url}
              alt={zoomImage.name}
              className="max-h-[75vh] w-auto object-contain rounded-t-2xl"
            />
            <div className="p-3 text-center text-xs text-white/90 w-full bg-slate-900 truncate">
              {zoomImage.name}
            </div>
          </div>
        </div>
      )}
    </form>
  )
}
