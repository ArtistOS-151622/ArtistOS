"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Loader2, Share2, Trash2 } from "lucide-react"
import { useParams } from "next/navigation"

import { PageHeader } from "@/components/common/dashboard/dashboard-header-context"
import { ConfirmDialog } from "@/components/common/shared/confirm-dialog"
import { PortfolioFileGrid } from "@/components/portfolio/portfolio-file-grid"
import { PortfolioLightbox } from "@/components/portfolio/portfolio-lightbox"
import { PortfolioShareModal } from "@/components/portfolio/portfolio-share-modal"
import { PortfolioUploader } from "@/components/portfolio/portfolio-uploader"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { PortfolioFileWithUrl, PortfolioFolderWithStats } from "@/lib/portfolio/types"

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

  const loadFolder = useCallback(async () => {
    setLoading(true)
    try {
      const foldersRes = await fetch("/api/portfolio/folders")
      const foldersJson = await foldersRes.json()
      const match = (foldersJson.data?.folders ?? []).find(
        (f: PortfolioFolderWithStats) => f.uuid === folderUuid
      )
      setFolder(match ?? null)

      if (match) {
        const filesRes = await fetch(`/api/portfolio/folders?folder_id=${match.id}`)
        const filesJson = await filesRes.json()
        if (filesJson.status) setFiles(filesJson.data.files)
      }
    } finally {
      setLoading(false)
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

  if (loading) {
    return (
      <>
        <PageHeader title="Portfolio" />
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader2 className="size-8 animate-spin text-[#7c3aed]" />
        </div>
      </>
    )
  }

  if (!folder) {
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
      <PageHeader title={folder.name} />
      <div className="space-y-6 pb-12">
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/portfolio"
            className="inline-flex h-10 items-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium hover:bg-slate-50"
          >
            <ArrowLeft className="mr-2 size-4" />All Folders
          </Link>
          <Button variant="outline" className="rounded-2xl h-10" onClick={() => setShareOpen(true)}>
            <Share2 className="mr-2 size-4" />Share
          </Button>
          {selectedIds.length > 0 && (
            <>
              <Button variant="outline" className="rounded-2xl h-10" onClick={() => void handleBulkDownload()}>
                Download ({selectedIds.length})
              </Button>
              <Button
                variant="outline"
                className="rounded-2xl h-10 text-rose-600"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="mr-2 size-4" />Delete ({selectedIds.length})
              </Button>
            </>
          )}
        </div>

        <Card className="rounded-[1.75rem] border-slate-100 shadow-md shadow-purple-950/5">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="text-lg">Files</CardTitle>
            <PortfolioUploader folderId={folder.id} onUploaded={loadFolder} label="Upload File" />
          </CardHeader>
          <CardContent>
            <PortfolioFileGrid
              files={files}
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
