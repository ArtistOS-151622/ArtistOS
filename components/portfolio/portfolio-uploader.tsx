"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { AlertCircle, CheckCircle2, ChevronDown, ChevronUp, FileImage, Loader2, Upload, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { formatBytes } from "@/lib/portfolio/response"
import { cn } from "@/lib/utils"

type PortfolioUploaderProps = {
  folderId?: number
  bookingId?: number
  section?: "reference" | "delivery" | null
  setAsAvatar?: boolean
  setAsStudioLogo?: boolean
  onUploaded?: () => void
  onQuotaExceeded?: () => void
  className?: string
  label?: string
}

type UploadItem = {
  id: string
  name: string
  size: number
  status: "pending" | "uploading" | "success" | "error"
  progress: number
  error?: string
}

function uploadSingleFile(
  file: File,
  params: {
    folderId?: number
    bookingId?: number
    section?: "reference" | "delivery" | null
    setAsAvatar?: boolean
    setAsStudioLogo?: boolean
  },
  onProgress: (percent: number) => void
): Promise<{ status: boolean; message?: string; quotaExceeded?: boolean }> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest()
    const formData = new FormData()
    formData.append("file", file)
    if (params.folderId) formData.append("folder_id", String(params.folderId))
    if (params.bookingId) formData.append("booking_id", String(params.bookingId))
    if (params.section) formData.append("section", params.section)
    if (params.setAsAvatar) formData.append("set_as_avatar", "true")
    if (params.setAsStudioLogo) formData.append("set_as_studio_logo", "true")

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100)
        onProgress(percent)
      }
    }

    xhr.onload = () => {
      try {
        const res = JSON.parse(xhr.responseText)
        if (xhr.status >= 200 && xhr.status < 300 && res.status) {
          resolve({ status: true })
        } else {
          resolve({
            status: false,
            message: res.message || "Upload failed",
            quotaExceeded: xhr.status === 402,
          })
        }
      } catch {
        resolve({ status: false, message: "Upload failed" })
      }
    }

    xhr.onerror = () => {
      resolve({ status: false, message: "Network error" })
    }

    xhr.open("POST", "/api/portfolio/files/upload")
    xhr.send(formData)
  })
}

function CustomProgressBar({
  value,
  colorClass = "bg-[#7c3aed]",
}: {
  value: number
  colorClass?: string
}) {
  const percent = Math.min(100, Math.max(0, value))
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 border border-slate-200/50">
      <div
        className={cn("h-full rounded-full transition-all duration-300 ease-out", colorClass)}
        style={{ width: `${percent}%` }}
      />
    </div>
  )
}

