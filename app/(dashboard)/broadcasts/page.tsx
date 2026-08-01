"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { MessageSquare, Plus, RefreshCw, Trash2, Send } from "lucide-react"
import { ConfirmDialog } from "@/components/common/shared/confirm-dialog"
import { toast } from "sonner"
import { PageHeader } from "@/components/common/dashboard/dashboard-header-context"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

type Template = {
  id: number
  title: string
  content: string
  image_url: string | null
  user_id: number | null
}

export default function BroadcastsDashboardPage() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteId, setDeleteId] = useState<number | null>(null)

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

  return (
    <>
      <PageHeader title="WhatsApp Broadcasts" />
      <div className="mx-auto max-w-5xl space-y-6 pb-12">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">Message Templates</h2>
            <p className="text-muted-foreground mt-1 text-sm">Create templates and send manual broadcast messages to your customers.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={loadTemplates} className="rounded-xl h-10">
              <RefreshCw className="mr-2 size-4" /> Refresh
            </Button>
            <Link href="/broadcasts/create" passHref>
              <Button className="rounded-xl h-10 bg-[#7c3aed] text-white hover:bg-[#6d28d9]">
                <Send className="mr-2 size-4" /> Start Broadcast
              </Button>
            </Link>
          </div>
        </div>

        <Card className="rounded-[1.75rem] border-slate-100 bg-white/90 shadow-md shadow-purple-950/5">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex justify-center py-12 text-slate-400">
                <RefreshCw className="size-6 animate-spin" />
              </div>
            ) : templates.length === 0 ? (
              <div className="text-center py-16 px-4">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-purple-50 mb-4">
                  <MessageSquare className="size-10 text-[#7c3aed]/50" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900">No templates yet</h3>
                <p className="text-slate-500 mt-2 mb-6 max-w-md mx-auto">
                  Create your first message template to start sending broadcasts.
                </p>
                <Link href="/broadcasts/create" passHref>
                  <Button className="rounded-xl bg-[#7c3aed] text-white hover:bg-[#6d28d9]">
                    <Plus className="mr-2 size-4" /> Create Broadcast
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-slate-500 bg-slate-50 border-b border-slate-100 uppercase">
                    <tr>
                      <th className="px-6 py-4 font-semibold rounded-tl-[1.75rem]">Template Name</th>
                      <th className="px-6 py-4 font-semibold">Content Snippet</th>
                      <th className="px-6 py-4 font-semibold">Type</th>
                      <th className="px-6 py-4 font-semibold rounded-tr-[1.75rem]">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {templates.map((template) => (
                      <tr key={template.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 font-medium text-slate-900">
                          {template.title}
                        </td>
                        <td className="px-6 py-4 text-slate-500 max-w-xs truncate">
                          {template.content.substring(0, 50)}...
                        </td>
                        <td className="px-6 py-4">
                          {template.user_id === null ? (
                            <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">System</span>
                          ) : (
                            <span className="inline-flex items-center rounded-md bg-purple-50 px-2 py-1 text-xs font-medium text-purple-700 ring-1 ring-inset ring-purple-700/10">Custom</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <Link href={`/broadcasts/create?template=${template.id}`}>
                              <Button variant="outline" size="sm" className="h-8 text-xs rounded-xl">
                                Use
                              </Button>
                            </Link>
                            {template.user_id !== null && (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => setDeleteId(template.id)}
                                className="h-8 w-8 p-0 text-rose-500 hover:text-rose-600 hover:bg-rose-50 rounded-full"
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
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
