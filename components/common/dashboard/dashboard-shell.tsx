"use client";

import { DashboardSidebar } from "@/components/common/dashboard/dashboard-sidebar";
import { DashboardTopbar } from "@/components/common/dashboard/dashboard-topbar";
import { HeaderProvider } from "@/components/common/dashboard/dashboard-header-context";
import { SubscriptionGuardProvider } from "@/components/common/subscription/subscription-guard-provider";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export function DashboardShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "";

  const active = pathname.includes('/bookings') ? 'bookings' :
    pathname.includes('/portfolio') ? 'portfolio' :
    pathname.includes('/customers') ? 'customers' :
    pathname.includes('/services') ? 'services' :
    pathname.includes('/calendar') ? 'calendar' :
    pathname.includes('/profile') ? 'profile' :
    pathname.includes('/support') ? 'support' :
    pathname.includes('/billing') ? 'billing' :
    pathname.includes('/notifications') ? 'notifications' : 'dashboard'

  return (
    <HeaderProvider>
      <SubscriptionGuardProvider>
        <main className="relative h-svh bg-gradient-to-br from-[#d2d9f9] via-[#e7ebf8] to-[#d7ebd8] p-3.5 text-[#15172e] sm:p-4 lg:p-6 overflow-hidden">
          <div className="relative z-10 grid gap-4 lg:gap-5 lg:grid-cols-[62px_1fr] h-full">
            <DashboardSidebar active={active} />
            <section className="relative w-full h-full flex flex-col min-h-0">
              <div className="shrink-0 z-30">
                <DashboardTopbar />
              </div>
              <div className="mt-4 lg:mt-6 flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar pr-1 pb-24 lg:pb-0">
                {children}
              </div>
            </section>
          </div>
        </main>
      </SubscriptionGuardProvider>
    </HeaderProvider>
  );
}
