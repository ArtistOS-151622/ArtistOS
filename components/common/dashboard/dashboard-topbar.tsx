"use client";

import { Plus, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { BrandMark } from "@/components/common/brand/brand-logo";
import { useHeaderContext } from "@/components/common/dashboard/dashboard-header-context";
import { UserMenu } from "@/components/common/dashboard/user-menu";
import { QuickAddModals } from "@/components/common/dashboard/quick-add-modals";
import { buttonVariants, Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState } from "react";

export function DashboardTopbar() {
  const { searchSlot, actionsSlot, title, description, backLink } = useHeaderContext();
  const pathname = usePathname() || "";

  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);

  // Infer active state from URL
  const active = pathname.includes("/bookings")
    ? "bookings"
    : pathname.includes("/customers")
      ? "customers"
      : pathname.includes("/services")
        ? "services"
        : pathname.includes("/calendar")
          ? "calendar"
          : pathname.includes("/profile")
            ? "profile"
            : "dashboard";

  return (
    <header suppressHydrationWarning className="flex flex-col gap-4 mt-1">
      {/* Mobile Topbar Row */}
      <div className="flex items-center justify-between gap-3 md:hidden w-full">
        <div className="flex items-center gap-2.5 min-w-0">
          <Link
            href="/dashboard"
            aria-label="Dashboard Home"
            contentEditable={false}
            suppressHydrationWarning
            className="flex size-12 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-white shadow-md shadow-purple-950/5 border border-white/80"
          >
            <BrandMark className="size-8 bg-transparent shadow-none p-0" />
          </Link>
          {backLink && (
            <Link
              href={backLink}
              className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors mr-1"
              title="Go back"
            >
              <ArrowLeft className="size-5" />
            </Link>
          )}
          <h1 className="text-xl font-bold tracking-tight text-slate-900 truncate">
            {title}
          </h1>
        </div>
        <div className="shrink-0">
          <UserMenu showActions />
        </div>
      </div>

      {/* Desktop Topbar Row */}
      <div className="hidden md:flex md:items-center md:justify-between w-full gap-4">
        <div className="flex items-center gap-3">
          {backLink && (
            <Link
              href={backLink}
              className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
              title="Go back"
            >
              <ArrowLeft className="size-5" />
            </Link>
          )}
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
            {title}
          </h1>
          {/* {description ? (
            <p className="mt-1 max-w-2xl text-sm leading-6 text-[#5f637e]">
              {description}
            </p>
          ) : null} */}
        </div>

        <div className="flex items-center gap-3">
          {/* Search Bar Area */}
          {searchSlot}

          {/* Action Button Area */}
          {actionsSlot ? (
            actionsSlot
          ) : active === "dashboard" ? (
            <div className="flex gap-2">
              <Button
                onClick={() => setCustomerModalOpen(true)}
                className={cn(
                  buttonVariants({ variant: "default" }),
                  "h-11 rounded-2xl bg-[#7c3aed] text-white shadow-md shadow-purple-950/10 hover:bg-[#6d28d9]",
                )}
              >
                <Plus className="size-4" />
                Add customer
              </Button>
              <Button
                onClick={() => setBookingModalOpen(true)}
                className={cn(
                  buttonVariants({ variant: "default" }),
                  "h-11 rounded-2xl bg-[#7c3aed] text-white shadow-md shadow-purple-950/10 hover:bg-[#6d28d9]",
                )}
              >
                <Plus className="size-4" />
                New booking
              </Button>
            </div>
          ) : active === "calendar" ? (
            <Button
              onClick={() => setBookingModalOpen(true)}
              className={cn(
                buttonVariants({ variant: "default" }),
                "h-11 rounded-2xl bg-[#7c3aed] text-white shadow-md shadow-purple-950/10 hover:bg-[#6d28d9]",
              )}
            >
              <Plus className="size-4" />
              New booking
            </Button>
          ) : null}

          <UserMenu />
        </div>
      </div>

      {/* Mobile Search & Actions Slot */}
      {(searchSlot || actionsSlot) && (
        <div className="flex items-center gap-2 w-full max-w-full min-w-0 md:hidden pt-1">
          {searchSlot && <div className="flex-1 min-w-0">{searchSlot}</div>}
          {actionsSlot && <div className="shrink-0 flex items-center gap-2">{actionsSlot}</div>}
        </div>
      )}

      <QuickAddModals
        customerModalOpen={customerModalOpen}
        setCustomerModalOpen={setCustomerModalOpen}
        bookingModalOpen={bookingModalOpen}
        setBookingModalOpen={setBookingModalOpen}
      />
    </header>
  );
}
