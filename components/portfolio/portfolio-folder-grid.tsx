import { useState } from "react"
import Link from "next/link"
import { FolderOpen, LayoutGrid, Grid3x3, List, Pencil, Share2, Trash2, MoreVertical, FileText, Image as ImageIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { PortfolioFolderWithStats } from "@/lib/portfolio/types"
import { formatBytes } from "@/lib/portfolio/response"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

type PortfolioFolderGridProps = {
  folders: PortfolioFolderWithStats[]
  viewMode?: "grid" | "list"
  onDelete?: (id: number) => void
  onShare?: (folder: PortfolioFolderWithStats) => void
  onEdit?: (folder: PortfolioFolderWithStats) => void
  className?: string
}

function FolderPreviewImage({ url }: { url: string }) {
  const [loaded, setLoaded] = useState(false)

  return (
    <div className="relative size-full overflow-hidden bg-[#ffffff26]">
      {!loaded && <Skeleton className="absolute inset-0 size-full rounded-none bg-white/20 animate-pulse" />}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt="preview"
        onLoad={() => setLoaded(true)}
        className={cn("size-full object-cover transition-opacity duration-300", loaded ? "opacity-100" : "opacity-0")}
      />
    </div>
  )
}

function FolderGridIcon({
  previewFiles,
  isShared,
}: {
  previewFiles?: { id: number; public_url: string; mime_type: string }[]
  isShared?: boolean
}) {
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
                    <FolderPreviewImage url={file.public_url} />
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

      {/* Shared Folder Indicator (Bottom Right) */}
      {isShared && (
        <div
          className="absolute -bottom-1 -right-1 z-10 size-6 rounded-md bg-emerald-500 text-white border-2 border-white flex items-center justify-center shadow-md"
          title="Shared Folder"
        >
          <Share2 className="size-3" />
        </div>
      )}
    </div>
  )
}

