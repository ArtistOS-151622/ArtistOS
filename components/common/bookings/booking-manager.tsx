"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Calendar, Filter, Plus, Search } from "lucide-react";

import { AppLoader } from "@/components/common/shared/app-loader";
import { AppModal } from "@/components/common/shared/app-modal";
import { ConfirmDialog } from "@/components/common/shared/confirm-dialog";
import { BookingCard } from "@/components/common/bookings/booking-card";
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
  const initialPage = Math.max(1, Number(searchParams.get("page")) || 1);
  const initialSearch = searchParams.get("search") ?? "";
  const initialStatus = searchParams.get("status") ?? "all";
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [values, setValues] = useState<BookingFormValues>(emptyBookingForm);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Booking | null>(null);
  const [deleting, setDeleting] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState("");

  // Search, filter and pagination states
  const [search, setSearch] = useState(initialSearch);
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [page, setPage] = useState(initialPage);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

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
    setError("");

    try {
      const res = await fetch(
        `/api/bookings?page=${pageNum}&search=${encodeURIComponent(searchVal)}&status=${encodeURIComponent(statusVal)}`,
      );
      const data = (await res.json()) as BookingsResponse;

      if (!res.ok) {
        setError(data.error ?? "Unable to load bookings.");
      } else {
        const fetched = data.bookings ?? [];
        setBookings((prev) => (append ? [...prev, ...fetched] : fetched));
        setHasMore(data.hasMore ?? false);
        setPage(pageNum);
        if (syncUrl) replaceListUrl(pageNum, searchVal, statusVal);
      }
    } catch {
      setError("Unable to load bookings.");
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
    setError("");

    try {
      const responses = await Promise.all(
        Array.from({ length: pageNum }, (_, index) =>
          fetch(
            `/api/bookings?page=${index + 1}&search=${encodeURIComponent(searchVal)}&status=${encodeURIComponent(statusVal)}`,
          ),
        ),
      );
      const payloads = (await Promise.all(
        responses.map((res) => res.json()),
      )) as BookingsResponse[];
      const failedIndex = responses.findIndex((res) => !res.ok);

      if (failedIndex !== -1) {
        setError(payloads[failedIndex]?.error ?? "Unable to load bookings.");
        return;
      }

      setBookings(payloads.flatMap((payload) => payload.bookings ?? []));
      setHasMore(payloads[payloads.length - 1]?.hasMore ?? false);
      setPage(pageNum);
      replaceListUrl(pageNum, searchVal, statusVal);
    } catch {
      setError("Unable to load bookings.");
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
  }, [search, statusFilter]);

  async function saveBooking() {
    setLoading(true);
    setError("");

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
        setError(data.error ?? "Unable to save booking.");
      } else {
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
      setError("Unable to save booking.");
    } finally {
      setLoading(false);
    }
  }

  async function deleteBooking() {
    if (!deleting) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/bookings/${deleting.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Unable to delete booking.");
      } else {
        setDeleting(null);
        void fetchBookingsThrough(page, search, statusFilter);
      }
    } catch {
      setError("Unable to delete booking.");
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
      startCreate();
      const newParams = new URLSearchParams(searchParams.toString());
      newParams.delete("add");
      const query = newParams.toString();
      router.replace(`/bookings${query ? `?${query}` : ""}`);
    }
  }, [searchParams, router]);

  return (
    <div className="space-y-5">
      {/* Desktop Header Portal */}
      <HeaderPortal
        search={
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#858aa5]" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search booking..."
              className="h-11 rounded-2xl border-slate-100/80 bg-white pl-10 shadow-md shadow-purple-950/5 w-full"
            />
          </div>
        }
        actions={
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger
                className={cn(
                  "inline-flex h-11 items-center gap-2 rounded-2xl border border-slate-100/80 bg-white px-3 text-xs font-semibold shadow-md shadow-purple-950/5 outline-none transition hover:bg-slate-50",
                  statusFilter !== "all" && "bg-purple-50 text-[#7c3aed] border-purple-200"
                )}
              >
                <Filter className="size-4 text-[#7c3aed]" />
                <span className="capitalize">{statusFilter === "all" ? "All Status" : statusFilter}</span>
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
                  <DropdownMenuRadioItem value="canceled" className="rounded-xl cursor-pointer">
                    Canceled
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              className="h-11 rounded-2xl bg-[#7c3aed] text-white shadow-md shadow-purple-950/10 hover:bg-[#6d28d9]"
              onClick={startCreate}
            >
              <Plus className="size-4" />
              Add booking
            </Button>
          </div>
        }
      />

      {/* Mobile Control Row: 80% Search | 10% Plus Booking Button | 10% Funnel Filter Button */}
      <div className="flex items-center gap-2 w-full md:hidden">
        {/* 80% Width Search */}
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#858aa5]" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search booking..."
            className="h-11 rounded-2xl border-slate-100/80 bg-white pl-10 shadow-md shadow-purple-950/5 w-full text-sm"
          />
        </div>

        {/* 10% Width Add Booking Button (Plus Icon Only) */}
        <Button
          type="button"
          aria-label="Add booking"
          className="h-11 w-11 shrink-0 rounded-2xl bg-[#7c3aed] text-white p-0 shadow-md shadow-purple-950/10 hover:bg-[#6d28d9] flex items-center justify-center"
          onClick={startCreate}
        >
          <Plus className="size-5" />
        </Button>

        {/* 10% Width Filter Button (Funnel Icon Only) */}
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label="Filter bookings"
            className={cn(
              "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-100/80 bg-white p-0 shadow-md shadow-purple-950/5 outline-none transition hover:bg-slate-50",
              statusFilter !== "all" && "bg-purple-50 text-[#7c3aed] border-purple-200"
            )}
          >
            <Filter className="size-5 text-[#7c3aed]" />
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
              <DropdownMenuRadioItem value="canceled" className="rounded-xl cursor-pointer">
                Canceled
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {error ? (
        <p className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
          {error}
        </p>
      ) : null}

      {initialLoading ? (
        <AppLoader
          label="Loading bookings"
          className="min-h-[52vh] rounded-[2rem] bg-white/45"
        />
      ) : bookings.length ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {bookings.map((booking) => (
              <BookingCard
                key={booking.id}
                booking={booking}
                onEdit={startEdit}
                onDelete={setDeleting}
              />
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
        <Card className="rounded-[1.75rem] border-dashed border-slate-200 bg-white/80 shadow-md shadow-purple-950/5">
          <CardContent className="flex flex-col items-center justify-center p-10 text-center">
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
            <Button
              form="booking-form"
              type="submit"
              className="h-11 rounded-2xl bg-[#7c3aed] hover:bg-[#6d28d9] text-white shadow-md shadow-purple-950/10"
              disabled={loading}
            >
              {editing ? "Update booking" : "Create booking"}
            </Button>
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
