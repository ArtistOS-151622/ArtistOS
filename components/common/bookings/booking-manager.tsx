"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import { toast } from "sonner";
import { Calendar, Filter, Plus, Search, LayoutGrid } from "lucide-react";

import { SkeletonCard } from "@/components/common/shared/skeleton-card";
import { BookingDateFilter } from "@/components/common/bookings/booking-date-filter";
import { AppModal } from "@/components/common/shared/app-modal";
import { ConfirmDialog } from "@/components/common/shared/confirm-dialog";
import { BookingCard } from "@/components/common/bookings/booking-card";
import { ArtistCalendar } from "@/components/common/calendar/artist-calendar";
import { BookingForm } from "@/components/common/bookings/booking-form";
import {
  emptyBookingForm,
  type Booking,
  type BookingFormValues,
} from "@/components/common/bookings/booking-types";
import { HeaderPortal } from "@/components/common/dashboard/dashboard-header-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type BookingsResponse = {
  bookings?: Booking[];
  booking?: Booking;
  hasMore?: boolean;
  error?: string;
};

export function BookingManager() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const didInitialFetch = useRef(false);
  const pendingScrollId = useRef<number | null>(null);
  const initialPage = Math.max(1, Number(searchParams.get("page")) || 1);
  const initialSearch = searchParams.get("search") ?? "";
  const initialStatus = searchParams.get("status") ?? "all";
  const initialDate = searchParams.get("date") ?? format(new Date(), "yyyy-MM-dd");
  const [date, setDate] = useState(initialDate);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [values, setValues] = useState<BookingFormValues>(emptyBookingForm);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Booking | null>(null);
  const [deleting, setDeleting] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // View state
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");

  // Search, filter and pagination states
  const [search, setSearch] = useState(initialSearch);
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [page, setPage] = useState(initialPage);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    if (loading || loadingMore || pendingScrollId.current === null) return;

    const targetId = pendingScrollId.current;
    const target = document.querySelector(
      `[data-booking-id="${targetId}"]`,
    );

    if (!target) return;

    pendingScrollId.current = null;
    target.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [bookings, loading, loadingMore]);

  function replaceListUrl(pageNum: number, searchVal: string, statusVal: string) {
    const nextParams = new URLSearchParams(searchParams.toString());

    if (pageNum > 1) {
      nextParams.set("page", String(pageNum));
    } else {
      nextParams.delete("page");
    }

    if (searchVal.trim()) {
      nextParams.set("search", searchVal.trim());
    } else {
      nextParams.delete("search");
    }

    if (statusVal !== "all") {
      nextParams.set("status", statusVal);
    } else {
      nextParams.delete("status");
    }

    if (date) {
      nextParams.set("date", date);
    } else {
      nextParams.delete("date");
    }

    nextParams.delete("add");

    const query = nextParams.toString();
    router.replace(`/bookings${query ? `?${query}` : ""}`, { scroll: false });
  }

  // Fetch bookings from api
  async function fetchBookings(
    pageNum: number,
    searchVal: string,
    statusVal: string,
    append = false,
    syncUrl = true,
  ) {
    if (pageNum === 1) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const res = await fetch(
        `/api/bookings?page=${pageNum}&search=${encodeURIComponent(searchVal)}&status=${encodeURIComponent(statusVal)}&start_date=${date}&end_date=${date}`,
      );
      const data = (await res.json()) as BookingsResponse;

      if (!res.ok) {
        toast.error(data.error ?? "Unable to load bookings.");
      } else {
        const fetched = data.bookings ?? [];
        setBookings((prev) => (append ? [...prev, ...fetched] : fetched));
        setHasMore(data.hasMore ?? false);
        setPage(pageNum);
        if (syncUrl) replaceListUrl(pageNum, searchVal, statusVal);
      }
    } catch {
      toast.error("Unable to load bookings.");
    } finally {
      setInitialLoading(false);
      setLoading(false);
      setLoadingMore(false);
    }
  }

  async function fetchBookingsThrough(
    pageNum: number,
    searchVal: string,
    statusVal: string,
  ) {
    setLoading(true);

    try {
      const responses = await Promise.all(
        Array.from({ length: pageNum }, (_, index) =>
          fetch(
            `/api/bookings?page=${index + 1}&search=${encodeURIComponent(searchVal)}&status=${encodeURIComponent(statusVal)}&start_date=${date}&end_date=${date}`,
          ),
        ),
      );
      const payloads = (await Promise.all(
        responses.map((res) => res.json()),
      )) as BookingsResponse[];
      const failedIndex = responses.findIndex((res) => !res.ok);

      if (failedIndex !== -1) {
        toast.error(payloads[failedIndex]?.error ?? "Unable to load bookings.");
        return;
      }

      setBookings(payloads.flatMap((payload) => payload.bookings ?? []));
      setHasMore(payloads[payloads.length - 1]?.hasMore ?? false);
      setPage(pageNum);
      replaceListUrl(pageNum, searchVal, statusVal);
    } catch {
      toast.error("Unable to load bookings.");
    } finally {
      setInitialLoading(false);
      setLoading(false);
      setLoadingMore(false);
    }
  }

  // Debounced search effect
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (!didInitialFetch.current) {
        didInitialFetch.current = true;
        void fetchBookingsThrough(initialPage, search, statusFilter);
        return;
      }

      void fetchBookings(1, search, statusFilter, false);
    }, 300);

    return () => clearTimeout(delayDebounceFn);
    // The fetch helpers read the latest state; search/status are the only
    // values that should restart this debounce.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, statusFilter, date]);

  async function saveBooking() {
    setLoading(true);

    const payload = {
      customer_id: values.customer_id,
      booking_address: values.booking_address.trim(),
      booking_date: values.booking_date,
      start_time: values.start_time,
      end_time: values.end_time,
      status: values.status,
      services: values.services,
      additional_request: values.additional_request.trim() || null,
    };

    try {
      const res = await fetch(
        editing ? `/api/bookings/${editing.id}` : "/api/bookings",
        {
          method: editing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data = (await res.json()) as BookingsResponse;

      if (!res.ok || !data.booking) {
        toast.error(data.error ?? "Unable to save booking.");
      } else {
        toast.success(editing ? "Booking updated successfully" : "Booking created successfully");
        if (editing) pendingScrollId.current = editing.id;
        cancelEdit();
        if (editing) {
          void fetchBookingsThrough(page, search, statusFilter);
        } else {
          if (search !== "") {
            setSearch("");
          } else {
            void fetchBookings(1, "", statusFilter, false);
          }
        }
      }
    } catch {
      toast.error("Unable to save booking.");
    } finally {
      setLoading(false);
    }
  }

  async function deleteBooking() {
    if (!deleting) return;
    setLoading(true);

    try {
      const res = await fetch(`/api/bookings/${deleting.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error ?? "Unable to delete booking.");
      } else {
        toast.success("Booking deleted successfully");
        setDeleting(null);
        void fetchBookingsThrough(page, search, statusFilter);
      }
    } catch {
      toast.error("Unable to delete booking.");
    } finally {
      setLoading(false);
    }
  }

  function startEdit(booking: Booking) {
    setEditing(booking);
    setFormOpen(true);
    setValues({
      customer_id: String(booking.customer_id),
      booking_address: booking.booking_address,
      booking_date: booking.booking_date,
      start_time: booking.start_time.substring(0, 5), // Keep only HH:MM
      end_time: booking.end_time.substring(0, 5), // Keep only HH:MM
      services: booking.services?.map((s) => String(s.id)) ?? [],
      status: booking.status,
      additional_request: booking.additional_request ?? "",
      initial_customer: booking.customer
        ? {
            id: booking.customer_id,
            customer_name: booking.customer.customer_name,
            phone: booking.customer.phone,
            email: booking.customer.email,
            address: booking.booking_address, // Use booking's address as a fallback if the customer address isn't returned
          }
        : null,
    });
  }

  function cancelEdit() {
    setEditing(null);
    setValues(emptyBookingForm);
    setFormOpen(false);
  }

  function startCreate() {
    setEditing(null);
    setValues(emptyBookingForm);
    setFormOpen(true);
  }

  useEffect(() => {
    if (searchParams && searchParams.get("add") === "true") {
      const timeout = window.setTimeout(() => {
        startCreate();
      }, 0);
      const newParams = new URLSearchParams(searchParams.toString());
      newParams.delete("add");
      const query = newParams.toString();
      router.replace(`/bookings${query ? `?${query}` : ""}`);
      return () => window.clearTimeout(timeout);
    }
  }, [searchParams, router]);

  return (
    <div className="w-full max-w-full min-w-0 space-y-4 overflow-hidden sm:space-y-5">
      {/* Header Portal */}
      <HeaderPortal
        search={
          <div className="relative w-full md:w-64 lg:w-72">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#858aa5]" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search booking..."
              className="h-11 w-full rounded-2xl border-white/80 bg-white/90 pl-10 text-sm shadow-md shadow-purple-950/5 backdrop-blur placeholder:text-slate-400"
            />
          </div>
        }
        actions={
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex h-11 shrink-0 items-center rounded-2xl border border-white/80 bg-white/65 p-1 shadow-inner shadow-purple-950/5 backdrop-blur">
              <Button
                aria-label="List view"
                variant={viewMode === "list" ? "default" : "ghost"}
                className={cn(
                  "flex h-9 w-9 md:w-10 items-center justify-center rounded-xl p-0 transition-all",
                  viewMode === "list"
                    ? "bg-white text-slate-800 shadow-sm"
                    : "text-slate-500 hover:bg-white/60 hover:text-slate-800"
                )}
                onClick={() => setViewMode("list")}
              >
                <LayoutGrid className="size-4" />
              </Button>
              <Button
                aria-label="Calendar view"
                variant={viewMode === "calendar" ? "default" : "ghost"}
                className={cn(
                  "flex h-9 w-9 md:w-10 items-center justify-center rounded-xl p-0 transition-all",
                  viewMode === "calendar"
                    ? "bg-white text-slate-800 shadow-sm"
                    : "text-slate-500 hover:bg-white/60 hover:text-slate-800"
                )}
                onClick={() => setViewMode("calendar")}
              >
                <Calendar className="size-4" />
              </Button>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger
                className={cn(
                  "inline-flex h-11 w-11 md:w-auto items-center justify-center gap-2 rounded-2xl border border-white/80 bg-white/90 px-0 md:px-3 text-xs font-semibold shadow-md shadow-purple-950/5 outline-none transition hover:bg-slate-50 shrink-0",
                  statusFilter !== "all" && "bg-purple-50 text-[#7c3aed] border-purple-200"
                )}
                aria-label="Filter bookings"
              >
                <Filter className="size-4 text-[#7c3aed]" />
                <span className="hidden md:inline capitalize">{statusFilter === "all" ? "Sort / Filter" : statusFilter}</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 rounded-2xl p-1.5">
                <DropdownMenuLabel className="text-xs font-semibold text-slate-500 px-2 py-1">
                  Filter Status
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup value={statusFilter} onValueChange={setStatusFilter}>
                  <DropdownMenuRadioItem value="all" className="rounded-xl cursor-pointer">
                    All Statuses
                  </DropdownMenuRadioItem>

                  <DropdownMenuRadioItem value="confirmed" className="rounded-xl cursor-pointer">
                    Confirmed
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="pending" className="rounded-xl cursor-pointer">
                    Pending
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="completed" className="rounded-xl cursor-pointer">
                    Completed
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="cancelled" className="rounded-xl cursor-pointer">
                    Cancelled
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              aria-label="Add booking"
              className="flex h-11 w-11 md:w-auto shrink-0 items-center justify-center rounded-2xl bg-[#7c3aed] px-0 md:px-4 text-white shadow-md shadow-purple-950/10 hover:bg-[#6d28d9]"
              onClick={startCreate}
            >
              <Plus className="size-5 md:size-4" />
              <span className="hidden md:inline ml-1.5 font-semibold">New booking</span>
            </Button>
          </div>
        }
      />

      {viewMode === "list" && (
        <BookingDateFilter
          selectedDate={date}
          status={statusFilter}
          onChange={(newDate) => {
            setDate(newDate);
            const nextParams = new URLSearchParams(searchParams.toString());
            nextParams.set("date", newDate);
            nextParams.delete("page");
            router.replace(`/bookings?${nextParams.toString()}`, { scroll: false });
          }}
        />
      )}

      {viewMode === "calendar" ? (
        <ArtistCalendar />
      ) : initialLoading ? (
        <div className="grid min-w-0 grid-cols-1 gap-4 sm:gap-5 min-[900px]:grid-cols-3 2xl:grid-cols-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : bookings.length ? (
        <>
          <div className="grid min-w-0 grid-cols-1 gap-4 sm:gap-5 min-[900px]:grid-cols-3 2xl:grid-cols-4">
            {bookings.map((booking) => (
              <div key={booking.id} className="min-w-0" data-booking-id={booking.id}>
                <BookingCard
                  booking={booking}
                  onEdit={startEdit}
                  onDelete={setDeleting}
                />
              </div>
            ))}
          </div>

          {hasMore ? (
            <div className="flex justify-center pt-4">
              <Button
                variant="outline"
                className="h-11 rounded-2xl px-6 bg-white hover:bg-slate-50 border border-slate-100 shadow-sm"
                onClick={() => void fetchBookings(page + 1, search, statusFilter, true)}
                disabled={loadingMore}
              >
                {loadingMore ? "Loading..." : "Load more"}
              </Button>
            </div>
          ) : null}
        </>
      ) : (
        <Card className="rounded-[1.5rem] border-dashed border-slate-200 bg-white/80 shadow-md shadow-purple-950/5 backdrop-blur">
          <CardContent className="flex flex-col items-center justify-center px-5 py-10 text-center sm:p-12">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-[#f3e8ff] text-[#7c3aed]">
              <Plus className="size-5" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">
              No bookings scheduled yet
            </h3>
            <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
              Schedule appointments for customers, assign mehendi, nails, or
              beauty services and manage status.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete booking?"
        description={`This will permanently remove the booking scheduled for ${deleting?.customer?.customer_name ?? "this customer"}.`}
        confirmText="Delete"
        onCancel={() => setDeleting(null)}
        onConfirm={deleteBooking}
      />

      {/* Main Form Modal */}
      <AppModal
        open={formOpen}
        icon={<Calendar className="size-5" />}
        title={editing ? "Edit booking" : "Add booking"}
        description="Select client, assign services, specify date, timings slot, and booking address."
        onClose={cancelEdit}
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-2xl border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
              onClick={cancelEdit}
            >
              Cancel
            </Button>
            <div className="flex flex-col items-end gap-1">
              <Button
                form="booking-form"
                type="submit"
                className="h-11 rounded-2xl bg-[#7c3aed] hover:bg-[#6d28d9] text-white shadow-md shadow-purple-950/10 disabled:opacity-50"
                disabled={
                  loading ||
                  !values.customer_id ||
                  !values.booking_address.trim() ||
                  !values.booking_date ||
                  !values.start_time ||
                  !values.end_time ||
                  !values.status ||
                  values.services.length === 0
                }
              >
                {editing ? "Update booking" : "Create booking"}
              </Button>
              {values.services.length === 0 && (
                <p className="text-xs text-amber-600 font-medium">
                  Select at least 1 service to continue
                </p>
              )}
            </div>
          </>
        }
      >
        <BookingForm
          values={values}
          loading={loading}
          submitText={editing ? "Update booking" : "Create booking"}
          onChange={setValues}
          onSubmit={saveBooking}
          onCancel={cancelEdit}
        />
      </AppModal>
    </div>
  );
}
