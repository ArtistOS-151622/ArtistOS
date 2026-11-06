"use client";

import Link from "next/link";
import { useState, useSyncExternalStore, type ComponentProps, type MouseEvent } from "react";
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
  GraduationCap,
  type LucideIcon,
} from "lucide-react";

import { BrandMark } from "@/components/common/brand/brand-logo";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { DashboardSection } from "@/lib/dashboard/sections";
import { cn } from "@/lib/utils";

type SidebarItem = {
  id: DashboardSection
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
  { id: "courses", icon: GraduationCap, href: "/courses", label: "Courses" },
  { id: "reports", icon: BarChart3, href: "/reports", label: "Reports" },
  { id: "portfolio", icon: ImageIcon, href: "/portfolio", label: "Portfolio" },
]

const mobileItems = sidebarItems.filter((item) => item.id !== "inquiries" && item.id !== "portfolio")

// Desktop items are 50px tall with an 8px gap, so the indicator moves 58px per
// item. Literal class names so Tailwind can see them; keep in sync with sidebarItems.
const INDICATOR_OFFSETS = [
  "translate-y-0",
  "translate-y-[58px]",
  "translate-y-[116px]",
  "translate-y-[174px]",
  "translate-y-[232px]",
  "translate-y-[290px]",
  "translate-y-[348px]",
  "translate-y-[406px]",
]

const TOOLTIP_DELAY_MS = 150
const DESKTOP_QUERY = "(min-width: 1024px)"

type DashboardSidebarProps = {
  active: DashboardSection;
};

type NotificationPreview = {
  read_at?: string | null
}

type InquiryCounts = {
  pending?: number
}

