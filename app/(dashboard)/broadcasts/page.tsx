"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { MessageSquare, Plus, RefreshCw, Play, Pause, AlertCircle, CheckCircle2, Trash2 } from "lucide-react"
import { ConfirmDialog } from "@/components/common/shared/confirm-dialog"
import { toast } from "sonner"
import { PageHeader } from "@/components/common/dashboard/dashboard-header-context"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

type Campaign = {
  id: number
  name: string
  status: string
  created_at: string
  messages: [{ count: number }]
}

export default function BroadcastsDashboardPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteId, setDeleteId] = useState<number | null>(null)

  const loadCampaigns = useCallback(async () => {
    try {
      const res = await fetch("/api/whatsapp/campaigns")
      const data = await res.json()
      if (res.ok) {
        setCampaigns(data.campaigns || [])
      }
    } catch (error) {
      console.error("Failed to load campaigns", error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadCampaigns()
  }, [loadCampaigns])

  useEffect(() => {
    const interval = setInterval(() => {
      loadCampaigns()
    }, 5000)
    return () => clearInterval(interval)
  }, [loadCampaigns])

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      const res = await fetch(`/api/whatsapp/campaigns/${deleteId}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success("Campaign deleted")
        loadCampaigns()
      } else {
        toast.error("Failed to delete campaign")
      }
    } catch (e) {
      toast.error("Failed to delete campaign")
    } finally {
      setDeleteId(null)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'RUNNING':
        return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100"><Play className="size-3 mr-1" /> Running</Badge>
      case 'PAUSED':
        return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100"><Pause className="size-3 mr-1" /> Paused</Badge>
      case 'COMPLETED':
        return <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-100"><CheckCircle2 className="size-3 mr-1" /> Completed</Badge>
      case 'FAILED':
        return <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-100"><AlertCircle className="size-3 mr-1" /> Failed</Badge>
      default:
        return <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-100">{status}</Badge>
    }
  }

  return (
    <>
      <PageHeader title="Broadcast Campaigns" />
      <div className="mx-auto max-w-5xl space-y-6 pb-12">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">Campaigns</h2>
            <p className="text-muted-foreground mt-1 text-sm">Manage and track your WhatsApp bulk messaging campaigns.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={loadCampaigns} className="rounded-xl h-10">
              <RefreshCw className="mr-2 size-4" /> Refresh
            </Button>
            <Link href="/broadcasts/create" passHref>
              <Button className="rounded-xl h-10 bg-[#7c3aed] text-white hover:bg-[#6d28d9]">
                <Plus className="mr-2 size-4" /> New Broadcast
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
            ) : campaigns.length === 0 ? (
              <div className="text-center py-16 px-4">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-purple-50 mb-4">
                  <MessageSquare className="size-10 text-[#7c3aed]/50" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900">No campaigns yet</h3>
                <p className="text-slate-500 mt-2 mb-6 max-w-md mx-auto">
                  Create your first broadcast campaign to send messages to your customers safely and efficiently.
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
                      <th className="px-6 py-4 font-semibold rounded-tl-[1.75rem]">Campaign Name</th>
                      <th className="px-6 py-4 font-semibold">Status</th>
                      <th className="px-6 py-4 font-semibold">Recipients</th>
                      <th className="px-6 py-4 font-semibold">Date Created</th>
                      <th className="px-6 py-4 font-semibold rounded-tr-[1.75rem]">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {campaigns.map((campaign) => (
                      <tr key={campaign.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 font-medium text-slate-900">
                          {campaign.name}
                        </td>
                        <td className="px-6 py-4">
                          {getStatusBadge(campaign.status)}
                        </td>
                        <td className="px-6 py-4 text-slate-500">
                          {campaign.messages?.[0]?.count || 0} customers
                        </td>
                        <td className="px-6 py-4 text-slate-500 whitespace-nowrap">
                          {new Date(campaign.created_at).toLocaleString(undefined, { 
                            year: 'numeric', month: 'short', day: 'numeric', 
                            hour: '2-digit', minute: '2-digit' 
                          })}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <Link href={`/broadcasts/${campaign.id}`} className="text-[#7c3aed] font-medium hover:underline text-sm">
                              View Details
                            </Link>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => setDeleteId(campaign.id)}
                              className="h-8 w-8 p-0 text-rose-500 hover:text-rose-600 hover:bg-rose-50 rounded-full"
                            >
                              <Trash2 className="size-4" />
                            </Button>
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
        title="Delete Campaign?"
        description="Are you sure you want to delete this broadcast campaign? This action cannot be undone and will stop any pending messages."
        confirmText="Delete"
        onCancel={() => setDeleteId(null)}
        onConfirm={handleDelete}
      />
    </>
  )
}
