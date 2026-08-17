"use client"

import { useCallback, useEffect, useState } from "react"
import { Image as ImageIcon, Share2 } from "lucide-react"

import { PortfolioFileGrid } from "@/components/portfolio/portfolio-file-grid"
import { PortfolioLightbox } from "@/components/portfolio/portfolio-lightbox"
import { PortfolioShareModal } from "@/components/portfolio/portfolio-share-modal"
import { PortfolioUploader } from "@/components/portfolio/portfolio-uploader"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { PortfolioFileWithUrl, PortfolioFolderWithStats } from "@/lib/portfolio/types"

type BookingPortfolioTabProps = {
  bookingId: number
  onQuotaExceeded?: () => void
}

export function BookingPortfolioTab({ bookingId, onQuotaExceeded }: BookingPortfolioTabProps) {
  const [deliveryFiles, setDeliveryFiles] = useState<PortfolioFileWithUrl[]>([])
  const [folder, setFolder] = useState<PortfolioFolderWithStats | null>(null)
  const [previewFile, setPreviewFile] = useState<PortfolioFileWithUrl | null>(null)
  const [loading, setLoading] = useState(true)
  const [shareOpen, setShareOpen] = useState(false)

  const loadPortfolio = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/bookings/${bookingId}/portfolio`)
      const json = await res.json()
      if (json.status) {
        setFolder(json.data.folder ?? null)
        setDeliveryFiles(json.data.delivery_files ?? [])
      }
    } finally {
      setLoading(false)
    }
  }, [bookingId])

  useEffect(() => {
    void loadPortfolio()
  }, [loadPortfolio])

  async function handleDelete(id: number) {
    await fetch(`/api/portfolio/files/${id}`, { method: "DELETE" })
    void loadPortfolio()
  }

  return (
    <>
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
    </>
  )
}
