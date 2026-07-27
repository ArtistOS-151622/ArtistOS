"use client"

import { AdminSidebar } from "./admin-sidebar"
import { AdminTopbar } from "./admin-topbar"
import { HeaderProvider } from "@/components/common/dashboard/dashboard-header-context"
import { usePathname } from "next/navigation"
import type { ReactNode } from "react"

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() || ""

  const active = pathname.includes('/admin/users') ? 'users' :
    pathname.includes('/admin/payments') ? 'payments' :
    pathname.includes('/admin/storage') ? 'storage' :
    pathname.includes('/admin/settings') ? 'settings' :
    pathname.includes('/admin/support') ? 'support' : 'overview'

  return (
    <HeaderProvider>
      <main className="relative min-h-svh sm:h-svh bg-gradient-to-br from-[#f8d2d9] via-[#f8ebe7] to-[#ebd7eb] p-3 pb-24 text-[#2e1517] sm:p-4 sm:pb-24 lg:p-6 lg:pb-6 overflow-x-hidden sm:overflow-hidden">
        <div className="relative z-10 grid gap-5 lg:grid-cols-[76px_1fr] h-full">
          <AdminSidebar active={active} />
          <section className="w-full h-full flex flex-col min-h-0">
            <div className="shrink-0">
              <AdminTopbar />
            </div>
            <div className="mt-5 lg:mt-7 flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar pr-1 pb-16 lg:pb-0">
              {children}
            </div>
          </section>
        </div>
      </main>
    </HeaderProvider>
  )
}
