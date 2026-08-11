"use client"

import { useState, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { Bell, ChevronDown, LogOut, Settings, LifeBuoy, CreditCard } from "lucide-react"

import { ConfirmDialog } from "@/components/common/shared/confirm-dialog"
import { NotificationsDropdown } from "./notifications-dropdown"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
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
  const [logoUrl, setLogoUrl] = useState<string | null>(null)

  const pathname = usePathname() || ""
  const isProfileActive = pathname.includes("/profile") || pathname.includes("/billing") || pathname.includes("/support")

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
            if (data.user.studio_logo_url || data.user.avatar_url) {
              setLogoUrl(data.user.studio_logo_url || data.user.avatar_url)
            }

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
          <NotificationsDropdown />
        )}

        {/* User Capsule Menu Trigger */}
        <DropdownMenu>
          <DropdownMenuTrigger className={cn(
            "inline-flex h-10 items-center gap-1.5 rounded-full border p-1 pl-1 pr-2.5 text-xs font-semibold shadow-md outline-none transition focus-visible:ring-2 focus-visible:ring-[#7c3aed]/35 cursor-pointer",
            isProfileActive
              ? "border-transparent bg-[#7c3aed] text-white shadow-purple-950/20"
              : "border-white/80 bg-white/95 text-slate-800 shadow-purple-950/5 hover:bg-white"
          )}>
            <Avatar className="size-8 border border-purple-100 bg-white shadow-sm overflow-hidden">
              {logoUrl && <AvatarImage src={logoUrl} alt={displayName} className="object-cover" />}
              <AvatarFallback className="bg-white text-[#7c3aed] font-bold text-xs">
                {displayInitials}
              </AvatarFallback>
            </Avatar>
            <span className={cn("hidden sm:inline-block max-w-[120px] truncate font-medium", isProfileActive ? "text-white" : "text-slate-800")}>
              {displayName}
            </span>
            <ChevronDown className={cn("size-3.5 stroke-[2.5]", isProfileActive ? "text-purple-200" : "text-slate-500")} />
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
              <DropdownMenuItem
                className="rounded-xl cursor-pointer"
                onClick={() => router.push("/billing")}
              >
                <CreditCard className="size-4" />
                Billing & Payment
              </DropdownMenuItem>
              <DropdownMenuItem
                className="rounded-xl cursor-pointer"
                onClick={() => router.push("/support")}
              >
                <LifeBuoy className="size-4" />
                Support Center
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