export function PortfolioFolderGrid({
  folders,
  viewMode = "grid",
  onDelete,
  onShare,
  onEdit,
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
              <Link href={`/portfolio/${folder.uuid}`} className="flex items-center gap-3.5 min-w-0 flex-1 overflow-hidden">
                <div className="relative size-10 rounded-xl bg-purple-50 text-[#7c3aed] border border-purple-100 flex items-center justify-center shrink-0">
                  <FolderOpen className="size-5" />
                  {folder.is_shared && (
                    <div className="absolute -bottom-1 -right-1 size-4 rounded-md bg-emerald-500 text-white flex items-center justify-center border border-white">
                      <Share2 className="size-2.5" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1 overflow-hidden">
                  <div className="flex items-center gap-2 min-w-0">
                    <h3
                      className="font-bold text-slate-900 text-sm sm:text-base truncate max-w-[130px] min-[380px]:max-w-[170px] sm:max-w-xs md:max-w-md lg:max-w-lg group-hover:text-[#7c3aed] transition-colors"
                      title={folder.name}
                    >
                      {folder.name}
                    </h3>
                    {/* {folder.is_shared && (
                      <span className="rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-extrabold text-emerald-700 uppercase tracking-wider shrink-0">
                        Shared
                      </span>
                    )} */}
                  </div>
                  <p className="text-xs text-slate-400 font-medium mt-0.5 truncate max-w-[200px] sm:max-w-md">
                    {folder.file_count ?? 0} items · {formatBytes(folder.total_size ?? 0)}
                  </p>
                </div>
              </Link>

              <div className="flex items-center gap-1.5 shrink-0 ml-4">
                <DropdownMenu>
                  <DropdownMenuTrigger
                    className="size-8 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors flex items-center justify-center cursor-pointer outline-none"
                    title="Folder Actions"
                  >
                    <MoreVertical className="size-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40 rounded-2xl p-1.5 shadow-xl border-slate-200/80">
                    {onEdit && (
                      <DropdownMenuItem
                        onClick={() => onEdit(folder)}
                        className="rounded-xl flex items-center gap-2 text-xs font-semibold cursor-pointer py-2 focus:bg-purple-50 focus:text-[#7c3aed]"
                      >
                        <Pencil className="size-3.5 text-[#7c3aed]" />
                        Edit Name
                      </DropdownMenuItem>
                    )}
                    {onShare && (
                      <DropdownMenuItem
                        onClick={() => onShare(folder)}
                        className="rounded-xl flex items-center gap-2 text-xs font-semibold cursor-pointer py-2 focus:bg-purple-50 focus:text-[#7c3aed]"
                      >
                        <Share2 className="size-3.5 text-[#7c3aed]" />
                        Share Folder
                      </DropdownMenuItem>
                    )}
                    {onDelete && (
                      <DropdownMenuItem
                        onClick={() => onDelete(folder.id)}
                        className="rounded-xl flex items-center gap-2 text-xs font-semibold text-rose-600 cursor-pointer py-2 focus:bg-rose-50 focus:text-rose-600"
                      >
                        <Trash2 className="size-3.5 text-rose-600" />
                        Delete Folder
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div
          className={cn(
            "grid gap-5 sm:gap-6 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 2xl:grid-cols-8",
            className
          )}
        >
          {folders.map((folder) => (
            <div
              key={folder.id}
              className="group relative flex flex-col items-center text-center space-y-2  rounded-2xl transition-all duration-200"
            >
              {/* Always-visible 3-dots Menu Button (Top Right) */}
              <div className="absolute top-1 right-1 z-20">
                <DropdownMenu>
                  <DropdownMenuTrigger
                    className="size-7 rounded-md text-slate-500 hover:text-slate-900 hover:bg-white/90 shadow-2xs border border-slate-200/60 bg-white/80 transition-colors flex items-center justify-center cursor-pointer outline-none"
                    title="Folder Actions"
                  >
                    <MoreVertical className="size-3.5" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40 rounded-2xl p-1.5 shadow-xl border-slate-200/80">
                    {onEdit && (
                      <DropdownMenuItem
                        onClick={() => onEdit(folder)}
                        className="rounded-xl flex items-center gap-2 text-xs font-semibold cursor-pointer py-2 focus:bg-purple-50 focus:text-[#7c3aed]"
                      >
                        <Pencil className="size-3.5 text-[#7c3aed]" />
                        Edit Name
                      </DropdownMenuItem>
                    )}
                    {onShare && (
                      <DropdownMenuItem
                        onClick={() => onShare(folder)}
                        className="rounded-xl flex items-center gap-2 text-xs font-semibold cursor-pointer py-2 focus:bg-purple-50 focus:text-[#7c3aed]"
                      >
                        <Share2 className="size-3.5 text-[#7c3aed]" />
                        Share Folder
                      </DropdownMenuItem>
                    )}
                    {onDelete && (
                      <DropdownMenuItem
                        onClick={() => onDelete(folder.id)}
                        className="rounded-xl flex items-center gap-2 text-xs font-semibold text-rose-600 cursor-pointer py-2 focus:bg-rose-50 focus:text-rose-600"
                      >
                        <Trash2 className="size-3.5 text-rose-600" />
                        Delete Folder
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Folder Icon Component */}
              <Link href={`/portfolio/${folder.uuid}`} className="w-full flex flex-col items-center group overflow-hidden">
                <FolderGridIcon previewFiles={folder.preview_files} isShared={folder.is_shared} />

                {/* Folder Title & Details Centered Under Icon */}
                <div className="mt-2.5 w-full max-w-[130px] sm:max-w-[150px] mx-auto space-y-0.5 overflow-hidden">
                  <h3
                    className="font-bold text-slate-800 text-sm sm:text-base tracking-tight truncate block group-hover:text-[#7c3aed] transition-colors"
                    title={folder.name}
                  >
                    {folder.name}
                  </h3>
                  <p className="text-xs text-slate-400 font-medium truncate block">
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

export function PortfolioFolderSkeleton({ viewMode = "grid" }: { viewMode?: "grid" | "list" }) {
  if (viewMode === "list") {
    return (
      <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200/80 bg-white/90 shadow-2xs overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between p-3.5 sm:p-4">
            <div className="flex items-center gap-3.5 flex-1 min-w-0">
              <Skeleton className="size-10 rounded-xl bg-slate-200/80 shrink-0" />
              <div className="space-y-2 flex-1 min-w-0">
                <Skeleton className="h-4 w-40 sm:w-56 rounded-md bg-slate-200/80" />
                <Skeleton className="h-3 w-24 rounded-md bg-slate-100" />
              </div>
            </div>
            <Skeleton className="size-8 rounded-md bg-slate-100 shrink-0" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="grid gap-5 sm:gap-6 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 2xl:grid-cols-8">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex flex-col items-center text-center space-y-3">
          <Skeleton className="w-32 h-24 sm:w-36 sm:h-28 rounded-2xl bg-slate-200/70" />
          <div className="space-y-1.5 w-full flex flex-col items-center">
            <Skeleton className="h-4 w-24 sm:w-28 rounded-md bg-slate-200/80" />
            <Skeleton className="h-3 w-16 rounded-md bg-slate-100" />
          </div>
        </div>
      ))}
    </div>
  )
}
