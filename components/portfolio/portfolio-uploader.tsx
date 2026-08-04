"use client"

import { useCallback, useRef, useState } from "react"
import { Loader2, Upload } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
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
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState("")

  const uploadFiles = useCallback(
    async (files: File[]) => {
      setUploading(true)
      setProgress(5)
      setError("")

      try {
        for (let i = 0; i < files.length; i++) {
          const file = files[i]
          const body = new FormData()
          body.set("file", file)
          if (folderId) body.set("folder_id", String(folderId))
          if (bookingId) body.set("booking_id", String(bookingId))
          if (section) body.set("section", section)
          if (setAsAvatar) body.set("set_as_avatar", "true")
          if (setAsStudioLogo) body.set("set_as_studio_logo", "true")

          const uploadRes = await fetch("/api/portfolio/files/upload", {
            method: "POST",
            body,
          })

          const uploadJson = await uploadRes.json()
          if (!uploadJson.status) {
            if (uploadRes.status === 402) onQuotaExceeded?.()
            throw new Error(uploadJson.message || "Upload failed")
          }
          
          setProgress(5 + Math.floor(((i + 1) / files.length) * 95))
        }

        setProgress(100)
        onUploaded?.()
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed")
      } finally {
        setUploading(false)
        setTimeout(() => setProgress(0), 800)
        if (inputRef.current) inputRef.current.value = ""
      }
    },
    [folderId, bookingId, section, setAsAvatar, setAsStudioLogo, onUploaded, onQuotaExceeded]
  )

  return (
    <div className={cn("space-y-2", className)}>
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
        className="rounded-xl h-9 bg-slate-900 text-white hover:bg-slate-800"
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? (
          <Loader2 className="mr-1.5 size-4 animate-spin" />
        ) : (
          <Upload className="mr-1.5 size-4" />
        )}
        {label}
      </Button>

      {uploading && <Progress value={progress} className="h-1.5" />}

      {error && <p className="text-xs text-rose-600">{error}</p>}
    </div>
  )
}
