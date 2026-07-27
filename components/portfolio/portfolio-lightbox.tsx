"use client"

import { AppModal } from "@/components/common/shared/app-modal"
import { Button } from "@/components/ui/button"
import type { PortfolioFileWithUrl } from "@/lib/portfolio/types"

type PortfolioLightboxProps = {
  open: boolean
  onClose: () => void
  file: PortfolioFileWithUrl | null
}

export function PortfolioLightbox({ open, onClose, file }: PortfolioLightboxProps) {
  if (!file) return null

  const isImage = file.mime_type.startsWith("image/")
  const isVideo = file.mime_type.startsWith("video/")

  return (
    <AppModal
      open={open}
      onClose={onClose}
      title={file.original_name}
      description=""
      footer={
        <Button variant="outline" className="h-10 rounded-xl border-slate-200 bg-white hover:bg-slate-50 text-slate-700" onClick={onClose}>
          Close
        </Button>
      }
    >
      <div className="relative flex max-h-[60vh] items-center justify-center overflow-hidden rounded-2xl bg-slate-950">
        {isImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={file.public_url}
            alt={file.original_name}
            className="max-h-[60vh] w-full object-contain"
          />
        )}

        {isVideo && (
          <video
            src={file.public_url}
            controls
            className="max-h-[60vh] w-full"
          />
        )}

        {!isImage && !isVideo && (
          <div className="p-10 text-center text-white">
            <p className="mb-4">{file.original_name}</p>
            <a
              href={file.public_url}
              target="_blank"
              rel="noreferrer"
              className="text-purple-300 underline"
            >
              Open file
            </a>
          </div>
        )}
      </div>
    </AppModal>
  )
}
