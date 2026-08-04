"use client"

import { useState } from "react"
import { Copy, Loader2, Share2 } from "lucide-react"

import { AppModal } from "@/components/common/shared/app-modal"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import type { PortfolioFolderWithStats } from "@/lib/portfolio/types"

type PortfolioShareModalProps = {
  open: boolean
  onClose: () => void
  folder: PortfolioFolderWithStats | null
  onUpdated?: () => void
}

export function PortfolioShareModal({
  open,
  onClose,
  folder,
  onUpdated,
}: PortfolioShareModalProps) {
  const [loading, setLoading] = useState(false)
  const [shareUrl, setShareUrl] = useState<string | null>(folder?.share_url ?? null)
  const [isShared, setIsShared] = useState(folder?.is_shared ?? false)

  async function toggleShare(enable: boolean) {
    if (!folder) return
    setLoading(true)
    try {
      const res = await fetch(`/api/portfolio/folders/${folder.id}/toggle-share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_shared: enable }),
      })
      const json = await res.json()
      if (!json.status) throw new Error(json.message)

      setIsShared(enable)
      setShareUrl(json.data.share_url)
      onUpdated?.()
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AppModal
      open={open}
      icon={<Share2 className="size-5" />}
      onClose={onClose}
      title="Share Folder"
      description={folder ? `Manage public access for "${folder.name}"` : ""}
      footer={
        <Button variant="outline" className="h-10 rounded-xl border-slate-200 bg-white hover:bg-slate-50 text-slate-700" onClick={onClose}>
          Done
        </Button>
      }
    >
      {folder && (
        <div className="space-y-5">
          <div className="flex items-center justify-between rounded-2xl border border-slate-100 p-4">
            <Label htmlFor="share-toggle" className="font-medium">
              Public sharing
            </Label>
            <Switch
              id="share-toggle"
              checked={isShared}
              disabled={loading}
              onCheckedChange={(checked) => void toggleShare(checked)}
            />
          </div>

          {isShared && shareUrl && (
            <div className="space-y-2">
              <Label className="text-sm text-slate-600">Share link</Label>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={
                    typeof window !== "undefined"
                      ? new URL(new URL(shareUrl).pathname, window.location.origin).toString()
                      : shareUrl
                  }
                  className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => {
                    const formatted = typeof window !== "undefined"
                      ? new URL(new URL(shareUrl).pathname, window.location.origin).toString()
                      : shareUrl;
                    navigator.clipboard.writeText(formatted);
                  }}
                >
                  <Copy className="size-4" />
                </Button>
              </div>
              <p className="text-xs text-slate-500">
                Disabling sharing rotates the link — old URLs stop working.
              </p>
            </div>
          )}

          {loading && (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Loader2 className="size-4 animate-spin" /> Updating…
            </div>
          )}
        </div>
      )}
    </AppModal>
  )
}
