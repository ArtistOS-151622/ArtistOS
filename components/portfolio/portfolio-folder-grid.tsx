import { useState } from "react"
import Link from "next/link"
import { FolderOpen, LayoutGrid, Grid3x3, List, Share2, Trash2, MoreVertical, FileText, Image as ImageIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import type { PortfolioFolderWithStats } from "@/lib/portfolio/types"
import { formatBytes } from "@/lib/portfolio/response"
import { cn } from "@/lib/utils"

type PortfolioFolderGridProps = {
  folders: PortfolioFolderWithStats[]
  viewMode?: "grid" | "list"
  onDelete?: (id: number) => void
  onShare?: (folder: PortfolioFolderWithStats) => void
  className?: string
}

function FolderGridIcon({ previewFiles }: { previewFiles?: { id: number; public_url: string; mime_type: string }[] }) {
  const previews = previewFiles ?? []

  return (
    <div className="relative w-32 h-24 sm:w-36 sm:h-28 mx-auto shrink-0 group-hover:scale-105 transition-transform duration-200">
      {/* Folder Top Tab */}
      <div className="absolute top-0 left-0 w-14 h-3.5 sm:h-4 bg-gradient-to-r from-[#8b5cf6] to-[#7c3aed] rounded-t-md shadow-2xs" />

      {/* Main Folder Body Frame */}
      <div className="absolute top-2 inset-x-0 bottom-0 bg-gradient-to-b from-[#8b5cf6] to-[#7c3aed] rounded-b-lg rounded-tr-lg rounded-tl-none p-1.5 shadow-md shadow-purple-600/20 border border-purple-400/40 flex flex-col justify-end">
        {/* Inner 2x2 Grid Window */}
        <div className="w-full h-full bg-[#ffffff26] rounded-md overflow-hidden grid grid-cols-2 grid-rows-2 gap-0.5">
          {[0, 1, 2, 3].map((index) => {
            const file = previews[index]
            return (
              <div key={index} className="relative size-full bg-[#ffffff26] overflow-hidden flex items-center justify-center">
                {file ? (
                  file.mime_type.startsWith("image/") ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={file.public_url}
                      alt="preview"
                      className="size-full object-cover"
                    />
                  ) : (
                    <span className="text-[8px] font-black uppercase text-white/90 px-1 py-0.5 rounded shrink-0">
                      {file.mime_type.split("/")[1]?.slice(0, 3) || "DOC"}
                    </span>
                  )
                ) : (
                  <div className="size-full" />
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export function PortfolioFolderGrid({
  folders,
  viewMode = "grid",
  onDelete,
  onShare,
  className,
}: PortfolioFolderGridProps) {
  if (!folders.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white/80 p-12 text-center text-sm text-slate-500 shadow-2xs">
        No folders found. Create your first folder to organize portfolio files.
      </div>
    )
  }

  return (
    <div>
      {/* Folders Display Grid */}
      {viewMode === "list" ? (
        <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200/80 bg-white/90 shadow-sm overflow-hidden">
          {folders.map((folder) => (
            <div
              key={folder.id}
              className="flex items-center justify-between p-3.5 sm:p-4 hover:bg-slate-50/80 transition-colors group"
            >
              <Link href={`/portfolio/${folder.uuid}`} className="flex items-center gap-3.5 min-w-0 flex-1">
                <div className="size-10 rounded-xl bg-purple-50 text-[#7c3aed] border border-purple-100 flex items-center justify-center shrink-0">
                  <FolderOpen className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-slate-900 text-sm sm:text-base truncate group-hover:text-[#7c3aed] transition-colors">
                    {folder.name}
                  </h3>
                  <p className="text-xs text-slate-400 font-medium mt-0.5">
                    {folder.file_count ?? 0} items · {formatBytes(folder.total_size ?? 0)}
                  </p>
                </div>
              </Link>

              <div className="flex items-center gap-1.5 shrink-0 ml-4">
                {onShare && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-8 rounded-lg bg-purple-50 text-[#7c3aed] border border-purple-100 hover:bg-[#7c3aed] hover:text-white transition-all"
                    onClick={() => onShare(folder)}
                    title="Share Folder"
                  >
                    <Share2 className="size-3.5" />
                  </Button>
                )}
                {onDelete && !folder.booking_id && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-8 rounded-lg bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-600 hover:text-white transition-all"
                    onClick={() => onDelete(folder.id)}
                    title="Delete Folder"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div
          className={cn(
            "grid gap-6 sm:gap-8 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5",
            className
          )}
        >
          {folders.map((folder) => (
            <div
              key={folder.id}
              className="group relative flex flex-col items-center text-center space-y-2 p-2 rounded-2xl hover:bg-slate-50/80 transition-all duration-200"
            >
              {/* Folder Actions Hover Menu (Top Right) */}
              <div className="absolute top-1 right-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-white/90 shadow-md border border-slate-200/80 p-1 rounded-xl backdrop-blur-xs">
                {onShare && (
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="size-6 rounded-lg text-slate-500 hover:text-[#7c3aed] hover:bg-purple-50"
                    onClick={() => onShare(folder)}
                    title="Share"
                  >
                    <Share2 className="size-3" />
                  </Button>
                )}
                {onDelete && !folder.booking_id && (
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="size-6 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50"
                    onClick={() => onDelete(folder.id)}
                    title="Delete"
                  >
                    <Trash2 className="size-3" />
                  </Button>
                )}
              </div>

              {/* Folder Icon Component */}
              <Link href={`/portfolio/${folder.uuid}`} className="w-full flex flex-col items-center group">
                <FolderGridIcon previewFiles={folder.preview_files} />

                {/* Folder Title & Details Centered Under Icon */}
                <div className="mt-2.5 max-w-full space-y-0.5">
                  <h3 className="font-bold text-slate-800 text-sm sm:text-base tracking-tight truncate max-w-[140px] sm:max-w-[160px] mx-auto group-hover:text-[#7c3aed] transition-colors">
                    {folder.name}
                  </h3>
                  <p className="text-xs text-slate-400 font-medium">
                    {folder.file_count ?? 0} items · {formatBytes(folder.total_size ?? 0)}
                  </p>
                </div>
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
