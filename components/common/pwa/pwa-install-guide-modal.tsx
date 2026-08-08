"use client"

import React, { useState } from "react"
import { Share, SquarePlus, CheckCircle2, Copy, Check, RefreshCw, Smartphone, Globe } from "lucide-react"

import { AppModal } from "@/components/common/shared/app-modal"
import { Button } from "@/components/ui/button"

type PwaInstallGuideModalProps = {
  open: boolean
  onClose: () => void
  isIosDevice?: boolean
}

export function PwaInstallGuideModal({ open, onClose, isIosDevice = true }: PwaInstallGuideModalProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <AppModal
      open={open}
      onClose={onClose}
      title={isIosDevice ? "Install ArtistOS on iOS" : "Install ArtistOS App"}
      description={
        isIosDevice
          ? "iOS requires adding to Home Screen via Safari Share menu."
          : "Follow browser instructions to install ArtistOS as an app."
      }
      icon={<Smartphone className="size-5 text-[#7c3aed]" />}
      maxWidth="max-w-md"
      footer={
        <div className="flex w-full items-center justify-between gap-2">
          {isIosDevice ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="rounded-xl border-purple-200 text-purple-700 hover:bg-purple-50"
            >
              {copied ? (
                <>
                  <Check className="mr-1.5 size-4 text-emerald-600" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="mr-1.5 size-4" />
                  Copy App Link
                </>
              )}
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.reload()}
              className="rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              <RefreshCw className="mr-1.5 size-4" />
              Refresh Page
            </Button>
          )}
          <Button
            onClick={onClose}
            className="rounded-xl bg-[#7c3aed] px-5 text-white hover:bg-[#6d28d9]"
          >
            Got it
          </Button>
        </div>
      }
    >
      {isIosDevice ? (
        <div className="space-y-4">
          <div className="rounded-2xl border border-purple-100 bg-purple-50/60 p-3.5 text-xs text-purple-900 leading-relaxed">
            <p className="font-semibold text-purple-950 mb-1 flex items-center gap-1.5 text-sm">
              <Globe className="size-4 text-purple-600" />
              Important for iOS Users:
            </p>
            Apple iOS does not allow 1-click install prompts in web pages. You can install ArtistOS in 3 easy steps using Safari&apos;s <strong>Share</strong> menu.
          </div>

          <div className="space-y-3">
            <div className="flex items-start gap-3.5 rounded-2xl border border-slate-100 bg-slate-50/80 p-3.5">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-purple-700 font-bold text-sm">
                1
              </div>
              <div className="flex-1 text-sm">
                <p className="font-semibold text-slate-900 flex items-center gap-1.5">
                  Tap the Share Icon
                  <Share className="size-4 text-purple-600 shrink-0" />
                </p>
                <p className="mt-0.5 text-xs text-slate-600 leading-relaxed">
                  Look at the bottom (or top) toolbar of Safari and tap the <strong>Share</strong> button (square with arrow up).
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 rounded-2xl border border-slate-100 bg-slate-50/80 p-3.5">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-purple-700 font-bold text-sm">
                2
              </div>
              <div className="flex-1 text-sm">
                <p className="font-semibold text-slate-900 flex items-center gap-1.5">
                  Select &quot;Add to Home Screen&quot;
                  <SquarePlus className="size-4 text-purple-600 shrink-0" />
                </p>
                <p className="mt-0.5 text-xs text-slate-600 leading-relaxed">
                  Scroll down the share options and tap <strong>Add to Home Screen</strong>.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 rounded-2xl border border-slate-100 bg-slate-50/80 p-3.5">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 font-bold text-sm">
                3
              </div>
              <div className="flex-1 text-sm">
                <p className="font-semibold text-slate-900 flex items-center gap-1.5">
                  Tap &quot;Add&quot;
                  <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                </p>
                <p className="mt-0.5 text-xs text-slate-600 leading-relaxed">
                  Tap <strong>Add</strong> in the top-right corner. ArtistOS will appear on your Home Screen like a native app!
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-amber-200/70 bg-amber-50/50 p-3 text-[11px] text-amber-900">
            <strong>Note:</strong> If you are using Chrome or another browser on iOS, open this URL in <strong>Safari</strong> for the best experience.
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3.5 rounded-2xl border border-slate-100 bg-slate-50/80 p-3.5">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-purple-700 font-bold text-sm">
                1
              </div>
              <div className="flex-1 text-sm">
                <p className="font-semibold text-slate-900">Check Browser Address Bar</p>
                <p className="mt-0.5 text-xs text-slate-600 leading-relaxed">
                  Look for an <strong>Install</strong> or <strong>Add App</strong> icon on the right side of your browser address bar.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 rounded-2xl border border-slate-100 bg-slate-50/80 p-3.5">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-purple-700 font-bold text-sm">
                2
              </div>
              <div className="flex-1 text-sm">
                <p className="font-semibold text-slate-900">Or Open Browser Menu (⋮)</p>
                <p className="mt-0.5 text-xs text-slate-600 leading-relaxed">
                  Click the three dots <strong>(⋮)</strong> in Chrome/Edge, then select <strong>Install ArtistOS...</strong> or <strong>Save and Share → Install App</strong>.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppModal>
  )
}
