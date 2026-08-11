"use client"

import { Bell, BellOff, CheckCheck, ChevronRight, Loader2, Sparkles } from "lucide-react"
import { useRouter } from "next/navigation"
import useSWR from "swr"
import { formatDistanceToNow } from "date-fns"

import { cn } from "@/lib/utils"

type NotificationRow = {
  id: number
  title: string
  body: string
  url: string | null
  created_at: string
  read_at: string | null
  status: string
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function NotificationsPage() {
  const router = useRouter()
  const { data: notifications, mutate, isLoading } = useSWR<NotificationRow[]>("/api/notifications", fetcher, {
    refreshInterval: 60000,
  })

  const validNotifications = Array.isArray(notifications) ? notifications : []
  const unreadCount = validNotifications.filter((n) => !n.read_at).length
  const readCount = validNotifications.filter((n) => !!n.read_at).length

  async function markAsRead(id?: number) {
    if (Array.isArray(notifications)) {
      const updated = id
        ? notifications.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
        : notifications.map((n) => ({ ...n, read_at: new Date().toISOString() }))
      mutate(updated, false)
    }

    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(id ? { id } : {}),
      })
      mutate()
    } catch (err) {
      console.error("Failed to mark notification as read", err)
    }
  }

  async function handleNotificationClick(n: NotificationRow) {
    if (!n.read_at) {
      await markAsRead(n.id)
    }
    if (n.url) {
      router.push(n.url)
    }
  }

  return (
    <div className="w-full space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#7c3aed] to-[#6d28d9] shadow-md shadow-purple-500/25">
            <Bell className="size-5 text-white stroke-[2]" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">Notifications</h1>
            <p className="text-xs text-slate-500">
              {unreadCount > 0 ? (
                <span className="font-medium text-[#7c3aed]">{unreadCount} unread</span>
              ) : (
                "All caught up!"
              )}
              {readCount > 0 && unreadCount > 0 && <span className="text-slate-400"> · {readCount} read</span>}
            </p>
          </div>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={() => markAsRead()}
            className="flex items-center gap-1.5 rounded-xl border border-purple-100 bg-white/80 px-3 py-2 text-xs font-semibold text-[#7c3aed] shadow-sm transition hover:bg-purple-50 hover:shadow-md active:scale-95"
          >
            <CheckCheck className="size-3.5" />
            Mark all read
          </button>
        )}
      </div>

      {/* Stats Row */}
      {!isLoading && validNotifications.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-purple-100 bg-gradient-to-br from-[#7c3aed]/5 to-white p-4 shadow-sm">
            <p className="text-2xl font-bold text-[#7c3aed]">{unreadCount}</p>
            <p className="text-xs font-medium text-slate-500 mt-0.5">Unread notifications</p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-white/80 p-4 shadow-sm">
            <p className="text-2xl font-bold text-slate-700">{validNotifications.length}</p>
            <p className="text-xs font-medium text-slate-500 mt-0.5">Total notifications</p>
          </div>
        </div>
      )}

      {/* Notifications Feed */}
      <div className="overflow-hidden rounded-[1.5rem] border border-slate-100 bg-white/90 shadow-lg shadow-purple-950/5 backdrop-blur-sm">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center gap-4 py-20 text-slate-400">
            <div className="relative">
              <div className="size-14 rounded-full bg-purple-50 flex items-center justify-center">
                <Loader2 className="size-6 animate-spin text-[#7c3aed]" />
              </div>
            </div>
            <p className="text-sm font-medium text-slate-500">Loading your notifications…</p>
          </div>
        ) : validNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 py-20 text-center px-6">
            <div className="relative">
              <div className="size-20 rounded-full bg-gradient-to-br from-purple-50 to-slate-50 flex items-center justify-center shadow-inner">
                <BellOff className="size-9 text-slate-300" />
              </div>
              <div className="absolute -top-1 -right-1 size-6 rounded-full bg-gradient-to-br from-[#7c3aed] to-[#6d28d9] flex items-center justify-center shadow-sm">
                <Sparkles className="size-3 text-white" />
              </div>
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">You're all caught up!</h3>
              <p className="mt-1.5 max-w-xs text-sm text-slate-500 leading-relaxed">
                When you receive booking reminders, alerts, or updates, they'll appear here.
              </p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {/* Unread section */}
            {unreadCount > 0 && (
              <>
                <div className="flex items-center gap-2 bg-[#7c3aed]/5 px-5 py-2.5">
                  <span className="size-1.5 rounded-full bg-[#7c3aed]" />
                  <p className="text-xs font-bold uppercase tracking-widest text-[#7c3aed]">New</p>
                </div>
                {validNotifications
                  .filter((n) => !n.read_at)
                  .map((n) => (
                    <NotificationItem key={n.id} n={n} onClick={() => handleNotificationClick(n)} onMarkRead={() => markAsRead(n.id)} />
                  ))}
              </>
            )}

            {/* Read section */}
            {readCount > 0 && (
              <>
                <div className="flex items-center gap-2 bg-slate-50/80 px-5 py-2.5">
                  <span className="size-1.5 rounded-full bg-slate-300" />
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Earlier</p>
                </div>
                {validNotifications
                  .filter((n) => !!n.read_at)
                  .map((n) => (
                    <NotificationItem key={n.id} n={n} onClick={() => handleNotificationClick(n)} onMarkRead={() => markAsRead(n.id)} />
                  ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function NotificationItem({
  n,
  onClick,
  onMarkRead,
}: {
  n: NotificationRow
  onClick: () => void
  onMarkRead: (e: React.MouseEvent) => void
}) {
  const isUnread = !n.read_at
  const icon = getNotificationIcon(n.title)

  return (
    <div
      onClick={onClick}
      className={cn(
        "group relative flex items-start gap-4 px-5 py-4 transition-all duration-150",
        n.url ? "cursor-pointer" : "",
        isUnread ? "bg-[#7c3aed]/[0.03] hover:bg-[#7c3aed]/[0.06]" : "hover:bg-slate-50/80"
      )}
    >
      {/* Icon Badge */}
      <div className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-2xl text-lg shadow-sm transition",
        isUnread
          ? "bg-gradient-to-br from-purple-100 to-purple-50 ring-1 ring-purple-200/50"
          : "bg-slate-100/80"
      )}>
        {icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pt-0.5">
        <div className="flex items-start justify-between gap-3">
          <p className={cn(
            "text-sm font-semibold leading-snug",
            isUnread ? "text-[#7c3aed]" : "text-slate-800"
          )}>
            {n.title}
          </p>
          <div className="flex shrink-0 items-center gap-2">
            {isUnread && (
              <button
                onClick={(e) => { e.stopPropagation(); onMarkRead(e) }}
                title="Mark as read"
                className="hidden group-hover:flex size-5 items-center justify-center rounded-full text-slate-400 hover:text-[#7c3aed] transition"
              >
                <CheckCheck className="size-3.5" />
              </button>
            )}
            {isUnread && <span className="size-2 shrink-0 rounded-full bg-[#7c3aed] ring-2 ring-purple-100" />}
          </div>
        </div>
        <p className="mt-1 text-xs text-slate-500 leading-relaxed line-clamp-2">{n.body}</p>
        <div className="mt-2 flex items-center gap-3">
          <span className="text-[10px] font-medium text-slate-400">
            {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
          </span>
          {n.url && (
            <span className="flex items-center gap-0.5 text-[10px] font-semibold text-[#7c3aed] opacity-0 group-hover:opacity-100 transition">
              View details <ChevronRight className="size-3" />
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

function getNotificationIcon(title: string) {
  const lower = title.toLowerCase()
  if (lower.includes("booking")) return "📅"
  if (lower.includes("test")) return "🔔"
  if (lower.includes("payment") || lower.includes("billing")) return "💳"
  if (lower.includes("reminder")) return "⏰"
  return "✨"
}
