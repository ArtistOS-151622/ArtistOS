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
      <Card className="rounded-[1.75rem] border-slate-100 shadow-md shadow-purple-950/5">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div>
            <CardTitle className="text-lg">Project Deliverables</CardTitle>
            <CardDescription>Upload final portfolio deliveries here.</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <ImageIcon className="size-4 text-slate-400" /> Final Delivery
              </h4>
              <PortfolioUploader
                bookingId={bookingId}
                folderId={folderId ?? undefined}
                section="delivery"
                onUploaded={loadPortfolio}
                onQuotaExceeded={onQuotaExceeded}
                label="Upload Final Photos"
              />
            </div>
            {!loading && (
              <PortfolioFileGrid
                files={deliveryFiles}
                onDelete={handleDelete}
                onPreview={setPreviewFile}
              />
            )}
          </div>
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
