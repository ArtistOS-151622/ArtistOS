"use client";

import { useEffect, useState, useRef } from "react";
import { useHeaderContext } from "@/components/common/dashboard/dashboard-header-context";
import {
  Loader2,
  Plus,
  LifeBuoy,
  Send,
  MessageSquare,
  AlertCircle,
  CheckCircle2,
  Search,
  X,
} from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AppModal } from "@/components/common/shared/app-modal";
import { cn } from "@/lib/utils";

type TicketMessage = {
  id: number;
  sender_type: "user" | "admin";
  message: string;
  created_at: string;
};

type SupportTicket = {
  id: number;
  subject: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  priority: "low" | "normal" | "high" | "urgent";
  created_at: string;
};

export default function UserSupportPage() {
  const { setTitle } = useHeaderContext();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const [newSubject, setNewSubject] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [creating, setCreating] = useState(false);

  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(
    null,
  );
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTitle("Support Center");
    loadTickets();
  }, [setTitle]);

  useEffect(() => {
    if (selectedTicket) {
      loadMessages(selectedTicket.id);
    }
  }, [selectedTicket]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const loadTickets = async () => {
    try {
      const res = await fetch("/api/portfolio/tickets");
      const json = await res.json();
      if (json.status) setTickets(json.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (ticketId: number) => {
    setLoadingMessages(true);
    try {
      const res = await fetch(`/api/portfolio/tickets/${ticketId}/messages`);
      const json = await res.json();
      if (json.status) setMessages(json.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleCreateTicket = async () => {
    if (!newSubject.trim() || !newMessage.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/portfolio/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: newSubject.trim(),
          message: newMessage.trim(),
        }),
      });
      const json = await res.json();
      if (json.status) {
        setCreateModalOpen(false);
        setNewSubject("");
        setNewMessage("");
        loadTickets();
        setSelectedTicket(json.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setCreating(false);
    }
  };

  const handleSendReply = async () => {
    if (!selectedTicket || !replyText.trim()) return;
    setSendingReply(true);
    try {
      const res = await fetch(
        `/api/portfolio/tickets/${selectedTicket.id}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: replyText.trim() }),
        },
      );
      const json = await res.json();
      if (json.status) {
        setReplyText("");
        await loadMessages(selectedTicket.id);
        if (selectedTicket.status === "in_progress") {
          loadTickets(); // Refresh to show open again
          setSelectedTicket({ ...selectedTicket, status: "open" });
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSendingReply(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-purple-400" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12 relative h-[calc(100vh-120px)] flex flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center bg-white/90 p-5 rounded-3xl border border-slate-100 shadow-sm shadow-purple-900/5">
        <div>
          <h2 className="text-xl font-bold text-slate-900">How can we help?</h2>
          <p className="text-slate-500 text-sm mt-1">
            Submit a ticket for billing, technical issues, or general inquiries.
          </p>
        </div>
        <Button
          onClick={() => setCreateModalOpen(true)}
          className="h-11 rounded-2xl bg-primary hover:bg-primary/90 text-white shrink-0"
        >
          <Plus className="size-4 mr-2" /> New Ticket
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 flex-1 min-h-0">
        {/* Ticket List (Left Sidebar) */}
        <div
          className={cn(
            "bg-white/90 border border-slate-100 rounded-3xl shadow-sm shadow-purple-900/5 overflow-hidden flex flex-col md:col-span-4",
            selectedTicket ? "hidden md:flex" : "flex",
          )}
        >
          <div className="p-4 border-b border-slate-100 bg-slate-50/50">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
              <LifeBuoy className="size-4 text-purple-500" /> Your Tickets
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
            {tickets.length === 0 ? (
              <div className="text-center py-12 text-slate-400 px-4">
                <LifeBuoy className="size-10 mx-auto mb-3 opacity-20" />
                <p className="text-sm">
                  You haven't submitted any support tickets yet.
                </p>
              </div>
            ) : (
              tickets.map((ticket) => (
                <button
                  key={ticket.id}
                  onClick={() => setSelectedTicket(ticket)}
                  className={cn(
                    "w-full text-left p-4 rounded-2xl border transition-all duration-200",
                    selectedTicket?.id === ticket.id
                      ? "bg-purple-50 border-purple-200 shadow-sm"
                      : "bg-white border-slate-100 hover:border-purple-200 hover:bg-slate-50",
                  )}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-semibold text-slate-400">
                      #{ticket.id}
                    </span>
                    <span
                      className={cn(
                        "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full",
                        ticket.status === "open"
                          ? "bg-amber-100 text-amber-700"
                          : ticket.status === "in_progress"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-emerald-100 text-emerald-700",
                      )}
                    >
                      {ticket.status.replace("_", " ")}
                    </span>
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm mb-1 leading-tight line-clamp-2">
                    {ticket.subject}
                  </h4>
                  <div className="text-xs text-slate-500">
                    {format(new Date(ticket.created_at), "MMM d, yyyy")}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Chat Area (Right Side) */}
        <div
          className={cn(
            "bg-white/90 border border-slate-100 rounded-3xl shadow-sm shadow-purple-900/5 flex flex-col md:col-span-8",
            !selectedTicket
              ? "hidden md:flex items-center justify-center bg-slate-50/50"
              : "flex",
          )}
        >
          {!selectedTicket ? (
            <div className="text-center text-slate-400 p-8">
              <MessageSquare className="size-12 mx-auto mb-4 opacity-20" />
              <h3 className="text-lg font-semibold text-slate-700 mb-1">
                No Ticket Selected
              </h3>
              <p className="text-sm">
                Select a ticket from the list or create a new one to start
                chatting.
              </p>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div className="p-5 border-b border-slate-100 bg-white rounded-t-3xl flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden size-8 -ml-2 rounded-full"
                    onClick={() => setSelectedTicket(null)}
                  >
                    <X className="size-4" />
                  </Button>
                  <div>
                    <h3 className="font-bold text-slate-900 leading-tight">
                      {selectedTicket.subject}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Ticket #{selectedTicket.id} •{" "}
                      {selectedTicket.status === "resolved"
                        ? "Resolved"
                        : "Active"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30 custom-scrollbar">
                {loadingMessages ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="size-6 animate-spin text-purple-400" />
                  </div>
                ) : (
                  <div className="space-y-6 flex flex-col">
                    {messages.map((msg) => {
                      const isUser = msg.sender_type === "user";
                      return (
                        <div
                          key={msg.id}
                          className={cn(
                            "flex flex-col max-w-[85%]",
                            isUser
                              ? "self-end items-end"
                              : "self-start items-start",
                          )}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-semibold text-slate-700">
                              {isUser ? "You" : "Support Team"}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {format(new Date(msg.created_at), "h:mm a")}
                            </span>
                          </div>
                          <div
                            className={cn(
                              "px-4 py-3 rounded-2xl text-sm whitespace-pre-wrap leading-relaxed shadow-sm",
                              isUser
                                ? "bg-primary text-white rounded-tr-sm"
                                : "bg-white border border-slate-200 text-slate-800 rounded-tl-sm",
                            )}
                          >
                            {msg.message}
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              {/* Chat Input */}
              <div className="p-4 bg-white border-t border-slate-100 rounded-b-3xl shrink-0">
                {selectedTicket.status === "resolved" ||
                selectedTicket.status === "closed" ? (
                  <div className="text-center py-3 text-sm text-emerald-600 font-medium flex items-center justify-center gap-2 bg-emerald-50 rounded-xl border border-emerald-100">
                    <CheckCircle2 className="size-4" />
                    This ticket has been resolved. If you need more help, please
                    open a new ticket.
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Textarea
                      placeholder="Type your reply..."
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      className="min-h-[100px] resize-none rounded-2xl bg-slate-50 border-slate-200 focus-visible:ring-purple-500 text-sm p-4"
                    />
                    <div className="flex justify-end">
                      <Button
                        onClick={handleSendReply}
                        disabled={sendingReply || !replyText.trim()}
                        className="rounded-xl bg-primary hover:bg-primary/90 px-6"
                      >
                        {sendingReply ? (
                          <Loader2 className="size-4 animate-spin mr-2" />
                        ) : (
                          <Send className="size-4 mr-2" />
                        )}
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

      {/* Create Ticket Modal */}
      <AppModal
        open={createModalOpen}
        icon={<LifeBuoy className="size-5" />}
        onClose={() => setCreateModalOpen(false)}
        title="Create Support Ticket"
        description="Describe your issue below and our team will get back to you shortly."
        footer={
          <Button
            className="w-full h-11 rounded-xl bg-primary hover:bg-primary/90 text-white shadow-md"
            onClick={handleCreateTicket}
            disabled={creating || !newSubject.trim() || !newMessage.trim()}
          >
            {creating ? (
              <Loader2 className="size-4 animate-spin mr-2" />
            ) : (
              <Send className="size-4 mr-2" />
            )}
            Submit Ticket
          </Button>
        }
      >
        <div className="space-y-5">
          <div className="space-y-2">
            <Label className="text-slate-700 font-semibold">Subject</Label>
            <Input
              placeholder="E.g. Payment deducted but storage not updated"
              value={newSubject}
              onChange={(e) => setNewSubject(e.target.value)}
              className="h-11 rounded-xl bg-slate-50 border-slate-200 focus-visible:ring-purple-500"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-slate-700 font-semibold">
              Describe the issue
            </Label>
            <Textarea
              placeholder="Please provide as much detail as possible..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              className="min-h-[120px] rounded-xl bg-slate-50 border-slate-200 focus-visible:ring-purple-500 p-3"
            />
          </div>
        </div>
      </AppModal>
    </div>
  );
}
