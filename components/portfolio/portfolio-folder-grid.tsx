"use client"

import Link from "next/link"
import { FolderOpen, Share2, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import type { PortfolioFolderWithStats } from "@/lib/portfolio/types"
import { formatBytes } from "@/lib/portfolio/response"
import { cn } from "@/lib/utils"

type PortfolioFolderGridProps = {
  folders: PortfolioFolderWithStats[]
  onDelete?: (id: number) => void
  onShare?: (folder: PortfolioFolderWithStats) => void
  className?: string
}

export function PortfolioFolderGrid({
  folders,
  onDelete,
  onShare,
  className,
}: PortfolioFolderGridProps) {
  if (!folders.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center text-sm text-slate-500">
        Create your first folder to organize portfolio files.
      </div>
    )
  }

  return (
    <div className={cn("grid gap-4 sm:grid-cols-2 lg:grid-cols-3", className)}>
      {folders.map((folder) => (
        <Card
          key={folder.id}
          className="rounded-[1.5rem] border-slate-100 shadow-md shadow-purple-950/5 overflow-hidden"
        >
          <CardContent className="p-5">
            <Link href={`/portfolio/${folder.uuid}`} className="block space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-purple-50 text-[#7c3aed]">
                    <FolderOpen className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-slate-800 truncate">{folder.name}</h3>
                    <p className="text-xs text-slate-500">
                      {folder.file_count ?? 0} files · {formatBytes(folder.total_size ?? 0)}
                    </p>
                  </div>
                </div>
                {folder.is_shared && (
                  <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                    Shared
                  </span>
                )}
              </div>
              {folder.description && (
                <p className="text-sm text-slate-500 line-clamp-2">{folder.description}</p>
              )}
            </Link>

            <div className="mt-4 flex gap-2">
              {onShare && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="rounded-xl h-8"
                  onClick={() => onShare(folder)}
                >
                  <Share2 className="mr-1 size-3.5" />
                  Share
                </Button>
              )}
              {onDelete && !folder.booking_id && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="rounded-xl h-8 text-rose-600 border-rose-100"
                  onClick={() => onDelete(folder.id)}
                >
                  <Trash2 className="mr-1 size-3.5" />
                  Delete
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
