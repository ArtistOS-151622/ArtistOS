"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  BookmarkCheck,
  Eye,
  Image as ImageIcon,
  Loader2,
  Share2,
  Sparkles,
  Trash2,
  UploadCloud,
} from "lucide-react"
import { toast } from "sonner"

import { PortfolioFileGrid } from "@/components/portfolio/portfolio-file-grid"
import { PortfolioLightbox } from "@/components/portfolio/portfolio-lightbox"
import { PortfolioShareModal } from "@/components/portfolio/portfolio-share-modal"
import { PortfolioUploader } from "@/components/portfolio/portfolio-uploader"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { formatBytes } from "@/lib/portfolio/response"
import { cn } from "@/lib/utils"
import type { PortfolioFileWithUrl, PortfolioFolderWithStats } from "@/lib/portfolio/types"

type BookingPortfolioTabProps = {
  bookingId: number
  onQuotaExceeded?: () => void
}

export function BookingPortfolioTab({ bookingId, onQuotaExceeded }: BookingPortfolioTabProps) {
  const [deliveryFiles, setDeliveryFiles] = useState<PortfolioFileWithUrl[]>([])
  const [referenceFiles, setReferenceFiles] = useState<PortfolioFileWithUrl[]>([])
  const [folder, setFolder] = useState<PortfolioFolderWithStats | null>(null)
  const [previewFile, setPreviewFile] = useState<PortfolioFileWithUrl | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploadingSlot, setUploadingSlot] = useState<number | null>(null)
  const [shareOpen, setShareOpen] = useState(false)
  const slotInputRef = useRef<HTMLInputElement>(null)

  const loadPortfolio = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/bookings/${bookingId}/portfolio`)
      const json = await res.json()
      if (json.status) {
        setFolder(json.data.folder ?? null)
        setDeliveryFiles(json.data.delivery_files ?? [])
        setReferenceFiles(json.data.reference_files ?? [])
      }
    } finally {
      setLoading(false)
    }
  }, [bookingId])

  useEffect(() => {
    void loadPortfolio()
  }, [loadPortfolio])

  async function handleDelete(id: number) {
    try {
      const res = await fetch(`/api/portfolio/files/${id}`, { method: "DELETE" })
      if (!res.ok) {
        toast.error("Failed to delete file")
      } else {
        toast.success("File deleted")
      }
      void loadPortfolio()
    } catch {
      toast.error("Network error while deleting file")
    }
  }

  async function handleDirectReferenceUpload(file: File) {
    if (referenceFiles.length >= 3) {
      toast.error("Maximum 3 reference images allowed for this booking.")
      return
    }

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file (JPEG, PNG, WebP, etc.).")
      return
    }

    if (file.size > 20 * 1024 * 1024) {
      toast.error("File exceeds maximum allowed size of 20MB.")
      return
    }

    setUploadingSlot(referenceFiles.length)
    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("booking_id", String(bookingId))
      formData.append("section", "reference")

      const res = await fetch("/api/portfolio/files/upload", {
        method: "POST",
        body: formData,
      })

      const data = await res.json().catch(() => ({}))
      if (res.status === 402) {
        toast.error("Storage quota exceeded. Please upgrade your storage plan.")
        onQuotaExceeded?.()
      } else if (!res.ok || !data.status) {
        toast.error(data.message || "Failed to upload reference image")
      } else {
        toast.success("Reference image uploaded successfully")
        void loadPortfolio()
      }
    } catch {
      toast.error("Network error while uploading reference image")
    } finally {
      setUploadingSlot(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* 1. REFERENCE IMAGES SECTION (MAX 3) */}
      <Card className="rounded-2xl sm:rounded-[1.75rem] border border-slate-200/80 bg-white/90 shadow-md shadow-purple-950/[0.03] overflow-hidden">
        <CardHeader className="!p-4 sm:!p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="size-9 rounded-xl bg-purple-50 text-[#7c3aed] border border-purple-100 flex items-center justify-center shrink-0 shadow-2xs">
              <BookmarkCheck className="size-4 text-[#7c3aed]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base font-bold text-slate-900">
                  Reference Images
                </CardTitle>
                {loading ? (
                  <Skeleton className="h-5 w-16 rounded-lg bg-slate-200/80" />
                ) : (
                  <Badge
                    variant="secondary"
                    className={cn(
                      "text-[10px] font-semibold tracking-wide rounded-lg px-2 py-0.5",
                      referenceFiles.length === 3
                        ? "bg-purple-100 text-purple-700 border-purple-200"
                        : "bg-slate-100 text-slate-600 border-slate-200"
                    )}
                  >
                    {referenceFiles.length} / 3 images
                  </Badge>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Client style inspirations and reference designs attached to this booking
              </p>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 shrink-0">
              <Skeleton className="h-9 w-28 rounded-xl bg-slate-200/80" />
            </div>
          ) : referenceFiles.length < 3 ? (
            <div className="flex items-center gap-2 shrink-0">
              <Button
                type="button"
                onClick={() => slotInputRef.current?.click()}
                disabled={uploadingSlot !== null}
                className="h-9 rounded-xl bg-[#7c3aed] text-white hover:bg-[#6d28d9] px-3.5 text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5"
              >
                {uploadingSlot !== null ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    <span>Uploading...</span>
                  </>
                ) : (
                  <>
                    <UploadCloud className="size-3.5" />
                    <span>Add Reference</span>
                  </>
                )}
              </Button>
            </div>
          ) : null}
        </CardHeader>

        <CardContent className="p-4 sm:p-5">
          {/* Hidden file input for adding reference images directly */}
          <input
            ref={slotInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) void handleDirectReferenceUpload(file)
              e.target.value = ""
            }}
          />

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[0, 1, 2].map((idx) => (
                <div
                  key={idx}
                  className="flex flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs"
                >
                  <Skeleton className="w-full aspect-[4/3] bg-slate-200/80" />
                  <div className="p-3 space-y-2 bg-white border-t border-slate-100">
                    <Skeleton className="h-4 w-3/4 bg-slate-200/80 rounded-md" />
                    <Skeleton className="h-3 w-1/3 bg-slate-200/60 rounded-md" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[0, 1, 2].map((index) => {
                const file = referenceFiles[index]
                const isUploadingThis = uploadingSlot === index

                if (file) {
                  return (
                    <div
                      key={file.id}
                      className="group relative rounded-2xl border border-slate-200/80 bg-white overflow-hidden shadow-2xs hover:shadow-md hover:border-purple-200 transition-all flex flex-col"
                    >
                      {/* Thumbnail container */}
                      <div
                        onClick={() => setPreviewFile(file)}
                        className="relative w-full aspect-[4/3] bg-slate-100 overflow-hidden cursor-pointer"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={file.public_url}
                          alt={file.original_name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />

                        {/* Top Overlay Badge & Actions */}
                        <div className="absolute top-2 left-2">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-900/60 backdrop-blur-xs text-white">
                            Ref #{index + 1}
                          </span>
                        </div>

                        <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              void handleDelete(file.id)
                            }}
                            className="size-7 rounded-lg bg-red-600/90 hover:bg-red-600 text-white flex items-center justify-center shadow-md transition-colors"
                            title="Delete reference image"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>

                        {/* Hover eye icon */}
                        <div className="absolute inset-0 bg-purple-950/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                          <div className="size-9 rounded-full bg-white/90 text-purple-700 flex items-center justify-center shadow-md">
                            <Eye className="size-4" />
                          </div>
                        </div>
                      </div>

                      {/* File Meta Footer */}
                      <div className="p-2.5 flex items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/40">
                        <span className="text-xs font-semibold text-slate-800 truncate" title={file.original_name}>
                          {file.original_name}
                        </span>
                        <span className="text-[10px] font-medium text-slate-400 shrink-0">
                          {formatBytes(file.file_size)}
                        </span>
                      </div>
                    </div>
                  )
                }

                // Empty Slot
                return (
                  <div
                    key={`empty-${index}`}
                    onClick={() => {
                      if (referenceFiles.length < 3 && uploadingSlot === null) {
                        slotInputRef.current?.click()
                      }
                    }}
                    className={cn(
                      "rounded-2xl border-2 border-dashed border-slate-200/80 p-5 flex flex-col items-center justify-center text-center transition-all min-h-[160px]",
                      referenceFiles.length < 3 && uploadingSlot === null
                        ? "cursor-pointer hover:border-purple-300 hover:bg-purple-50/15 group"
                        : "opacity-60 cursor-not-allowed"
                    )}
                  >
                    {isUploadingThis ? (
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="size-7 animate-spin text-[#7c3aed]" />
                        <span className="text-xs font-semibold text-slate-600">Uploading Slot {index + 1}...</span>
                      </div>
                    ) : (
                      <>
                        <div className="size-11 rounded-2xl bg-slate-100 border border-slate-200/60 flex items-center justify-center text-slate-400 mb-2.5 group-hover:scale-105 group-hover:bg-purple-50 group-hover:text-[#7c3aed] group-hover:border-purple-200 transition-all">
                          <UploadCloud className="size-5" />
                        </div>
                        <span className="text-xs font-bold text-slate-700">
                          Slot #{index + 1}
                        </span>
                        <span className="text-[11px] text-slate-400 mt-0.5">
                          {referenceFiles.length < 3 ? "Click to add reference image" : "Slot unavailable"}
                        </span>
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 2. PROJECT DELIVERABLES SECTION */}
      <Card className="rounded-2xl sm:rounded-[1.75rem] border border-slate-200/80 bg-white/90 shadow-md shadow-purple-950/[0.03] overflow-hidden">
        <CardHeader className="!p-4 sm:!p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="size-9 rounded-xl bg-purple-50 text-[#7c3aed] border border-purple-100 flex items-center justify-center shrink-0 shadow-2xs">
              <ImageIcon className="size-4 text-[#7c3aed]" />
            </div>
            <div>
              <CardTitle className="text-base font-bold text-slate-900">
                Project Deliverables
              </CardTitle>
              <p className="text-xs text-slate-500 mt-0.5">
                Finished media deliverables to share with client
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Share Booking Folder Button */}
            {folder && (
              <Button
                type="button"
                variant={folder.is_shared ? "default" : "outline"}
                size="icon"
                className={cn(
                  "size-9 rounded-xl transition-all shadow-2xs",
                  folder.is_shared
                    ? "bg-[#7c3aed] text-white hover:bg-[#6d28d9] shadow-purple-600/20"
                    : "border-slate-200/80 bg-white text-slate-700 hover:bg-slate-50"
                )}
                onClick={() => setShareOpen(true)}
                title={folder.is_shared ? "Folder is shared" : "Share this folder"}
              >
                <Share2 className={cn("size-4", folder.is_shared ? "text-white" : "text-[#7c3aed]")} />
              </Button>
            )}

            <PortfolioUploader
              bookingId={bookingId}
              folderId={folder?.id ?? undefined}
              section="delivery"
              onUploaded={loadPortfolio}
              onQuotaExceeded={onQuotaExceeded}
              label="Upload Deliverables"
            />
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-5">
          <PortfolioFileGrid
            files={deliveryFiles}
            loading={loading}
            onDelete={handleDelete}
            onPreview={setPreviewFile}
          />
        </CardContent>
      </Card>

      <PortfolioLightbox
        open={!!previewFile}
        onClose={() => setPreviewFile(null)}
        file={previewFile}
      />

      <PortfolioShareModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        folder={folder}
        onUpdated={() => void loadPortfolio()}
      />
    </div>
  )
}
