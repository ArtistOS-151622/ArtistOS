"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { MessageSquare, Plus, RefreshCw, Trash2, Send, ChevronDown } from "lucide-react"
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem } from "@/components/ui/dropdown-menu"
import { ConfirmDialog } from "@/components/common/shared/confirm-dialog"
import { toast } from "sonner"
import { PageHeader } from "@/components/common/dashboard/dashboard-header-context"
import { Card, CardContent } from "@/components/ui/card"
import { Button, buttonVariants } from "@/components/ui/button"

type Template = {
  id: number
  title: string
  content: string
  language: string
  image_url: string | null
  user_id: number | null
}

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
      if (res.ok) {
        setTemplates(data.templates || [])
      }
    } catch (error) {
      console.error("Failed to load templates", error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadTemplates()
  }, [loadTemplates])

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      const res = await fetch(`/api/whatsapp/templates/${deleteId}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success("Template deleted")
        loadTemplates()
      } else {
        toast.error("Failed to delete template")
      }
    } catch (e) {
      toast.error("Failed to delete template")
    } finally {
      setDeleteId(null)
    }
  }

  const filteredTemplates = useMemo(() => {
    if (filterLang === "All") return templates
    return templates.filter(t => t.language === filterLang)
  }, [templates, filterLang])

  return (
    <>
      <PageHeader title="WhatsApp Broadcasts" />
      <div className="mx-auto w-full max-w-5xl px-4 md:px-8 space-y-6 pb-12">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">Message Templates</h2>
            <p className="text-muted-foreground mt-1 text-sm">Create templates and send manual broadcast messages to your customers.</p>
          </div>
          <div className="flex flex-wrap gap-2 items-center w-full md:w-auto">
            <DropdownMenu>
              <DropdownMenuTrigger className={buttonVariants({ variant: "outline", className: "h-10 rounded-xl px-4 flex gap-2 font-normal border-slate-200" })}>
                {filterLang === "All" ? "All Languages" : filterLang} <ChevronDown className="size-4 text-slate-500" />
              </DropdownMenuTrigger>
              <DropdownMenuContent className="rounded-xl">
                <DropdownMenuRadioGroup value={filterLang} onValueChange={setFilterLang}>
                  <DropdownMenuRadioItem value="All">All Languages</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="English">English</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="Hindi">Hindi</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="Gujarati">Gujarati</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="outline" size="sm" onClick={loadTemplates} className="rounded-xl h-10">
              <RefreshCw className="mr-2 size-4" /> Refresh
            </Button>
            <Button onClick={() => router.push("/broadcasts/create")} className="rounded-xl h-10 bg-[#7c3aed] text-white hover:bg-[#6d28d9]">
              <Send className="mr-2 size-4" /> Start Broadcast
            </Button>
          </div>
        </div>

        {loading ? (
          <Card className="rounded-[1.75rem] border-slate-100 bg-white/90 shadow-md shadow-purple-950/5 overflow-hidden w-full">
            <CardContent className="p-0 flex justify-center py-12 text-slate-400">
              <RefreshCw className="size-6 animate-spin" />
            </CardContent>
          </Card>
        ) : filteredTemplates.length === 0 ? (
          <Card className="rounded-[1.75rem] border-slate-100 bg-white/90 shadow-md shadow-purple-950/5 overflow-hidden w-full">
            <CardContent className="p-0 text-center py-16 px-4">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-purple-50 mb-4">
                <MessageSquare className="size-10 text-[#7c3aed]/50" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">No templates yet</h3>
              <p className="text-slate-500 mt-2 mb-6 max-w-md mx-auto">
                Create your first message template to start sending broadcasts.
              </p>
              <Button onClick={() => router.push("/broadcasts/create")} className="rounded-xl bg-[#7c3aed] text-white hover:bg-[#6d28d9]">
                <Plus className="mr-2 size-4" /> Create Broadcast
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTemplates.map((template) => (
              <Card key={template.id} className="rounded-2xl border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow duration-200 flex flex-col h-full">
                <CardContent className="p-5 flex flex-col h-full flex-grow">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex flex-col gap-1.5">
                      <h3 className="font-semibold text-slate-900 line-clamp-1">{template.title}</h3>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500 font-medium">{template.language}</span>
                        {template.user_id === null ? (
                          <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">System</span>
                        ) : (
                          <span className="inline-flex items-center rounded-md bg-purple-50 px-2 py-0.5 text-[10px] font-medium text-purple-700 ring-1 ring-inset ring-purple-700/10">Custom</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex-grow mb-5">
                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 h-full">
                      <p className="text-sm text-slate-600 line-clamp-4 whitespace-pre-wrap font-sans">
                        {template.content}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-auto pt-4 border-t border-slate-100">
                    <Button 
                      variant="default" 
                      className="w-full rounded-xl bg-[#7c3aed] text-white hover:bg-[#6d28d9]" 
                      onClick={() => router.push(`/broadcasts/create?template=${template.id}`)}
                    >
                      Use Template
                    </Button>
                    {template.user_id !== null && (
                      <Button 
                        variant="outline" 
                        onClick={() => setDeleteId(template.id)}
                        className="rounded-xl px-3 border-rose-200 text-rose-500 hover:text-rose-600 hover:bg-rose-50 shrink-0"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
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
