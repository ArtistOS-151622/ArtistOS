"use client"

import { Bell, CheckCheck, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import useSWR from "swr"
import { formatDistanceToNow } from "date-fns"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

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
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Notifications</h1>
          <p className="text-sm text-slate-500">
            Stay updated with your latest alerts and reminders.
          </p>
        </div>
        
        {unreadCount > 0 && (
          <button
            onClick={() => markAsRead()}
            className={cn(
              buttonVariants({ variant: "outline" }),
              "h-10 shrink-0 gap-2 rounded-xl text-[#7c3aed] hover:text-[#6d28d9] hover:bg-purple-50 border-purple-100"
            )}
          >
            <CheckCheck className="size-4" />
            Mark all as read
          </button>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-12 text-slate-400">
            <Loader2 className="size-6 animate-spin text-[#7c3aed]" />
            <p className="mt-4 text-sm">Loading notifications...</p>
          </div>
        ) : validNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 text-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-slate-50 mb-4">
              <Bell className="size-8 text-slate-300" />
            </div>
            <h3 className="text-base font-semibold text-slate-900">No notifications yet</h3>
            <p className="mt-1 max-w-xs text-sm text-slate-500">
              When you have new alerts, booking reminders, or updates, they will appear here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {validNotifications.map((n) => (
              <div
                key={n.id}
                onClick={() => handleNotificationClick(n)}
                className={cn(
                  "relative flex flex-col gap-1.5 p-5 text-left transition hover:bg-slate-50",
                  n.url ? "cursor-pointer" : "",
                  !n.read_at ? "bg-[#f5f3ff]/40" : ""
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <span
                    className={cn(
                      "text-base font-semibold tracking-tight",
                      !n.read_at ? "text-[#7c3aed]" : "text-slate-800"
                    )}
                  >
                    {n.title}
                  </span>
                  {!n.read_at && (
                    <span className="mt-1.5 flex size-2.5 shrink-0 rounded-full bg-[#7c3aed] ring-4 ring-purple-50" />
                  )}
                </div>
                <p className="text-sm text-slate-600 leading-relaxed pr-8">
                  {n.body}
                </p>
                <span className="mt-1 text-xs font-medium text-slate-400">
                  {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
