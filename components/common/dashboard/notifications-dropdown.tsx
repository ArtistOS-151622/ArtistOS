"use client"

import { Bell } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import useSWR from "swr"

import { cn } from "@/lib/utils"

type NotificationRow = {
  id: number
  read_at: string | null
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function NotificationsDropdown() {
  const pathname = usePathname()
  const isActive = pathname === "/notifications"

  const { data: notifications } = useSWR<NotificationRow[]>("/api/notifications", fetcher, {
    refreshInterval: 60000,
  })

  const validNotifications = Array.isArray(notifications) ? notifications : []
  const unreadCount = validNotifications.filter((n) => !n.read_at).length

  return (
    <Link
      href="/notifications"
      aria-label="Notifications"
      className={cn(
        "relative flex size-10 items-center justify-center rounded-full border shadow-md transition outline-none focus-visible:ring-2 focus-visible:ring-[#7c3aed]/35 cursor-pointer",
        isActive 
          ? "border-transparent bg-[#7c3aed] text-white shadow-purple-950/20" 
          : "border-white/80 bg-white/95 text-[#7c3aed] shadow-purple-950/5 hover:bg-white active:scale-95"
      )}
    >
      <Bell className="size-4 stroke-[2.2]" />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white ring-2 ring-white">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </Link>
  )
}
