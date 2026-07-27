"use client"

import { useEffect, useState, useRef } from "react"
import { useHeaderContext } from "@/components/common/dashboard/dashboard-header-context"
import { Loader2, X, LifeBuoy, Search, Send, CheckCircle2, MessageSquare, AlertCircle, Clock, User, Phone, Mail } from "lucide-react"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type TicketMessage = {
  id: number
  sender_type: 'user' | 'admin'
  message: string
  created_at: string
}

type SupportTicket = {
  id: number
  user_id: number
  subject: string
  status: 'open' | 'in_progress' | 'resolved' | 'closed'
  priority: 'low' | 'normal' | 'high' | 'urgent'
  created_at: string
  users: {
    artist_name: string
    studio_name: string
    email: string
    phone: string
  }
}

export default function AdminSupportPage() {
  const { setTitle } = useHeaderContext()
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null)
  const [messages, setMessages] = useState<TicketMessage[]>([])
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [replyText, setReplyText] = useState("")
  const [sendingReply, setSendingReply] = useState(false)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setTitle("Support & Help Desk")
    loadTickets()
  }, [setTitle])

  useEffect(() => {
    if (selectedTicket) {
      loadMessages(selectedTicket.id)
    }
  }, [selectedTicket])

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages])

  const loadTickets = async () => {
    try {
      const res = await fetch("/api/admin/tickets")
      if (res.ok) setTickets(await res.json())
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const loadMessages = async (ticketId: number) => {
    setLoadingMessages(true)
    try {
      const res = await fetch(`/api/admin/tickets/${ticketId}/messages`)
      if (res.ok) setMessages(await res.json())
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingMessages(false)
    }
  }

  const handleSendReply = async () => {
    if (!selectedTicket || !replyText.trim()) return
    setSendingReply(true)
    try {
      const res = await fetch(`/api/admin/tickets/${selectedTicket.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: replyText.trim() })
      })
      if (res.ok) {
        setReplyText("")
        await loadMessages(selectedTicket.id)
        if (selectedTicket.status === 'open') {
          loadTickets() // Refresh to show in_progress
          setSelectedTicket({...selectedTicket, status: 'in_progress'})
        }
      }
    } catch (e) {
      console.error(e)
    } finally {
      setSendingReply(false)
    }
  }

  const handleResolveTicket = async () => {
    if (!selectedTicket) return
    try {
      const res = await fetch(`/api/admin/tickets/${selectedTicket.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "resolved" })
      })
      if (res.ok) {
        setSelectedTicket({...selectedTicket, status: 'resolved'})
        loadTickets()
      }
    } catch (e) {
      console.error(e)
    }
  }

  const filteredTickets = tickets.filter(ticket => {
    if (statusFilter !== "all" && ticket.status !== statusFilter) return false
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        ticket.users?.artist_name?.toLowerCase().includes(query) ||
        ticket.users?.studio_name?.toLowerCase().includes(query) ||
        ticket.subject.toLowerCase().includes(query) ||
        ticket.id.toString().includes(query)
      )
    }
    return true
  })

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-slate-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6 relative overflow-x-hidden h-full flex flex-col pb-12">
      
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center bg-white p-4 rounded-3xl border border-slate-200 shadow-sm">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-3 size-4 text-slate-400" />
          <Input 
            placeholder="Search by artist, studio, or ticket ID..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-10 rounded-xl border-slate-200 bg-slate-50 focus-visible:ring-purple-500"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <DropdownMenu>
            <DropdownMenuTrigger className={cn(buttonVariants({ variant: "outline" }), "h-10 rounded-xl px-3 flex gap-2 border-slate-200 shadow-sm text-slate-700 w-full sm:w-auto justify-between font-normal bg-white")}>
              <div className="flex items-center gap-2">
                <LifeBuoy className="size-4 text-slate-400" />
                <span className="capitalize">
                  {statusFilter === "all" ? "All Tickets" : statusFilter.replace('_', ' ')}
                </span>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 rounded-xl">
              <DropdownMenuRadioGroup value={statusFilter} onValueChange={setStatusFilter}>
                <DropdownMenuRadioItem value="all" className="rounded-lg">All Tickets</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="open" className="rounded-lg">Open</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="in_progress" className="rounded-lg">In Progress</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="resolved" className="rounded-lg">Resolved</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Tickets List */}
      <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm flex-1">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="border-b border-slate-100 bg-slate-50/50 text-xs uppercase tracking-wider text-slate-500 font-semibold">
              <tr>
                <th className="px-6 py-4">Ticket</th>
                <th className="px-6 py-4">Artist</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Created</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTickets.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="p-4 bg-slate-50 rounded-full">
                        <CheckCircle2 className="size-8 text-slate-300" />
                      </div>
                      <p>No tickets found matching your criteria.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredTickets.map((ticket) => (
                  <tr key={ticket.id} className="transition-colors hover:bg-slate-50/50 group cursor-pointer" onClick={() => setSelectedTicket(ticket)}>
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900 truncate max-w-xs">{ticket.subject}</div>
                      <div className="text-xs text-slate-500 mt-0.5">#{ticket.id} • {ticket.priority} priority</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">{ticket.users?.artist_name}</div>
                      <div className="text-slate-500 text-xs mt-0.5">{ticket.users?.studio_name}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize",
                        ticket.status === 'open' ? "bg-red-50 text-red-700" :
                        ticket.status === 'in_progress' ? "bg-amber-50 text-amber-700" :
                        "bg-emerald-50 text-emerald-700"
                      )}>
                        {ticket.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500 text-xs">
                      {format(new Date(ticket.created_at), "MMM d, h:mm a")}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button 
                        variant="secondary" 
                        size="sm" 
                        className="rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-900 transition-opacity opacity-0 group-hover:opacity-100"
                        onClick={(e) => { e.stopPropagation(); setSelectedTicket(ticket); }}
                      >
                        Reply
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Slide-out Panel Overlay */}
      {selectedTicket && (
        <div 
          className="fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-sm transition-opacity"
          onClick={() => setSelectedTicket(null)}
        />
      )}

      {/* Slide-out Chat Panel */}
      <div 
        className={cn(
          "fixed inset-y-0 right-0 z-50 w-full max-w-md md:max-w-xl transform bg-white shadow-2xl transition-transform duration-300 ease-in-out flex flex-col",
          selectedTicket ? "translate-x-0" : "translate-x-full"
        )}
      >
        {selectedTicket && (
          <>
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/80">
              <div className="pr-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold text-slate-400">TICKET #{selectedTicket.id}</span>
                  <span className={cn(
                    "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                    selectedTicket.status === 'open' ? "bg-red-100 text-red-700" :
                    selectedTicket.status === 'in_progress' ? "bg-amber-100 text-amber-700" :
                    "bg-emerald-100 text-emerald-700"
                  )}>
                    {selectedTicket.status.replace('_', ' ')}
                  </span>
                </div>
                <h2 className="text-lg font-bold text-slate-900 leading-tight">{selectedTicket.subject}</h2>
              </div>
              <Button size="icon" variant="ghost" onClick={() => setSelectedTicket(null)} className="rounded-full hover:bg-slate-200 shrink-0">
                <X className="size-5 text-slate-500" />
              </Button>
            </div>

            {/* Artist Info Strip */}
            <div className="bg-white border-b border-slate-100 px-6 py-3 flex items-center gap-6 text-xs overflow-x-auto whitespace-nowrap hide-scrollbar">
              <div className="flex items-center gap-1.5 text-slate-600 font-medium">
                <User className="size-3.5 text-slate-400" /> {selectedTicket.users?.artist_name}
              </div>
              <div className="flex items-center gap-1.5 text-slate-500">
                <Phone className="size-3.5 text-slate-400" /> {selectedTicket.users?.phone}
              </div>
              <div className="flex items-center gap-1.5 text-slate-500">
                <Mail className="size-3.5 text-slate-400" /> {selectedTicket.users?.email || 'N/A'}
              </div>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30 custom-scrollbar">
              {loadingMessages ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="size-6 animate-spin text-slate-300" />
                </div>
              ) : (
                <div className="space-y-6 flex flex-col">
                  {messages.map((msg) => {
                    const isAdmin = msg.sender_type === 'admin'
                    return (
                      <div key={msg.id} className={cn("flex flex-col max-w-[85%]", isAdmin ? "self-end items-end" : "self-start items-start")}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-semibold text-slate-700">{isAdmin ? 'Support Agent' : selectedTicket.users?.artist_name}</span>
                          <span className="text-[10px] text-slate-400">{format(new Date(msg.created_at), "h:mm a")}</span>
                        </div>
                        <div className={cn(
                          "px-4 py-3 rounded-2xl text-sm whitespace-pre-wrap leading-relaxed shadow-sm",
                          isAdmin 
                            ? "bg-[#7c3aed] text-white rounded-tr-sm" 
                            : "bg-white border border-slate-200 text-slate-800 rounded-tl-sm"
                        )}>
                          {msg.message}
                        </div>
                      </div>
                    )
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white border-t border-slate-100">
              {selectedTicket.status === 'resolved' || selectedTicket.status === 'closed' ? (
                <div className="text-center py-4 text-sm text-slate-500 flex items-center justify-center gap-2">
                  <CheckCircle2 className="size-4 text-emerald-500" />
                  This ticket has been resolved.
                </div>
              ) : (
                <div className="space-y-3">
                  <Textarea 
                    placeholder="Type your reply here..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    className="min-h-[100px] resize-none rounded-2xl bg-slate-50 border-slate-200 focus-visible:ring-purple-500 text-sm p-4"
                  />
                  <div className="flex items-center justify-between">
                    <Button 
                      variant="outline"
                      onClick={handleResolveTicket}
                      className="rounded-xl border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
                    >
                      <CheckCircle2 className="size-4 mr-2" /> Mark Resolved
                    </Button>
                    <Button 
                      onClick={handleSendReply}
                      disabled={sendingReply || !replyText.trim()}
                      className="rounded-xl bg-[#7c3aed] hover:bg-[#6d28d9] px-6"
                    >
                      {sendingReply ? <Loader2 className="size-4 animate-spin mr-2" /> : <Send className="size-4 mr-2" />}
                      Send Reply
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
