"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Bell, ChevronDown, LogOut, Settings } from "lucide-react"

import { ConfirmDialog } from "@/components/common/shared/confirm-dialog"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

type UserMenuProps = {
  name?: string
  initials?: string
  showActions?: boolean
  className?: string
}

export function UserMenu({
  name: propName,
  initials: propInitials,
  showActions = false,
  className,
}: UserMenuProps) {
  const router = useRouter()
  const [logoutOpen, setLogoutOpen] = useState(false)
  const [displayName, setDisplayName] = useState(propName || "Artist Studio")
  const [displayInitials, setDisplayInitials] = useState(propInitials || "AS")

  useEffect(() => {
    if (propName) {
      setDisplayName(propName)
      if (propInitials) {
        setDisplayInitials(propInitials)
      }
      return
    }

    async function fetchUser() {
      try {
        const res = await fetch("/api/auth/me")
        if (res.ok) {
          const data = await res.json()
          if (data?.user) {
            const artistName = data.user.artist_name || "Artist Studio"
            setDisplayName(artistName)

            // Generate initials
            const parts = artistName.split(" ").filter(Boolean)
            const ini =
              parts.length > 1
                ? (parts[0][0] + parts[1][0]).toUpperCase()
                : parts.length === 1
                  ? parts[0].slice(0, 2).toUpperCase()
                  : "AS"
            setDisplayInitials(ini)
          }
        }
      } catch (err) {
        console.error("Failed to fetch user profile", err)
      }
    }

    void fetchUser()
  }, [propName, propInitials])

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" })
    localStorage.removeItem("artistos-auth")
    sessionStorage.clear()
    setLogoutOpen(false)
    router.replace("/login")
    router.refresh()
  }

  return (
    <>
      <div className={cn("inline-flex items-center gap-2", className)}>
        {showActions && (
          <button
            type="button"
            aria-label="Notifications"
            className="relative flex size-10 items-center justify-center rounded-full border border-white/80 bg-white/95 text-[#7c3aed] shadow-md shadow-purple-950/5 transition hover:bg-white active:scale-95"
          >
            <Bell className="size-4 stroke-[2.2]" />
            <span className="absolute -top-1 -right-1 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white ring-2 ring-white">
              31
            </span>
          </button>
        )}

        {/* User Capsule Menu Trigger */}
        <DropdownMenu>
          <DropdownMenuTrigger className="inline-flex h-10 items-center gap-1.5 rounded-full border border-white/80 bg-white/95 p-1 pl-1 pr-2.5 text-xs font-semibold shadow-md shadow-purple-950/5 outline-none transition hover:bg-white focus-visible:ring-2 focus-visible:ring-[#7c3aed]/35 cursor-pointer">
            <Avatar className="size-8 border border-purple-100 bg-white shadow-sm">
              <AvatarFallback className="bg-white text-[#7c3aed] font-bold text-xs">
                {displayInitials}
              </AvatarFallback>
            </Avatar>
            <span className="hidden sm:inline-block max-w-[120px] truncate text-slate-800 font-medium">
              {displayName}
            </span>
            <ChevronDown className="size-3.5 text-slate-500 stroke-[2.5]" />
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-48 rounded-2xl p-1.5">
            <div className="px-2 py-1.5 text-xs">
              <p className="font-semibold text-slate-900">{displayName}</p>
              <p className="text-[11px] text-slate-500">ArtistOS Account</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem
                className="rounded-xl cursor-pointer"
                onClick={() => router.push("/profile")}
              >
                <Settings className="size-4" />
                Profile & Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                className="rounded-xl cursor-pointer"
                onClick={() => setLogoutOpen(true)}
              >
                <LogOut className="size-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <ConfirmDialog
        open={logoutOpen}
        title="Logout from ArtistOS?"
        description="You will return to the login page. Your dashboard data will stay safe."
        confirmText="Logout"
        onCancel={() => setLogoutOpen(false)}
        onConfirm={logout}
      />
    </>
  )
}


