"use client"

import Link from "next/link"
import {
  Grid2X2,
  UsersRound,
  CreditCard,
  HardDrive,
  Settings,
  LifeBuoy,
  type LucideIcon,
  LogOut
} from "lucide-react"
import { useRouter } from "next/navigation"

import { BrandMark } from "@/components/common/brand/brand-logo"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type SidebarItem = {
  id: "overview" | "users" | "payments" | "storage" | "settings" | "support"
  icon: LucideIcon
  href: string
  label: string
}

const sidebarItems: SidebarItem[] = [
  { id: "overview", icon: Grid2X2, href: "/admin", label: "Overview" },
  { id: "users", icon: UsersRound, href: "/admin/users", label: "Users" },
  { id: "payments", icon: CreditCard, href: "/admin/payments", label: "Payments" },
  { id: "storage", icon: HardDrive, href: "/admin/storage", label: "Storage" },
  { id: "support", icon: LifeBuoy, href: "/admin/support", label: "Support" },
  { id: "settings", icon: Settings, href: "/admin/settings", label: "Settings" },
]

type AdminSidebarProps = {
  active: SidebarItem["id"]
}

export function AdminSidebar({ active }: AdminSidebarProps) {
  const router = useRouter()

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST' })
      router.push('/admin/login')
      router.refresh()
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <>
      <aside className="hidden rounded-[2rem] border border-slate-100 bg-white px-3 py-6 shadow-xl shadow-red-950/5 lg:flex lg:h-full lg:flex-col lg:items-center lg:justify-between">
        <div className="space-y-5 flex flex-col items-center">
          <BrandMark />
          <div className="text-[10px] font-bold text-red-500 uppercase tracking-widest -mt-2">Admin</div>
          <div className="space-y-3 pt-4">
            {sidebarItems.map((item) => (
              <AdminNavLink key={item.id} item={item} active={active === item.id} />
            ))}
          </div>
        </div>
        <div className="space-y-3">
          <Button 
            size="icon" 
            variant="ghost" 
            onClick={handleLogout}
            className="size-11 rounded-2xl bg-white text-red-600 hover:bg-red-50 hover:text-red-700"
            title="Logout"
          >
            <LogOut className="size-5" />
          </Button>
        </div>
      </aside>

      <nav className="fixed inset-x-3 bottom-3 z-50 rounded-[1.75rem] border border-slate-100 bg-red-50/30 p-2 shadow-2xl shadow-red-950/20 backdrop-blur-xl lg:hidden">
        <div className="flex gap-2 justify-center overflow-x-auto custom-scrollbar">
          {sidebarItems.map((item) => (
            <AdminNavLink
              key={item.id}
              item={item}
              active={active === item.id}
              className="h-12 w-full rounded-2xl"
            />
          ))}
        </div>
      </nav>
    </>
  )
}

function AdminNavLink({
  item,
  active,
  className,
}: {
  item: SidebarItem
  active: boolean
  className?: string
}) {
  const Icon = item.icon

  return (
    <Link
      href={item.href}
      aria-label={item.label}
      title={item.label}
      suppressHydrationWarning
      className={cn(
        "inline-flex size-11 items-center justify-center rounded-2xl transition",
        active ? "bg-red-600 text-white shadow-lg shadow-red-950/20 hover:bg-red-700" : "bg-white text-slate-600 hover:bg-slate-100",
        className
      )}
    >
      <Icon className="size-5" />
    </Link>
  )
}
