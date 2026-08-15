"use client";

import Link from "next/link";
import useSWR from "swr";
import {
  Bell,
  CalendarCheck,
  ClipboardList,
  Grid2X2,
  Flower2,
  UsersRound,
  ImageIcon,
  BarChart3,
  type LucideIcon,
} from "lucide-react";

import { BrandMark } from "@/components/common/brand/brand-logo";
import { cn } from "@/lib/utils";

type SidebarItem = {
  id: "dashboard" | "services" | "calendar" | "customers" | "broadcasts" | "bookings" | "inquiries" | "portfolio" | "profile" | "support" | "billing" | "notifications" | "reports"
  icon: LucideIcon
  href: string
  label: string
}

const sidebarItems: SidebarItem[] = [
  { id: "dashboard", icon: Grid2X2, href: "/dashboard", label: "Dashboard" },
  { id: "customers", icon: UsersRound, href: "/customers", label: "Customers" },
  { id: "bookings", icon: CalendarCheck, href: "/bookings", label: "Bookings" },
  { id: "inquiries", icon: ClipboardList, href: "/inquiries", label: "Inquiries" },
  { id: "services", icon: Flower2, href: "/services", label: "Services" },
  { id: "reports", icon: BarChart3, href: "/reports", label: "Reports" },

  { id: "portfolio", icon: ImageIcon, href: "/portfolio", label: "Portfolio" },
]

type DashboardSidebarProps = {
  active: SidebarItem["id"];
};

type NotificationPreview = {
  read_at?: string | null
}

type InquiryCounts = {
  pending?: number
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function DashboardSidebar({ active }: DashboardSidebarProps) {
  const { data: notifications } = useSWR<NotificationPreview[]>("/api/notifications", fetcher, {
    refreshInterval: 60000,
  })
  const { data: inquiryCounts } = useSWR<InquiryCounts>("/api/inquiries/counts", fetcher, {
    refreshInterval: 30000,
  })
  const validNotifications = Array.isArray(notifications) ? notifications : []
  const unreadCount = validNotifications.filter((n) => !n.read_at).length
  const pendingInquiryCount = inquiryCounts?.pending ?? 0
  const mobileItems = sidebarItems.filter((item) => item.id !== "inquiries")

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:h-full lg:w-[62px] lg:flex-col lg:items-center lg:justify-between select-none shrink-0">
        {/* Top Logo Badge */}
        <div className="flex flex-col items-center gap-5 w-full">
          <Link
            href="/dashboard"
            aria-label="Dashboard Home"
            contentEditable={false}
            suppressHydrationWarning
            className="flex h-[50px] w-[50px] cursor-pointer items-center justify-center rounded-[1rem] bg-white shadow-lg shadow-purple-950/5 border border-white/80 transition hover:scale-105"
          >
            <BrandMark className="size-8 bg-transparent shadow-none p-0" />
          </Link>

          {/* Main Navigation Capsule */}
          <nav className="flex w-full flex-col items-center gap-2 rounded-full bg-white/90 p-1.5 shadow-xl shadow-purple-950/5 border border-white/80 backdrop-blur-md">
            {sidebarItems.map((item) => (
              <DashboardNavLink
                key={item.id}
                item={item}
                active={active === item.id}
              />
            ))}
          </nav>
        </div>

        {/* Bottom Actions Capsule */}
        <div className="flex w-full flex-col items-center gap-2 rounded-full bg-white/90 p-1.5 shadow-xl shadow-purple-950/5 border border-white/80 backdrop-blur-md">
          {/* Bell / Notifications */}
          {/* Bell / Notifications */}
          <Link
            href="/notifications"
            aria-label="Notifications"
            className={cn(
              "relative flex h-[50px] w-[50px] items-center justify-center rounded-full transition-all duration-200",
              active === "notifications"
                ? "bg-[#7c3aed] text-white shadow-md shadow-purple-500/25 scale-105"
                : "text-[#7c3aed]/80 hover:bg-purple-50/80 hover:text-[#7c3aed]"
            )}
          >
            <Bell className="size-5" />
            {unreadCount > 0 && (
              <span className="absolute top-3 right-3 size-2 rounded-full bg-rose-500 ring-2 ring-white" />
            )}
          </Link>


        </div>
      </aside>

      {/* Mobile Navigation Bar */}
      <nav className="fixed inset-x-4 bottom-4 z-50 flex items-center justify-around rounded-full bg-white/95 p-1.5 shadow-2xl shadow-purple-950/15 border border-white/80 backdrop-blur-xl lg:hidden">
        {mobileItems.map((item) => (
          <DashboardNavLink
            key={item.id}
            item={item}
            active={active === item.id}
            className="h-[50px] w-[50px] rounded-full"
          />
        ))}

      </nav>

      {active !== "inquiries" && active !== "portfolio" ? (
        <Link
          href="/inquiries"
          aria-label="Inquiries"
          title="Inquiries"
          className="fixed right-0 top-1/2 z-50 flex h-14 w-13 -translate-y-1/2 items-center justify-center rounded-l-2xl bg-[#a100f2] text-white shadow-xl shadow-purple-950/20 transition-all hover:bg-[#8b00d4] lg:hidden"
        >
          <ClipboardList className="size-5" />
          {pendingInquiryCount > 0 ? (
            <span className="absolute -left-2 -top-2 flex min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white ring-2 ring-white">
              {pendingInquiryCount > 99 ? "99+" : pendingInquiryCount}
            </span>
          ) : null}
        </Link>
      ) : null}
    </>
  );
}

function DashboardNavLink({
  item,
  active,
  className,
}: {
  item: SidebarItem;
  active: boolean;
  className?: string;
}) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      title={item.label}
      aria-label={item.label}
      contentEditable={false}
      suppressHydrationWarning
      className={cn(
        "inline-flex h-[50px] w-[50px] cursor-pointer items-center justify-center rounded-full transition-all duration-200",
        active
          ? "bg-[#7c3aed] text-white shadow-md shadow-purple-500/25 scale-105"
          : "text-[#7c3aed]/80 hover:bg-purple-50/80 hover:text-[#7c3aed]",
        className,
      )}
    >
      <Icon className="size-5" />
    </Link>
  );
}
