"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, RefreshCw, CheckCircle2, Clock, AlertCircle } from "lucide-react"
import { PageHeader } from "@/components/common/dashboard/dashboard-header-context"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

type Message = {
  id: number
  status: string
  created_at: string
  sent_at: string | null
  error_message: string | null
  customers: {
    customer_name: string
    phone: string
  }
}

type CampaignDetails = {
  id: number
  name: string
  status: string
  created_at: string
  message_template: string
  image_url: string | null
  min_delay_sec: number
  max_delay_sec: number
  business_hours_only: boolean
  messages: Message[]
}

export default function BroadcastDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const [campaign, setCampaign] = useState<CampaignDetails | null>(null)
  const [loading, setLoading] = useState(true)

  const loadDetails = useCallback(async () => {
    try {
      const res = await fetch(`/api/whatsapp/campaigns/${params.id}`)
      if (res.ok) {
        const data = await res.json()
        setCampaign(data.campaign)
      }
    } catch (error) {
      console.error("Failed to load details", error)
    } finally {
      setLoading(false)
    }
  }, [params.id])

  const retryFailedMessages = async () => {
    try {
      const res = await fetch(`/api/whatsapp/campaigns/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "retry_failed" }),
      })
      if (res.ok) {
        await loadDetails()
      }
    } catch (error) {
      console.error("Failed to retry messages", error)
    }
  }

  useEffect(() => {
    loadDetails()
  }, [loadDetails])

  // Live polling
  useEffect(() => {
    const interval = setInterval(() => {
      loadDetails()
    }, 3000)
    return () => clearInterval(interval)
  }, [loadDetails])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SENT': return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100"><CheckCircle2 className="size-3 mr-1" /> Sent</Badge>
      case 'PENDING': return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100"><Clock className="size-3 mr-1" /> Pending</Badge>
      case 'RETRYING': return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100"><RefreshCw className="size-3 mr-1" /> Retrying</Badge>
      case 'FAILED': return <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-100"><AlertCircle className="size-3 mr-1" /> Failed</Badge>
      default: return <Badge className="bg-slate-100 text-slate-700">{status}</Badge>
    }
  }

  const getMessageError = (message: string) => message.replace(/^\[retry:\d+\]\s*/, "")

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <RefreshCw className="size-8 animate-spin text-slate-400" />
      </div>
    )
  }

  if (!campaign) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold text-slate-900">Campaign not found</h2>
        <Button onClick={() => router.push('/broadcasts')} className="mt-4 rounded-xl">Back to Broadcasts</Button>
      </div>
    )
  }

  const sentCount = campaign.messages.filter(m => m.status === 'SENT').length
  const failedCount = campaign.messages.filter(m => m.status === 'FAILED').length
  const totalCount = campaign.messages.length
  const progressPercent = totalCount > 0 ? Math.round((sentCount / totalCount) * 100) : 0

  return (
    <>
      <PageHeader title={campaign.name} />
      <div className="mx-auto max-w-5xl space-y-6 pb-12">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => router.push('/broadcasts')} className="rounded-full">
            <ArrowLeft className="size-5" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">{campaign.name}</h2>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-sm text-slate-500 whitespace-nowrap">
                {new Date(campaign.created_at).toLocaleString(undefined, { 
                  year: 'numeric', month: 'short', day: 'numeric', 
                  hour: '2-digit', minute: '2-digit' 
                })}
              </span>
              <Badge variant="outline" className="text-xs bg-white">{sentCount} / {totalCount} Sent ({progressPercent}%)</Badge>
              {failedCount > 0 && <Badge variant="outline" className="text-xs bg-rose-50 text-rose-600 border-rose-200">{failedCount} Failed</Badge>}
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {failedCount > 0 ? (
              <Button variant="outline" size="sm" onClick={retryFailedMessages} className="rounded-xl h-10">
                Retry Failed
              </Button>
            ) : null}
             <Button variant="outline" size="sm" onClick={loadDetails} className="rounded-xl h-10">
               <RefreshCw className="mr-2 size-4" /> Refresh Status
             </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-6 md:col-span-1">
            <Card className="rounded-[1.75rem] border-slate-100 bg-white/90 shadow-md shadow-purple-950/5 h-fit">
              <CardHeader>
                <CardTitle className="text-lg">Message Template</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Campaign image preview */}
                {campaign.image_url && (
                  <div className="rounded-2xl overflow-hidden border border-slate-100">
                    <img
                      src={campaign.image_url}
                      alt="Campaign image"
                      className="w-full object-cover max-h-56 cursor-zoom-in"
                      onClick={() => window.open(campaign.image_url!, '_blank')}
                    />
                  </div>
                )}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 whitespace-pre-wrap text-sm text-slate-700">
                  {campaign.message_template}
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-[1.75rem] border-slate-100 bg-white/90 shadow-md shadow-purple-950/5 h-fit">
              <CardHeader>
                <CardTitle className="text-lg">Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center text-sm border-b border-slate-100 pb-3">
                  <span className="text-slate-500">Delay Range</span>
                  <span className="font-medium text-slate-900">
                    {Math.round((campaign.min_delay_sec ?? 240) / 60)} – {Math.round((campaign.max_delay_sec ?? 300) / 60)} mins
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm pb-1">
                  <span className="text-slate-500">Business Hours Only</span>
                  <Badge variant="outline" className="bg-slate-50">
                    {campaign.business_hours_only ? 'On' : 'Off'}
                  </Badge>
                </div>
                {campaign.image_url && (
                  <div className="flex justify-between items-center text-sm pt-1 border-t border-slate-100">
                    <span className="text-slate-500">Image Attached</span>
                    <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100">Yes</Badge>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="rounded-[1.75rem] border-slate-100 bg-white/90 shadow-md shadow-purple-950/5 md:col-span-2 overflow-hidden flex flex-col h-full">
            <CardHeader className="shrink-0">
              <CardTitle className="text-lg">Recipients & Status</CardTitle>
              <CardDescription>Live status of all messages in this campaign.</CardDescription>
              <div className="w-full bg-slate-100 rounded-full h-2 mt-4 overflow-hidden">
                <div className="bg-[#7c3aed] h-2 transition-all duration-500" style={{ width: `${progressPercent}%` }}></div>
              </div>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-y-auto min-h-[400px]">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-slate-500 bg-slate-50 border-y border-slate-100 uppercase">
                    <tr>
                      <th className="px-6 py-4 font-semibold">Customer</th>
                      <th className="px-6 py-4 font-semibold">Status</th>
                      <th className="px-6 py-4 font-semibold">Update Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {campaign.messages.map((msg) => (
                      <tr key={msg.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                        <td className="px-6 py-4">
                          <p className="font-medium text-slate-900">{msg.customers?.customer_name || 'Unknown'}</p>
                          <p className="text-xs text-slate-500">{msg.customers?.phone}</p>
                        </td>
                        <td className="px-6 py-4">
                          {getStatusBadge(msg.status)}
                          {msg.error_message && (
                            <p className="text-xs text-rose-500 mt-1 max-w-[200px] truncate" title={getMessageError(msg.error_message)}>
                              {getMessageError(msg.error_message)}
                            </p>
                          )}
                        </td>
                        <td className="px-6 py-4 text-slate-500 text-xs">
                          {msg.sent_at 
                            ? new Date(msg.sent_at).toLocaleTimeString() 
                            : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}
