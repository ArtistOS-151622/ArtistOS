"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import {
  MessageSquare, Plus, RefreshCw, Trash2, Send,
  ChevronDown, Globe, Sparkles, Zap,
} from "lucide-react"
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuRadioGroup, DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu"
import { ConfirmDialog } from "@/components/common/shared/confirm-dialog"
import { toast } from "sonner"
import { PageHeader, HeaderPortal } from "@/components/common/dashboard/dashboard-header-context"
import { Button, buttonVariants } from "@/components/ui/button"

type Template = {
  id: number
  title: string
  content: string
  language: string
  image_url: string | null
  user_id: number | null
}

const LANG_OPTIONS = ["All", "English", "Hindi", "Gujarati"]

export default function BroadcastsDashboardPage() {
  const router = useRouter()
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [filterLang, setFilterLang] = useState<string>("All")

  const loadTemplates = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/whatsapp/templates")
      const data = await res.json()
      if (res.ok) setTemplates(data.templates || [])
    } catch {
      /* silent */
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadTemplates() }, [loadTemplates])

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      const res = await fetch(`/api/whatsapp/templates/${deleteId}`, { method: "DELETE" })
      if (res.ok) {
        toast.success("Template deleted")
        loadTemplates()
      } else {
        toast.error("Failed to delete template")
      }
    } catch {
      toast.error("Failed to delete template")
    } finally {
      setDeleteId(null)
    }
  }

  const filteredTemplates = useMemo(() => {
    if (filterLang === "All") return templates
    return templates.filter(t => t.language === filterLang)
  }, [templates, filterLang])

  const langLabel = filterLang === "All" ? "All Languages" : filterLang

  return (
    <>
      <PageHeader title="Broadcasts" backLink="/customers" />

      {/* Inject header actions */}
      <HeaderPortal
        actions={
          <div className="flex items-center gap-2">
            {/* Language filter */}
            <DropdownMenu>
              <DropdownMenuTrigger
                className={buttonVariants({
                  variant: "outline",
                  className: "h-9 rounded-xl px-3 gap-1.5 font-normal border-slate-200 text-sm",
                })}
              >
                <Globe className="size-3.5 text-slate-400" />
                <span className="hidden sm:inline">{langLabel}</span>
                <ChevronDown className="size-3.5 text-slate-400" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-xl">
                <DropdownMenuRadioGroup value={filterLang} onValueChange={setFilterLang}>
                  {LANG_OPTIONS.map(l => (
                    <DropdownMenuRadioItem key={l} value={l}>
                      {l === "All" ? "All Languages" : l}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Refresh */}
            <Button
              variant="outline"
              size="sm"
              onClick={loadTemplates}
              disabled={loading}
              className="h-9 rounded-xl border-slate-200 px-3"
            >
              <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
              <span className="ml-1.5 hidden sm:inline">Refresh</span>
            </Button>

            {/* Start Broadcast */}
            <Button
              onClick={() => router.push("/customers/broadcasts/create")}
              className="h-9 rounded-xl bg-[#7c3aed] text-white hover:bg-[#6d28d9] px-4 shadow-md shadow-purple-900/20"
            >
              <Send className="mr-1.5 size-3.5" />
              <span className="hidden sm:inline">Start Broadcast</span>
              <span className="sm:hidden">Broadcast</span>
            </Button>
          </div>
        }
      />

      <div className="space-y-5 pb-12">
        {/* Stats / hero banner */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#5b21b6] via-[#7c3aed] to-[#a855f7] p-5 sm:p-6">
          <div className="pointer-events-none absolute -top-8 -right-8 size-40 rounded-full bg-white/5" />
          <div className="pointer-events-none absolute -bottom-4 left-1/4 size-28 rounded-full bg-white/5" />
          <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Zap className="size-4 text-yellow-300" />
                <span className="text-white/70 text-xs font-semibold uppercase tracking-wider">WhatsApp Broadcasts</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white">Message Templates</h2>
              <p className="mt-0.5 text-white/60 text-sm">
                {templates.length} template{templates.length !== 1 ? "s" : ""} available
                {filterLang !== "All" && ` · ${filteredTemplates.length} in ${filterLang}`}
              </p>
            </div>
            <div className="flex gap-3">
              <div className="rounded-xl bg-white/10 border border-white/10 px-4 py-3 text-center min-w-[72px]">
                <p className="text-2xl font-bold text-white">{templates.filter(t => t.user_id === null).length}</p>
                <p className="text-white/55 text-[10px] font-medium uppercase tracking-wide mt-0.5">System</p>
              </div>
              <div className="rounded-xl bg-white/10 border border-white/10 px-4 py-3 text-center min-w-[72px]">
                <p className="text-2xl font-bold text-white">{templates.filter(t => t.user_id !== null).length}</p>
                <p className="text-white/55 text-[10px] font-medium uppercase tracking-wide mt-0.5">Custom</p>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="flex flex-col items-center gap-3 text-slate-400">
              <RefreshCw className="size-6 animate-spin text-violet-500" />
              <p className="text-sm">Loading templates…</p>
            </div>
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
            <div className="flex flex-col items-center py-16 px-6 text-center">
              <div className="flex size-16 items-center justify-center rounded-2xl bg-violet-50 mb-4">
                <MessageSquare className="size-8 text-violet-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">
                {filterLang !== "All" ? `No ${filterLang} templates` : "No templates yet"}
              </h3>
              <p className="text-slate-500 mt-2 mb-6 max-w-sm text-sm">
                {filterLang !== "All"
                  ? `You don't have any templates in ${filterLang}. Try a different language or create a new one.`
                  : "Create your first message template to start sending broadcasts to your customers."}
              </p>
              <Button
                onClick={() => router.push("/customers/broadcasts/create")}
                className="rounded-xl bg-[#7c3aed] text-white hover:bg-[#6d28d9]"
              >
                <Plus className="mr-2 size-4" />
                Create Template
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTemplates.map((template) => {
              const isSystem = template.user_id === null

              return (
                <div
                  key={template.id}
                  className="group relative flex flex-col rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-purple-950/8 hover:-translate-y-0.5 transition-all duration-300 overflow-hidden"
                >
                  {/* Top accent bar */}
                  <div className="h-1 w-full bg-gradient-to-r from-[#7c3aed] to-[#a855f7]" />

                  {/* Card header */}
                  <div className="flex items-start gap-3 px-4 pt-4 pb-3">
                    {/* Language avatar */}
                    <div className="shrink-0 flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#7c3aed] to-[#a855f7] shadow-sm">
                      <span className="text-white text-[10px] font-bold tracking-tight">
                        {template.language.slice(0, 2).toUpperCase()}
                      </span>
                    </div>

                    {/* Title & badges */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-900 text-sm leading-snug line-clamp-1">{template.title}</h3>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <span className="text-[10px] text-slate-400 font-medium">{template.language}</span>
                        {isSystem ? (
                          <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-bold text-slate-500 tracking-wide uppercase">
                            System
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-violet-50 px-2 py-0.5 text-[9px] font-bold text-violet-600 tracking-wide uppercase">
                            <Sparkles className="size-2.5" />
                            Custom
                          </span>
                        )}
                        {template.image_url && (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-violet-50 px-2 py-0.5 text-[9px] font-bold text-violet-500 tracking-wide uppercase">
                            📎 Image
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Delete (custom only) */}
                    {!isSystem && (
                      <button
                        onClick={() => setDeleteId(template.id)}
                        className="shrink-0 flex size-7 items-center justify-center rounded-lg text-slate-200 hover:text-rose-500 hover:bg-rose-50 transition-colors opacity-0 group-hover:opacity-100"
                        title="Delete template"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    )}
                  </div>

                  {/* WhatsApp-style message bubble */}
                  <div className="flex-1 px-4 pb-3">
                    <div className="relative rounded-2xl rounded-tl-sm bg-[#f0fdf4] border border-emerald-100/80 px-3.5 py-3 shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)]">
                      <p className="text-[11.5px] text-slate-700 line-clamp-5 whitespace-pre-wrap leading-[1.65] font-normal">
                        {template.content}
                      </p>
                      <p className="text-[9px] text-slate-400 text-right mt-1.5 select-none">
                        12:00 PM ✓✓
                      </p>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="mx-4 border-t border-slate-50" />

                  {/* CTA */}
                  <div className="px-4 py-3">
                    <Button
                      className="w-full rounded-xl h-9 text-sm font-semibold text-white bg-[#7c3aed] hover:bg-[#6d28d9] shadow-sm shadow-purple-900/15 transition-all"
                      onClick={() => router.push(`/customers/broadcasts/create?template=${template.id}`)}
                    >
                      <Send className="mr-1.5 size-3.5" />
                      Use Template
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>


      <ConfirmDialog
        open={!!deleteId}
        title="Delete Template?"
        description="Are you sure you want to delete this custom template? This action cannot be undone."
        confirmText="Delete"
        onCancel={() => setDeleteId(null)}
        onConfirm={handleDelete}
      />
    </>
  )
}
