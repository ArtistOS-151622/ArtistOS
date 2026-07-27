import React from "react"
import { AlertTriangle, HelpCircle, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

type ConfirmDialogProps = {
  open: boolean
  title: string
  description: string
  icon?: React.ReactNode
  confirmText?: string
  cancelText?: string
  confirmVariant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  onConfirm: () => void
  onCancel?: () => void
}

export function ConfirmDialog({
  open,
  title,
  description,
  icon,
  confirmText = "Confirm",
  cancelText = "Cancel",
  confirmVariant = "destructive",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null

  const isDestructive = confirmVariant === "destructive"
  const defaultIcon = isDestructive ? (
    <Trash2 className="size-5 text-rose-600" />
  ) : (
    <HelpCircle className="size-5 text-[#7c3aed]" />
  )
  const iconContainerStyle = isDestructive
    ? "bg-rose-50 border-rose-100/60 text-rose-600"
    : "bg-purple-50 border-purple-100/60 text-[#7c3aed]"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-[2px] p-4 sm:p-6 animate-in fade-in duration-200">
      <Card
        role="dialog"
        aria-modal="true"
        className="flex w-full max-w-md flex-col rounded-[1.75rem] border border-slate-200/80 bg-white shadow-2xl overflow-hidden"
      >
        {/* Header - White background with Icon */}
        <div className="flex shrink-0 items-start gap-3.5 border-b border-slate-100 bg-white p-5 sm:px-6 sm:py-5">
          <span className={`flex size-10 shrink-0 items-center justify-center rounded-2xl border shadow-xs ${iconContainerStyle}`}>
            {icon ?? defaultIcon}
          </span>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-slate-900 leading-snug">{title}</h2>
            <p className="mt-1 text-sm text-slate-500 leading-normal">{description}</p>
          </div>
        </div>

        {/* Footer - White background for buttons */}
        <div className="flex shrink-0 items-center justify-end gap-3 border-t border-slate-100 bg-white p-4 sm:px-6 sm:py-4">
          {cancelText && onCancel ? (
            <Button
              variant="outline"
              className="h-10 rounded-xl border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              onClick={onCancel}
            >
              {cancelText}
            </Button>
          ) : null}
          <Button
            variant={confirmVariant}
            className="h-10 rounded-xl"
            onClick={onConfirm}
          >
            {confirmText}
          </Button>
        </div>
      </Card>
    </div>
  )
}

