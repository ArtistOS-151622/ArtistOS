"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Download, FolderOpen, HardDrive, LayoutGrid, List, Loader2, Search, Share2, Trash2, X } from "lucide-react"
import { useParams } from "next/navigation"

import { HeaderPortal, PageHeader } from "@/components/common/dashboard/dashboard-header-context"
import { ConfirmDialog } from "@/components/common/shared/confirm-dialog"
import { PortfolioFileGrid } from "@/components/portfolio/portfolio-file-grid"
import { PortfolioLightbox } from "@/components/portfolio/portfolio-lightbox"
import { PortfolioShareModal } from "@/components/portfolio/portfolio-share-modal"
import { PortfolioUploader } from "@/components/portfolio/portfolio-uploader"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import type { PortfolioFileWithUrl, PortfolioFolderWithStats, QuotaInfo } from "@/lib/portfolio/types"
import { cn } from "@/lib/utils"

export default function PortfolioFolderPage() {
  const params = useParams()
  const folderUuid = params.folderUuid as string

  const [folder, setFolder] = useState<PortfolioFolderWithStats | null>(null)
  const [files, setFiles] = useState<PortfolioFileWithUrl[]>([])
  const [loading, setLoading] = useState(true)
  const [previewFile, setPreviewFile] = useState<PortfolioFileWithUrl | null>(null)
  const [shareOpen, setShareOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [search, setSearch] = useState("")
  const [quota, setQuota] = useState<QuotaInfo | null>(null)

  const loadFolder = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true)
    try {
      const [foldersRes, storageRes] = await Promise.all([
        fetch("/api/portfolio/folders"),
        fetch("/api/portfolio/storage-info"),
      ])
      const foldersJson = await foldersRes.json()
      const storageJson = await storageRes.json()

      const match = (foldersJson.data?.folders ?? []).find(
        (f: PortfolioFolderWithStats) => f.uuid === folderUuid
      )
      setFolder(match ?? null)

      if (storageJson.status) setQuota(storageJson.data.quota)

      if (match) {
        const filesRes = await fetch(`/api/portfolio/folders?folder_id=${match.id}`)
        const filesJson = await filesRes.json()
        if (filesJson.status) setFiles(filesJson.data.files)
      }
    } finally {
      if (!isSilent) setLoading(false)
    }
  }, [folderUuid])

  useEffect(() => {
    void loadFolder()
  }, [loadFolder])

  async function handleDeleteFile(id: number) {
    await fetch(`/api/portfolio/files/${id}`, { method: "DELETE" })
    void loadFolder()
  }

  async function handleBulkDelete() {
    await fetch("/api/portfolio/files/bulk-delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: selectedIds }),
    })
    setSelectedIds([])
    setDeleteOpen(false)
    void loadFolder()
  }

  async function handleBulkDownload() {
    const res = await fetch("/api/portfolio/files/bulk-download", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: selectedIds.length ? selectedIds : files.map((f) => f.id) }),
    })
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${folder?.name ?? "portfolio"}.zip`
    a.click()
    URL.revokeObjectURL(url)
  }

  const filteredFiles = files.filter((f) =>
    f.original_name.toLowerCase().includes(search.toLowerCase().trim())
  )

  if (!folder && !loading) {
    return (
      <>
        <PageHeader title="Portfolio" />
        <div className="text-center py-20">
          <p className="text-slate-500 mb-4">Folder not found</p>
          <Link
            href="/portfolio"
            className="inline-flex items-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50"
          >
            <ArrowLeft className="mr-2 size-4" />Back to Portfolio
          </Link>
        </div>
      </>
    )
  }

  return (
    <>
      <PageHeader title="Folder Details" />

      {/* Storage Pill — Desktop Main Header (via HeaderPortal) */}
      <HeaderPortal
        actions={
          quota ? (
            <div className="hidden md:flex items-center gap-2 h-10 sm:h-11 px-3.5 rounded-2xl border border-slate-200/80 bg-white hover:bg-slate-50 hover:border-purple-200 transition-all shadow-xs cursor-default">
              <HardDrive className="size-4 text-[#7c3aed] shrink-0" />
              <div className="flex flex-col items-start min-w-[80px]">
                <div className="flex items-center justify-between w-full">
                  <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wide">Storage</span>
                  <span className="text-[10px] font-black text-[#7c3aed]">
                    {Math.round((quota.used_bytes / quota.total_bytes) * 100)}%
                  </span>
                </div>
                <div className="w-full h-1 rounded-full bg-slate-100 overflow-hidden mt-0.5">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#7c3aed] to-indigo-600 transition-all"
                    style={{ width: `${Math.min(100, Math.round((quota.used_bytes / quota.total_bytes) * 100))}%` }}
                  />
                </div>
                <span className="text-[9px] text-slate-400 font-semibold mt-0.5">
                  {quota.used_bytes_human} / {quota.total_bytes_human}
                </span>
              </div>
            </div>
          ) : null
        }
      />

      {/* Top Header Card - Mobile Responsive Layout */}
      <div className="rounded-2xl sm:rounded-[1.75rem] border border-slate-200/80 bg-white p-3 sm:p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 mb-6">
        {/* Left Side: Circular Back Arrow, Folder Name & Meta */}
        <div className="flex items-center justify-between sm:justify-start gap-3 min-w-0 w-full md:w-auto">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
            <Link
              href="/portfolio"
              className="size-9 sm:size-10 rounded-full border border-slate-200/80 bg-white hover:bg-slate-50 flex items-center justify-center shrink-0 shadow-2xs text-slate-700 transition-colors"
              title="Back to All Folders"
            >
              <ArrowLeft className="size-4" />
            </Link>
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <h2
                className="text-base sm:text-xl font-extrabold text-slate-900 truncate max-w-[130px] min-[380px]:max-w-[180px] sm:max-w-xs md:max-w-md"
                title={folder?.name ?? "Folder Details"}
              >
                {folder?.name ?? "Folder Details"}
              </h2>
              <span className="text-slate-300 font-light text-sm hidden sm:inline">|</span>
              <span className="text-xs sm:text-sm text-slate-500 font-semibold truncate shrink-0 hidden sm:inline">
                {files.length} items
              </span>
            </div>
          </div>

          {/* Storage Pill — Mobile Top Right */}
          {quota && (
            <div className="md:hidden shrink-0 flex items-center gap-1.5 h-9 px-2.5 rounded-xl border border-slate-200/80 bg-slate-50/80">
              <HardDrive className="size-3.5 text-[#7c3aed] shrink-0" />
              <div className="flex flex-col items-start min-w-[58px]">
                <div className="flex items-center justify-between w-full">
                  <span className="text-[8px] font-extrabold text-slate-500 uppercase tracking-wide">Storage</span>
                  <span className="text-[8px] font-black text-[#7c3aed]">
                    {Math.round((quota.used_bytes / quota.total_bytes) * 100)}%
                  </span>
                </div>
                <div className="w-full h-[3px] rounded-full bg-slate-200/80 overflow-hidden mt-0.5">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#7c3aed] to-indigo-600"
                    style={{ width: `${Math.min(100, Math.round((quota.used_bytes / quota.total_bytes) * 100))}%` }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Select All, Bulk Action Icons + Count Badge, View Switcher & Actions */}
        <div className="flex items-center justify-between md:justify-end gap-2 sm:gap-3 w-full md:w-auto border-t md:border-t-0 pt-2.5 md:pt-0 border-slate-100">
          {/* Select All Checkbox */}
          {files.length > 0 && (
            <label className="flex items-center gap-1.5 cursor-pointer text-xs sm:text-sm font-bold text-slate-700 select-none shrink-0">
              <input
                type="checkbox"
                checked={selectedIds.length === files.length}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedIds(files.map((f) => f.id))
                  } else {
                    setSelectedIds([])
                  }
                }}
                className="size-4 rounded border-slate-300 text-[#7c3aed] focus:ring-purple-500 cursor-pointer accent-[#7c3aed]"
              />
              <span>Select All</span>
            </label>
          )}

          {/* Controls Right Alignment Group */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 ml-auto md:ml-0">
            {/* Bulk Action Icon Bar with Counter Badge (Shown when files selected) */}
            {selectedIds.length > 0 && (
              <div className="relative flex items-center gap-1 bg-slate-50 border border-slate-200/80 rounded-xl p-1 shadow-2xs">
                {/* Download Icon Button */}
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  className="size-8 sm:size-9 rounded-lg border-slate-200 bg-white hover:bg-slate-100 text-blue-600 shadow-2xs"
                  onClick={() => void handleBulkDownload()}
                  title={`Download ${selectedIds.length} files`}
                >
                  <Download className="size-3.5 sm:size-4 text-blue-600" />
                </Button>

                {/* Delete Icon Button */}
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  className="size-8 sm:size-9 rounded-lg border-rose-200 bg-white hover:bg-rose-50 text-rose-500 shadow-2xs"
                  onClick={() => setDeleteOpen(true)}
                  title={`Delete ${selectedIds.length} files`}
                >
                  <Trash2 className="size-3.5 sm:size-4 text-rose-500" />
                </Button>

                {/* Deselect/Close Button with Badge Count on Top Right */}
                <div className="relative">
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="size-8 sm:size-9 rounded-lg border-slate-200 bg-white hover:bg-slate-100 text-slate-600 shadow-2xs"
                    onClick={() => setSelectedIds([])}
                    title="Deselect All"
                  >
                    <X className="size-3.5 sm:size-4 text-slate-600" />
                  </Button>

                  {/* Badge Count overlay on top-right of Close icon button */}
                  <span className="absolute -top-2 -right-2 bg-blue-600 text-white text-[9px] sm:text-[10px] font-black rounded-full size-4.5 sm:size-5 flex items-center justify-center shadow-md pointer-events-none border-2 border-white">
                    {selectedIds.length}
                  </span>
                </div>
              </div>
            )}

            {/* Grid / List View Switcher - Icon Only */}
            <div className="flex bg-slate-100/70 rounded-2xl p-1 h-9 sm:h-10 items-center border border-slate-200/60 shrink-0">
              <Button
                type="button"
                variant={viewMode === "grid" ? "default" : "ghost"}
                className="size-7 sm:size-8 rounded-xl flex items-center justify-center transition-all p-0"
                onClick={() => setViewMode("grid")}
                title="Grid View"
              >
                <LayoutGrid className="size-3.5 sm:size-4" />
              </Button>
              <Button
                type="button"
                variant={viewMode === "list" ? "default" : "ghost"}
                className="size-7 sm:size-8 rounded-xl flex items-center justify-center transition-all p-0"
                onClick={() => setViewMode("list")}
                title="List View"
              >
                <List className="size-3.5 sm:size-4" />
              </Button>
            </div>

            {/* Share Button: Primary if folder.is_shared is true, Outline if false */}
            <Button
              variant={folder?.is_shared ? "default" : "outline"}
              size="icon"
              className={cn(
                "size-9 sm:size-10 rounded-xl transition-all shadow-2xs",
                folder?.is_shared
                  ? "bg-[#7c3aed] text-white hover:bg-[#6d28d9] shadow-purple-600/20"
                  : "border-slate-200/80 bg-white text-slate-700 hover:bg-slate-50"
              )}
              onClick={() => setShareOpen(true)}
              title={folder?.is_shared ? "Shared Folder" : "Share Folder"}
            >
              <Share2 className={cn("size-4", folder?.is_shared ? "text-white" : "text-[#7c3aed]")} />
            </Button>


            {/* Desktop Only Inline Upload Button + Universal Floating FAB */}
            <PortfolioUploader folderId={folder?.id} onUploaded={() => void loadFolder(true)} label="Upload File" className="hidden md:inline-flex" />
          </div>
        </div>
      </div>

      <div className="space-y-6 pb-12">
        <Card className="rounded-2xl sm:rounded-[1.75rem] border border-slate-200/80 bg-white/90 shadow-md shadow-purple-950/[0.03] p-5 min-h-auto sm:min-h-[calc(100vh-8.5rem)] overflow-hidden">
          <CardContent className="p-0">
            <PortfolioFileGrid
              files={filteredFiles}
              loading={loading}
              viewMode={viewMode}
              onDelete={handleDeleteFile}
              onPreview={setPreviewFile}
              selectable
              selectedIds={selectedIds}
              onToggleSelect={(id) =>
                setSelectedIds((prev) =>
                  prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
                )
              }
            />
          </CardContent>
        </Card>
      </div>

      <PortfolioLightbox
        open={!!previewFile}
        onClose={() => setPreviewFile(null)}
        file={previewFile}
      />

      <PortfolioShareModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        folder={folder}
        onUpdated={loadFolder}
      />

      <ConfirmDialog
        open={deleteOpen}
        title="Delete selected files?"
        description="This will permanently remove the selected files from storage."
        confirmText="Delete"
        onCancel={() => setDeleteOpen(false)}
        onConfirm={() => void handleBulkDelete()}
      />
    </>
  )
}