export function PortfolioUploader({
  folderId,
  bookingId,
  section,
  setAsAvatar,
  setAsStudioLogo,
  onUploaded,
  onQuotaExceeded,
  className,
  label = "Upload",
}: PortfolioUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [items, setItems] = useState<UploadItem[]>([])
  const [showDrawer, setShowDrawer] = useState(false)
  const [minimized, setMinimized] = useState(false)

  const uploadFiles = useCallback(
    async (files: File[]) => {
      if (!files.length) return

      const initialItems: UploadItem[] = files.map((f, i) => ({
        id: `${Date.now()}-${i}`,
        name: f.name,
        size: f.size,
        status: "pending",
        progress: 0,
      }))

      setItems(initialItems)
      setShowDrawer(true)
      setMinimized(false)
      setUploading(true)

      let anySuccess = false

      for (let i = 0; i < files.length; i++) {
        const item = initialItems[i]
        const file = files[i]

        setItems((prev) =>
          prev.map((it) => (it.id === item.id ? { ...it, status: "uploading", progress: 0 } : it))
        )

        const result = await uploadSingleFile(
          file,
          { folderId, bookingId, section, setAsAvatar, setAsStudioLogo },
          (percent) => {
            setItems((prev) =>
              prev.map((it) => (it.id === item.id ? { ...it, progress: percent } : it))
            )
          }
        )

        if (result.status) {
          anySuccess = true
          setItems((prev) =>
            prev.map((it) =>
              it.id === item.id ? { ...it, status: "success", progress: 100 } : it
            )
          )
          onUploaded?.()
        } else {
          if (result.quotaExceeded) onQuotaExceeded?.()
          setItems((prev) =>
            prev.map((it) =>
              it.id === item.id
                ? { ...it, status: "error", progress: 100, error: result.message || "Failed" }
                : it
            )
          )
        }
      }

      setUploading(false)
      if (anySuccess) onUploaded?.()
      if (inputRef.current) inputRef.current.value = ""
    },
    [folderId, bookingId, section, setAsAvatar, setAsStudioLogo, onUploaded, onQuotaExceeded]
  )

  const completedCount = items.filter((i) => i.status === "success" || i.status === "error").length
  const totalCount = items.length
  
  const totalBytes = items.reduce((acc, curr) => acc + (curr.size || 0), 0)
  const uploadedBytes = items.reduce((acc, curr) => {
    const fileBytes = curr.size || 0
    const progressPercent = curr.progress || 0
    return acc + Math.round((fileBytes * progressPercent) / 100)
  }, 0)

  const overallPercent =
    totalBytes > 0
      ? Math.min(100, Math.round((uploadedBytes / totalBytes) * 100))
      : 0

  const allFinished = !uploading && totalCount > 0 && completedCount === totalCount

  // Auto-close floating drawer 3 seconds after all files finish uploading
  useEffect(() => {
    if (allFinished) {
      const timer = setTimeout(() => {
        setShowDrawer(false)
        setItems([])
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [allFinished])

  return (
    <div className={cn("inline-block", className)}>
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          const files = e.target.files
          if (files && files.length > 0) void uploadFiles(Array.from(files))
        }}
      />

      <Button
        type="button"
        size="sm"
        disabled={uploading}
        className="rounded-xl h-9 sm:h-10 bg-[#7c3aed] hover:bg-[#6d28d9] text-white shadow-md shadow-purple-600/20 font-semibold px-2.5 sm:px-4"
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Upload className="size-4" />
        )}
        <span className="hidden sm:inline ml-1.5">{label}</span>
      </Button>

      {/* Floating Upload FAB — Mobile: bottom-right circle */}
      {!showDrawer && (
        <button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          title="Upload files"
          className={cn(
            "md:hidden fixed bottom-6 right-4 z-50",
            "size-13 rounded-full flex items-center justify-center",
            "bg-[#7c3aed] hover:bg-[#6d28d9] text-white",
            "shadow-xl shadow-purple-600/40",
            "transition-all duration-200 active:scale-95",
            "disabled:opacity-60 disabled:cursor-not-allowed",
            "border-2 border-purple-400/30"
          )}
        >
          {uploading ? (
            <Loader2 className="size-5 animate-spin" />
          ) : (
            <Upload className="size-5" />
          )}
        </button>
      )}

      {/* Floating Upload FAB — Desktop: right-edge expanding pill */}
      {!showDrawer && (
        <button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          title="Upload files"
          className={cn(
            "hidden md:flex fixed right-0 top-1/2 -translate-y-1/2 z-40 group",
            "items-center gap-2.5 rounded-l-2xl",
            "bg-[#7c3aed] hover:bg-[#6d28d9] text-white",
            "shadow-xl shadow-purple-600/40",
            "transition-all duration-300 ease-out",
            "pl-3.5 pr-3.5 py-3.5",
            "hover:pl-4 hover:pr-5",
            "disabled:opacity-60 disabled:cursor-not-allowed",
            "border-y border-l border-purple-400/30"
          )}
        >
          {uploading ? (
            <Loader2 className="size-5 animate-spin shrink-0" />
          ) : (
            <Upload className="size-5 shrink-0 group-hover:-translate-y-0.5 transition-transform duration-200" />
          )}
          <span className="text-sm font-bold overflow-hidden max-w-0 group-hover:max-w-[60px] transition-all duration-300 ease-out whitespace-nowrap opacity-0 group-hover:opacity-100">
            {uploading ? "Uploading" : "Upload"}
          </span>
        </button>
      )}

      {/* Floating Bottom-Right Upload Progress Drawer */}
      {showDrawer && items.length > 0 && (
        <div className="fixed bottom-5 right-5 z-50 w-80 sm:w-[26rem] rounded-2xl bg-white border border-slate-200/90 shadow-2xl shadow-purple-950/10 overflow-hidden transition-all duration-300 animate-in slide-in-from-bottom-5">
          {/* Lighter Header Bar */}
          <div className="bg-white border-b border-slate-100 p-3.5 px-4 flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={cn(
                  "size-8 rounded-xl flex items-center justify-center shrink-0 border transition-colors",
                  allFinished
                    ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                    : "bg-purple-50 text-[#7c3aed] border-purple-100"
                )}
              >
                {allFinished ? (
                  <CheckCircle2 className="size-4.5 text-emerald-600" />
                ) : (
                  <Loader2 className="size-4.5 text-[#7c3aed] animate-spin" />
                )}
              </div>
              <div className="min-w-0">
                <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 truncate tracking-tight">
                  {allFinished
                    ? `Uploaded ${items.length} file${items.length > 1 ? "s" : ""}`
                    : `Uploading ${completedCount} of ${items.length} files…`}
                </h4>
                <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                  {allFinished ? "Closing in 3s…" : `${overallPercent}% complete`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => setMinimized((prev) => !prev)}
                className="size-7 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
                title={minimized ? "Expand" : "Minimize"}
              >
                {minimized ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDrawer(false)
                  setItems([])
                }}
                className="size-7 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
                title="Close"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>

          {/* Expanded Body */}
          {!minimized && (
            <div className="p-4 space-y-3.5 max-h-80 overflow-y-auto">
              {/* Overall Progress Bar */}
              <div className="space-y-1.5 bg-slate-50/80 p-2.5 rounded-xl border border-slate-100">
                <div className="flex justify-between text-[11px] font-bold text-slate-700">
                  <span>Overall Upload Progress</span>
                  <span className="text-[#7c3aed]">{overallPercent}%</span>
                </div>
                <CustomProgressBar
                  value={overallPercent}
                  colorClass="bg-gradient-to-r from-[#7c3aed] to-indigo-600"
                />
              </div>

              {/* Individual File Progress List */}
              <div className="space-y-2 pt-0.5">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl border border-slate-200/60 bg-white shadow-2xs space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="size-7 rounded-lg bg-purple-50 text-[#7c3aed] flex items-center justify-center shrink-0 border border-purple-100">
                          <FileImage className="size-3.5" />
                        </div>
                        <div className="min-w-0">
                          <span
                            className="text-xs font-bold text-slate-800 truncate block max-w-[160px] sm:max-w-[200px]"
                            title={item.name}
                          >
                            {item.name}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium block">
                            {formatBytes(item.size)}
                          </span>
                        </div>
                      </div>

                      <div className="shrink-0">
                        {item.status === "uploading" && (
                          <span className="inline-flex items-center gap-1 bg-purple-50 text-[#7c3aed] border border-purple-200/60 px-2 py-0.5 rounded-md text-[10px] font-bold">
                            <Loader2 className="size-3 animate-spin" /> {item.progress}%
                          </span>
                        )}
                        {item.status === "success" && (
                          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200/60 px-2 py-0.5 rounded-md text-[10px] font-bold">
                            <CheckCircle2 className="size-3 text-emerald-600" /> Done
                          </span>
                        )}
                        {item.status === "error" && (
                          <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-600 border border-rose-200/60 px-2 py-0.5 rounded-md text-[10px] font-bold">
                            <AlertCircle className="size-3 text-rose-500" /> Failed
                          </span>
                        )}
                        {item.status === "pending" && (
                          <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-500 border border-slate-200/60 px-2 py-0.5 rounded-md text-[10px] font-bold">
                            Waiting
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Progress bar per file */}
                    <CustomProgressBar
                      value={item.progress}
                      colorClass={cn(
                        item.status === "success" && "bg-emerald-500",
                        item.status === "error" && "bg-rose-500",
                        (item.status === "uploading" || item.status === "pending") &&
                          "bg-gradient-to-r from-[#7c3aed] to-indigo-500"
                      )}
                    />
                    {item.error && <p className="text-[10px] font-semibold text-rose-600 mt-0.5">{item.error}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
