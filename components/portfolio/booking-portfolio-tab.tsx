"use client"

import { useCallback, useEffect, useState } from "react"
import { Image as ImageIcon, Paperclip } from "lucide-react"

import { PortfolioFileGrid } from "@/components/portfolio/portfolio-file-grid"
import { PortfolioLightbox } from "@/components/portfolio/portfolio-lightbox"
import { PortfolioUploader } from "@/components/portfolio/portfolio-uploader"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import type { PortfolioFileWithUrl } from "@/lib/portfolio/types"

type BookingPortfolioTabProps = {
  bookingId: number
  onQuotaExceeded?: () => void
}

export function BookingPortfolioTab({ bookingId, onQuotaExceeded }: BookingPortfolioTabProps) {
  const [deliveryFiles, setDeliveryFiles] = useState<PortfolioFileWithUrl[]>([])
  const [folderId, setFolderId] = useState<number | null>(null)
  const [previewFile, setPreviewFile] = useState<PortfolioFileWithUrl | null>(null)
  const [loading, setLoading] = useState(true)

  const loadPortfolio = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/bookings/${bookingId}/portfolio`)
      const json = await res.json()
      if (json.status) {
        setFolderId(json.data.folder?.id ?? null)
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
          <div className="shrink-0">
            <PortfolioUploader
              bookingId={bookingId}
              folderId={folderId ?? undefined}
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
    </>
  )
}
