"use client"

import {
  FileArchive,
  FileAudio,
  FileImage,
  FileText,
  FileVideo,
  Trash2,
  Download,
  PlayCircle,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import type { PortfolioFileWithUrl } from "@/lib/portfolio/types"
import { cn } from "@/lib/utils"

type PortfolioFileGridProps = {
  files: PortfolioFileWithUrl[]
  onDelete?: (id: number) => void
  onPreview?: (file: PortfolioFileWithUrl) => void
  selectable?: boolean
  selectedIds?: number[]
  onToggleSelect?: (id: number) => void
  className?: string
}

function FileIcon({ mimeType }: { mimeType: string }) {
  if (mimeType.startsWith("image/")) return <FileImage className="size-8 text-purple-500" />
  if (mimeType.startsWith("video/")) return <FileVideo className="size-8 text-blue-500" />
  if (mimeType.startsWith("audio/")) return <FileAudio className="size-8 text-emerald-500" />
  if (mimeType.includes("zip") || mimeType.includes("rar") || mimeType.includes("7z")) {
    return <FileArchive className="size-8 text-amber-500" />
  }
  return <FileText className="size-8 text-slate-400" />
}

export function PortfolioFileGrid({
  files,
  onDelete,
  onPreview,
  selectable,
  selectedIds = [],
  onToggleSelect,
  className,
}: PortfolioFileGridProps) {
  if (!files.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
        No files yet
      </div>
    )
  }

  return (
    <div className={cn("grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4", className)}>
      {files.map((file) => {
        const isImage = file.mime_type.startsWith("image/")
        const isVideo = file.mime_type.startsWith("video/")
        const selected = selectedIds.includes(file.id)

        return (
          <div
            key={file.id}
            className={cn(
              "group relative aspect-square overflow-hidden rounded-2xl border bg-white shadow-sm",
              selected ? "border-[#7c3aed] ring-2 ring-purple-100" : "border-slate-100"
            )}
          >
            {selectable && (
              <input
                type="checkbox"
                checked={selected}
                onChange={() => onToggleSelect?.(file.id)}
                className="absolute left-2 top-2 z-10 size-4 rounded"
              />
            )}

            <button
              type="button"
              className="flex h-full w-full flex-col items-center justify-center p-2"
              onClick={() => onPreview?.(file)}
            >
              {isImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={file.public_url}
                  alt={file.original_name}
                  className="h-full w-full object-cover"
                />
              ) : isVideo ? (
                <div className="relative flex h-full w-full items-center justify-center bg-gradient-to-br from-violet-500 via-fuchsia-500 to-pink-500 group-hover:from-violet-600 group-hover:via-fuchsia-600 group-hover:to-pink-600 transition-colors">
                  <PlayCircle className="size-12 text-white drop-shadow-md" />
                </div>
              ) : (
                <>
                  <FileIcon mimeType={file.mime_type} />
                  <span className="mt-2 line-clamp-2 text-xs text-slate-600 px-1">
                    {file.original_name}
                  </span>
                </>
              )}
            </button>

            <div className="absolute inset-x-0 bottom-0 flex justify-end gap-1 bg-gradient-to-t from-black/50 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
              <Button
                type="button"
                size="icon"
                variant="secondary"
                className="size-7 rounded-lg"
                onClick={async () => {
                  const res = await fetch(`/api/portfolio/files/${file.id}/download`)
                  const json = await res.json()
                  if (json.status) window.open(json.data.download_url, "_blank")
                }}
              >
                <Download className="size-3.5" />
              </Button>
              {onDelete && (
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  className="size-7 rounded-lg text-rose-600"
                  onClick={() => onDelete(file.id)}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
