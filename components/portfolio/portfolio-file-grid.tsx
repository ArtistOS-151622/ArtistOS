"use client"

import { useState } from "react"
import Image from "next/image"
import {
  FileArchive,
  FileAudio,
  FileImage,
  FileText,
  FileVideo,
  Trash2,
  Download,
  PlayCircle,
  Eye,
  MoreVertical,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import type { PortfolioFileWithUrl } from "@/lib/portfolio/types"
import { cn } from "@/lib/utils"

import { formatBytes } from "@/lib/portfolio/response"

type PortfolioFileGridProps = {
  files: PortfolioFileWithUrl[]
  loading?: boolean
  viewMode?: "grid" | "list"
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

function FileImageWithSkeleton({ src, alt }: { src: string; alt: string }) {
  const [loaded, setLoaded] = useState(false)

  return (
    <div className="relative h-full w-full overflow-hidden bg-slate-100">
      {!loaded && <Skeleton className="absolute inset-0 h-full w-full rounded-none bg-slate-200/80" />}
      <Image
        src={src}
        alt={alt}
        fill
        sizes="(max-width: 768px) 300px, 400px"
        onLoad={() => setLoaded(true)}
        className={cn("object-cover transition-opacity duration-300", loaded ? "opacity-100" : "opacity-0")}
      />
    </div>
  )
}

export function PortfolioFileGrid({
  files,
  loading = false,
  viewMode = "grid",
  onDelete,
  onPreview,
  selectable,
  selectedIds = [],
  onToggleSelect,
  className,
}: PortfolioFileGridProps) {
  if (loading) {
    if (viewMode === "list") {
      return (
        <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200/80 bg-white/90 shadow-2xs overflow-hidden">
          {Array.from({ length: 5 }).map((_, idx) => (
            <div key={idx} className="flex items-center justify-between p-3.5 sm:p-4 gap-3">
              <div className="flex items-center gap-3.5 flex-1 min-w-0">
                <Skeleton className="size-10 rounded-xl bg-slate-200/80 shrink-0" />
                <div className="space-y-2 flex-1 min-w-0">
                  <Skeleton className="h-4 w-44 sm:w-64 bg-slate-200/80 rounded-md" />
                  <Skeleton className="h-3 w-24 bg-slate-200/60 rounded-md" />
                </div>
              </div>
              <Skeleton className="size-8 rounded-lg bg-slate-200/80 shrink-0" />
            </div>
          ))}
        </div>
      )
    }

    return (
      <div className={cn("grid grid-cols-2 gap-4 sm:gap-5 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5", className)}>
        {Array.from({ length: 8 }).map((_, idx) => (
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
    )
  }

  if (!files.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
        No files yet
      </div>
    )
  }

  if (viewMode === "list") {
    return (
      <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200/80 bg-white/90 shadow-2xs overflow-hidden">
        {files.map((file) => {
          const isImage = file.mime_type.startsWith("image/")
          const isVideo = file.mime_type.startsWith("video/")
          const selected = selectedIds.includes(file.id)

          return (
            <div
              key={file.id}
              className={cn(
                "flex items-center justify-between p-3 sm:p-4 hover:bg-slate-50/80 transition-colors group",
                selected && "bg-purple-50/40"
              )}
            >
              <div className="flex items-center gap-3.5 min-w-0 flex-1 overflow-hidden">
                {selectable && (
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => onToggleSelect?.(file.id)}
                    className="size-4 rounded accent-[#7c3aed] cursor-pointer shrink-0"
                  />
                )}

                <button
                  type="button"
                  onClick={() => onPreview?.(file)}
                  className="flex items-center gap-3.5 min-w-0 flex-1 text-left overflow-hidden group/btn cursor-pointer"
                >
                  <div className="relative size-10 rounded-xl overflow-hidden bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200/60">
                    {isImage ? (
                      <FileImageWithSkeleton src={file.public_url} alt={file.original_name} />
                    ) : isVideo ? (
                      <PlayCircle className="size-5 text-[#7c3aed]" />
                    ) : (
                      <FileIcon mimeType={file.mime_type} />
                    )}
                  </div>

                  <div className="min-w-0 flex-1 overflow-hidden">
                    <h4 className="font-bold text-slate-900 text-xs sm:text-sm truncate max-w-[160px] min-[380px]:max-w-[220px] sm:max-w-xs md:max-w-md group-hover/btn:text-[#7c3aed] transition-colors" title={file.original_name}>
                      {file.original_name}
                    </h4>
                    <p className="text-[11px] text-slate-400 font-medium mt-0.5 truncate">
                      {formatBytes(file.file_size ?? 0)} · {file.mime_type.split("/")[1]?.toUpperCase() || "FILE"}
                    </p>
                  </div>
                </button>
              </div>

              <div className="flex items-center gap-1.5 shrink-0 ml-3">
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="size-8 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                  onClick={async () => {
                    const res = await fetch(`/api/portfolio/files/${file.id}/download`)
                    const json = await res.json()
                    if (json.status) window.open(json.data.download_url, "_blank")
                  }}
                  title="Download file"
                >
                  <Download className="size-4" />
                </Button>
                {onDelete && (
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="size-8 rounded-lg text-rose-600 hover:bg-rose-50"
                    onClick={() => onDelete(file.id)}
                    title="Delete file"
                  >
                    <Trash2 className="size-4 text-rose-600" />
                  </Button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className={cn("grid grid-cols-2 gap-4 sm:gap-5 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5", className)}>
      {files.map((file) => {
        const isImage = file.mime_type.startsWith("image/")
        const isVideo = file.mime_type.startsWith("video/")
        const selected = selectedIds.includes(file.id)

        return (
          <div
            key={file.id}
            className={cn(
              "group relative flex flex-col overflow-hidden rounded-2xl border bg-white shadow-xs transition-all duration-200 hover:shadow-md",
              selected ? "border-[#7c3aed] ring-2 ring-purple-100" : "border-slate-200/80"
            )}
          >
            {/* Top Left Checkbox */}
            {selectable && (
              <input
                type="checkbox"
                checked={selected}
                onChange={() => onToggleSelect?.(file.id)}
                className="absolute left-2.5 top-2.5 z-20 size-4.5 rounded border-slate-300 accent-[#7c3aed] bg-white shadow-xs cursor-pointer"
              />
            )}

            {/* Top Right 3-Dots Actions Menu */}
            <div className="absolute right-2.5 top-2.5 z-20">
              <DropdownMenu>
                <DropdownMenuTrigger
                  className="size-7.5 rounded-lg border border-slate-200/80 bg-white/90 shadow-2xs hover:bg-white text-slate-600 flex items-center justify-center cursor-pointer outline-none transition-colors"
                  title="File Actions"
                >
                  <MoreVertical className="size-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40 rounded-2xl p-1.5 shadow-xl border-slate-200/80">
                  <DropdownMenuItem
                    onClick={() => onPreview?.(file)}
                    className="rounded-xl flex items-center gap-2 text-xs font-semibold cursor-pointer py-2 focus:bg-purple-50 focus:text-[#7c3aed]"
                  >
                    <Eye className="size-3.5 text-[#7c3aed]" />
                    Preview
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={async () => {
                      const res = await fetch(`/api/portfolio/files/${file.id}/download`)
                      const json = await res.json()
                      if (json.status) window.open(json.data.download_url, "_blank")
                    }}
                    className="rounded-xl flex items-center gap-2 text-xs font-semibold cursor-pointer py-2 focus:bg-purple-50 focus:text-[#7c3aed]"
                  >
                    <Download className="size-3.5 text-[#7c3aed]" />
                    Download
                  </DropdownMenuItem>
                  {onDelete && (
                    <DropdownMenuItem
                      onClick={() => onDelete(file.id)}
                      className="rounded-xl flex items-center gap-2 text-xs font-semibold text-rose-600 cursor-pointer py-2 focus:bg-rose-50 focus:text-rose-600"
                    >
                      <Trash2 className="size-3.5 text-rose-600" />
                      Delete File
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Main Preview Container */}
            <button
              type="button"
              className="relative w-full aspect-[4/3] bg-slate-100 overflow-hidden flex items-center justify-center p-0 cursor-pointer group-hover:opacity-95 transition-opacity"
              onClick={() => onPreview?.(file)}
            >
              {isImage ? (
                <FileImageWithSkeleton src={file.public_url} alt={file.original_name} />
              ) : isVideo ? (
                <div className="relative flex size-full items-center justify-center bg-gradient-to-br from-violet-500 via-fuchsia-500 to-pink-500 group-hover:from-violet-600 group-hover:via-fuchsia-600 group-hover:to-pink-600 transition-colors">
                  <PlayCircle className="size-10 sm:size-12 text-white drop-shadow-md" />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-4 text-center">
                  <FileIcon mimeType={file.mime_type} />
                </div>
              )}
            </button>

            {/* Bottom Meta Footer Card matching screenshot */}
            <div className="p-3 bg-white border-t border-slate-100 flex flex-col justify-center min-w-0">
              <h4
                className="font-bold text-slate-900 text-xs sm:text-sm truncate min-w-0 block"
                title={file.original_name}
              >
                {file.original_name}
              </h4>
              <p className="text-[11px] text-slate-400 font-medium mt-0.5 truncate">
                {formatBytes(file.file_size ?? 0)}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