type PendingNav = {
  id: DashboardSection
  from: DashboardSection
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

function subscribeDesktop(onChange: () => void) {
  const query = window.matchMedia(DESKTOP_QUERY)
  query.addEventListener("change", onChange)
  return () => query.removeEventListener("change", onChange)
}

function useIsDesktop() {
  return useSyncExternalStore(
    subscribeDesktop,
    () => window.matchMedia(DESKTOP_QUERY).matches,
    () => false,
  )
}

function isPlainLeftClick(event: MouseEvent) {
  return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey
}

export function DashboardSidebar({ active }: DashboardSidebarProps) {
  const isDesktop = useIsDesktop()
  const { data: notifications } = useSWR<NotificationPreview[]>("/api/notifications", fetcher, {
    refreshInterval: 60000,
  })
  // The pending-inquiry badge only exists on the mobile floating button.
  const { data: inquiryCounts } = useSWR<InquiryCounts>(isDesktop ? null : "/api/inquiries/counts", fetcher, {
    refreshInterval: 30000,
  })

  // Highlight the clicked item immediately instead of waiting for the route to
  // commit. The pending entry is ignored once the real route moves off `from`.
  const [pending, setPending] = useState<PendingNav | null>(null)
  const current = pending && pending.from === active ? pending.id : active

  const navigate = (id: DashboardSection) => (event: MouseEvent) => {
    if (isPlainLeftClick(event)) setPending({ id, from: active })
  }

  const validNotifications = Array.isArray(notifications) ? notifications : []
  const unreadCount = validNotifications.filter((n) => !n.read_at).length
  const pendingInquiryCount = inquiryCounts?.pending ?? 0
  const activeIndex = sidebarItems.findIndex((item) => item.id === current)

  return (
    <TooltipProvider delay={TOOLTIP_DELAY_MS}>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:h-full lg:w-[62px] lg:flex-col lg:items-center lg:justify-between select-none shrink-0">
        {/* Top Logo Badge */}
        <div className="flex flex-col items-center gap-5 w-full">
          <Link
            href="/dashboard"
            aria-label="Dashboard Home"
            onClick={navigate("dashboard")}
            className="flex h-[50px] w-[50px] cursor-pointer items-center justify-center rounded-[1rem] bg-white shadow-lg shadow-purple-950/5 border border-white/80 transition-transform hover:scale-105"
          >
            <BrandMark className="size-8 bg-transparent shadow-none p-0" />
          </Link>

          {/* Main Navigation Capsule */}
          <nav className="relative flex w-full flex-col items-center gap-2 rounded-full bg-white/90 p-1.5 shadow-xl shadow-purple-950/5 border border-white/80 backdrop-blur-md">
            {/* Sliding active indicator */}
            <span
              aria-hidden
              className={cn(
                "pointer-events-none absolute left-1.5 top-1.5 h-[50px] w-[50px] rounded-full bg-[#7c3aed] shadow-md shadow-purple-500/25 transition-[translate,opacity] duration-300 ease-out",
                activeIndex >= 0 ? INDICATOR_OFFSETS[activeIndex] : "opacity-0",
              )}
            />
            {sidebarItems.map((item) => (
              <Tooltip key={item.id}>
                <TooltipTrigger
                  render={
                    <DashboardNavLink
                      item={item}
                      active={current === item.id}
                      onClick={navigate(item.id)}
                      indicator
                    />
                  }
                />
                <TooltipContent side="right" sideOffset={10}>
                  {item.label}
                </TooltipContent>
              </Tooltip>
            ))}
          </nav>
        </div>

        {/* Bottom Actions Capsule */}
        <div className="flex w-full flex-col items-center gap-2 rounded-full bg-white/90 p-1.5 shadow-xl shadow-purple-950/5 border border-white/80 backdrop-blur-md">
          <Tooltip>
            <TooltipTrigger
              render={
                <Link
                  href="/notifications"
                  aria-label="Notifications"
                  onClick={navigate("notifications")}
                  className={cn(
                    "relative flex h-[50px] w-[50px] items-center justify-center rounded-full transition-colors duration-200",
                    current === "notifications"
                      ? "bg-[#7c3aed] text-white shadow-md shadow-purple-500/25"
                      : "text-[#7c3aed]/80 hover:bg-purple-50/80 hover:text-[#7c3aed]"
                  )}
                />
              }
            >
              <Bell className="size-5" />
              {unreadCount > 0 && (
                <span className="absolute top-3 right-3 size-2 rounded-full bg-rose-500 ring-2 ring-white" />
              )}
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={10}>
              Notifications
            </TooltipContent>
          </Tooltip>
        </div>
      </aside>

      {/* Mobile Navigation Bar */}
      <nav className="fixed inset-x-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-50 flex items-center justify-around rounded-full bg-white/95 p-1.5 shadow-2xl shadow-purple-950/15 border border-white/80 backdrop-blur-xl lg:hidden">
        {mobileItems.map((item) => (
          <DashboardNavLink
            key={item.id}
            item={item}
            active={current === item.id}
            onClick={navigate(item.id)}
          />
        ))}
      </nav>

      {current !== "inquiries" && current !== "portfolio" ? (
        <Link
          href="/inquiries"
          aria-label="Inquiries"
          onClick={navigate("inquiries")}
          className="fixed right-0 top-1/2 z-50 flex h-14 w-13 -translate-y-1/2 items-center justify-center rounded-l-2xl bg-[#a100f2] text-white shadow-xl shadow-purple-950/20 transition-colors hover:bg-[#8b00d4] lg:hidden"
        >
          <ClipboardList className="size-5" />
          {pendingInquiryCount > 0 ? (
            <span className="absolute -left-2 -top-2 flex min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white ring-2 ring-white">
              {pendingInquiryCount > 99 ? "99+" : pendingInquiryCount}
            </span>
          ) : null}
        </Link>
      ) : null}
    </TooltipProvider>
  );
}

type DashboardNavLinkProps = Omit<ComponentProps<typeof Link>, "href"> & {
  item: SidebarItem;
  active: boolean;
  /** True when a sliding indicator draws the active background behind the link. */
  indicator?: boolean;
};

function DashboardNavLink({ item, active, indicator, className, ...props }: DashboardNavLinkProps) {
  const Icon = item.icon;

  return (
    <Link
      {...props}
      href={item.href}
      aria-label={item.label}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative inline-flex h-[50px] w-[50px] cursor-pointer items-center justify-center rounded-full transition-colors duration-200",
        active
          ? cn("text-white", !indicator && "bg-[#7c3aed] shadow-md shadow-purple-500/25")
          : "text-[#7c3aed]/80 hover:bg-purple-50/80 hover:text-[#7c3aed]",
        className,
      )}
    >
      <Icon className="size-5" />
    </Link>
  );
}
