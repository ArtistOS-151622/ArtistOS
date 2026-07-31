import Link from "next/link";
import {
  Bell,
  CalendarDays,
  CalendarCheck,
  Grid2X2,
  Sparkles,
  UsersRound,
  ImageIcon,
  Settings,
  LifeBuoy,
  MessageSquare,
  type LucideIcon,
} from "lucide-react";

import { BrandMark } from "@/components/common/brand/brand-logo";
import { cn } from "@/lib/utils";

type SidebarItem = {
  id: "dashboard" | "services" | "calendar" | "customers" | "broadcasts" | "bookings" | "portfolio" | "profile" | "support"
  icon: LucideIcon
  href: string
  label: string
}

const sidebarItems: SidebarItem[] = [
  { id: "dashboard", icon: Grid2X2, href: "/dashboard", label: "Dashboard" },
  { id: "bookings", icon: CalendarCheck, href: "/bookings", label: "Bookings" },
  { id: "portfolio", icon: ImageIcon, href: "/portfolio", label: "Portfolio" },
  { id: "services", icon: Sparkles, href: "/services", label: "Services" },
  { id: "customers", icon: UsersRound, href: "/customers", label: "Customers" },
  { id: "broadcasts", icon: MessageSquare, href: "/broadcasts", label: "Broadcasts" },
  { id: "calendar", icon: CalendarDays, href: "/calendar", label: "Calendar" },
  { id: "support", icon: LifeBuoy, href: "/support", label: "Support" },
]

type DashboardSidebarProps = {
  active: SidebarItem["id"];
};

export function DashboardSidebar({ active }: DashboardSidebarProps) {
  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:h-full lg:w-[62px] lg:flex-col lg:items-center lg:justify-between select-none shrink-0">
        {/* Top Logo Badge */}
        <div className="flex flex-col items-center gap-5 w-full">
          <Link
            href="/dashboard"
            aria-label="Dashboard Home"
            className="flex h-[50px] w-[50px] items-center justify-center rounded-[1rem] bg-white shadow-lg shadow-purple-950/5 border border-white/80 transition hover:scale-105"
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
          <button
            type="button"
            aria-label="Notifications"
            className="relative flex h-[50px] w-[50px] items-center justify-center rounded-full text-[#7c3aed]/80 transition hover:bg-purple-50/80 hover:text-[#7c3aed]"
          >
            <Bell className="size-5" />
            <span className="absolute top-3 right-3 size-2 rounded-full bg-rose-500 ring-2 ring-white" />
          </button>

          {/* Settings / Profile */}
          <Link
            href="/profile"
            aria-label="Settings & Profile"
            className={cn(
              "flex h-[50px] w-[50px] items-center justify-center rounded-full transition",
              active === "profile"
                ? "bg-[#7c3aed] text-white shadow-md shadow-purple-500/25"
                : "text-[#7c3aed]/80 hover:bg-purple-50/80 hover:text-[#7c3aed]",
            )}
          >
            <Settings className="size-5" />
          </Link>
        </div>
      </aside>

      {/* Mobile Navigation Bar */}
      <nav className="fixed inset-x-4 bottom-4 z-50 flex items-center justify-around rounded-full bg-white/95 p-1.5 shadow-2xl shadow-purple-950/15 border border-white/80 backdrop-blur-xl lg:hidden">
        {sidebarItems.map((item) => (
          <DashboardNavLink
            key={item.id}
            item={item}
            active={active === item.id}
            className="h-[50px] w-[50px] rounded-full"
          />
        ))}
        <Link
          href="/profile"
          aria-label="Settings"
          className={cn(
            "flex h-[50px] w-[50px] items-center justify-center rounded-full transition",
            active === "profile"
              ? "bg-[#7c3aed] text-white shadow-md shadow-purple-500/25"
              : "text-[#7c3aed]/80 hover:bg-purple-50/80 hover:text-[#7c3aed]",
          )}
        >
          <Settings className="size-5" />
        </Link>
      </nav>
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
      suppressHydrationWarning
      className={cn(
        "inline-flex h-[50px] w-[50px] items-center justify-center rounded-full transition-all duration-200",
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

