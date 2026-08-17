"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Filter, Plus, Search, User, MessageSquare } from "lucide-react";
import { toast } from "sonner";

import { SkeletonCard } from "@/components/common/shared/skeleton-card";
import { AppModal } from "@/components/common/shared/app-modal";
import { ConfirmDialog } from "@/components/common/shared/confirm-dialog";
import { CustomerCard } from "@/components/common/customers/customer-card";
import { CustomerForm } from "@/components/common/customers/customer-form";
import {
  emptyCustomerForm,
  type Customer,
  type CustomerFormValues,
} from "@/components/common/customers/customer-types";
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

type CustomersResponse = {
  customers?: Customer[];
  customer?: Customer;
  hasMore?: boolean;
  error?: string;
};

export function CustomerManager() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const didInitialFetch = useRef(false);
  const pendingScrollId = useRef<number | null>(null);
  const initialPage = Math.max(1, Number(searchParams.get("page")) || 1);
  const initialSearch = searchParams.get("search") ?? "";
  const initialSort = searchParams.get("sort") ?? "recent";
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [values, setValues] = useState<CustomerFormValues>(emptyCustomerForm);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [deleting, setDeleting] = useState<Customer | null>(null);
  const [duplicatePhonePopupOpen, setDuplicatePhonePopupOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // Search, filter and pagination states
  const [search, setSearch] = useState(initialSearch);
  const [sortBy, setSortBy] = useState(initialSort);
  const [page, setPage] = useState(initialPage);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    if (loading || loadingMore || pendingScrollId.current === null) return;

    const targetId = pendingScrollId.current;
    const target = document.querySelector(
      `[data-customer-id="${targetId}"]`,
    );

    if (!target) return;

    pendingScrollId.current = null;
    target.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [customers, loading, loadingMore]);

  function replaceListUrl(pageNum: number, searchVal: string, sortVal: string) {
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

    if (sortVal !== "recent") {
      nextParams.set("sort", sortVal);
    } else {
      nextParams.delete("sort");
    }

    nextParams.delete("add");

    const query = nextParams.toString();
    router.replace(`/customers${query ? `?${query}` : ""}`, {
      scroll: false,
    });
  }

  // Fetch customers with pagination and search query
  async function fetchCustomers(
    pageNum: number,
    searchVal: string,
    sortVal: string,
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
        `/api/customers?page=${pageNum}&search=${encodeURIComponent(searchVal)}&sort=${encodeURIComponent(sortVal)}`,
      );
      const data = (await res.json()) as CustomersResponse;
      if (!res.ok) {
        toast.error(data.error ?? "Unable to load customers.");
      } else {
        const fetched = data.customers ?? [];
        setCustomers((prev) => (append ? [...prev, ...fetched] : fetched));
        setHasMore(data.hasMore ?? false);
        setPage(pageNum);
        if (syncUrl) replaceListUrl(pageNum, searchVal, sortVal);
      }
    } catch {
      toast.error("Unable to load customers.");
    } finally {
      setInitialLoading(false);
      setLoading(false);
      setLoadingMore(false);
    }
  }

  async function fetchCustomersThrough(
    pageNum: number,
    searchVal: string,
    sortVal: string,
  ) {
    setLoading(true);

    try {
      const responses = await Promise.all(
        Array.from({ length: pageNum }, (_, index) =>
          fetch(
            `/api/customers?page=${index + 1}&search=${encodeURIComponent(searchVal)}&sort=${encodeURIComponent(sortVal)}`,
          ),
        ),
      );
      const payloads = (await Promise.all(
        responses.map((res) => res.json()),
      )) as CustomersResponse[];
      const failedIndex = responses.findIndex((res) => !res.ok);

      if (failedIndex !== -1) {
        toast.error(payloads[failedIndex]?.error ?? "Unable to load customers.");
        return;
      }

      setCustomers(payloads.flatMap((payload) => payload.customers ?? []));
      setHasMore(payloads[payloads.length - 1]?.hasMore ?? false);
      setPage(pageNum);
      replaceListUrl(pageNum, searchVal, sortVal);
    } catch {
      toast.error("Unable to load customers.");
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
        void fetchCustomersThrough(initialPage, search, sortBy);
        return;
      }

      void fetchCustomers(1, search, sortBy, false);
    }, 300);

    return () => clearTimeout(delayDebounceFn);
    // The fetch helpers read the latest state; search/sort are the only values
    // that should restart this debounce.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, sortBy]);

  // Check URL query parameters for ?add=true to automatically open form
  useEffect(() => {
    if (searchParams.get("add") === "true") {
      startCreate();
      const newParams = new URLSearchParams(searchParams.toString());
      newParams.delete("add");
      const query = newParams.toString();
      router.replace(`/customers${query ? `?${query}` : ""}`, {
        scroll: false,
      });
    }
  }, [searchParams, router]);

  async function saveCustomer() {
    setLoading(true);

    const payload = {
      customer_name: values.customer_name.trim(),
      phone: values.phone.trim(),
      alt_phone: values.alt_phone.trim() || null,
      email: values.email.trim(),
      address: values.address.trim(),
      reference_by: values.reference_by.trim() || null,
    };

    try {
      const res = await fetch(
        editing ? `/api/customers/${editing.id}` : "/api/customers",
        {
          method: editing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data = (await res.json()) as CustomersResponse;

      if (!res.ok || !data.customer) {
        if (data.error === "phone_exists") {
          setDuplicatePhonePopupOpen(true);
          cancelEdit();
        } else {
          toast.error(data.error ?? "Unable to save customer.");
        }
      } else {
        if (editing) pendingScrollId.current = editing.id;
        cancelEdit();
        if (editing) {
          void fetchCustomersThrough(page, search, sortBy);
        } else {
          if (search !== "") {
            setSearch("");
          } else {
            void fetchCustomers(1, "", sortBy, false);
          }
        }
      }
    } catch {
      toast.error("Unable to save customer.");
    } finally {
      setLoading(false);
    }
  }

  async function deleteCustomer() {
    if (!deleting) return;
    setLoading(true);

    try {
      const res = await fetch(`/api/customers/${deleting.id}`, {
        method: "DELETE",
      });
      const data = (await res.json()) as CustomersResponse;

      if (!res.ok) {
        toast.error(data.error ?? "Unable to delete customer.");
      } else {
        setDeleting(null);
        void fetchCustomersThrough(page, search, sortBy);
      }
    } catch {
      toast.error("Unable to delete customer.");
    } finally {
      setLoading(false);
    }
  }

  function startEdit(customer: Customer) {
    setEditing(customer);
    setFormOpen(true);
    setValues({
      customer_name: customer.customer_name,
      phone: customer.phone,
      alt_phone: customer.alt_phone ?? "",
      email: customer.email,
      address: customer.address,
      reference_by: customer.reference_by ?? "",
    });
  }

  function cancelEdit() {
    setEditing(null);
    setValues(emptyCustomerForm);
    setFormOpen(false);
  }

  function startCreate() {
    setEditing(null);
    setValues(emptyCustomerForm);
    setFormOpen(true);
  }

  return (
    <div className="space-y-5">
      {/* Header Portal */}
      <HeaderPortal
        search={
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#858aa5]" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search customer..."
              className="h-11 rounded-2xl border-slate-100/80 bg-white pl-10 shadow-md shadow-purple-950/5 w-full text-sm"
            />
          </div>
        }
        actions={
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger
                className={cn(
                  "inline-flex h-11 w-11 md:w-auto items-center justify-center gap-2 rounded-2xl border border-slate-100/80 bg-white px-0 md:px-3 text-xs font-semibold shadow-md shadow-purple-950/5 outline-none transition hover:bg-slate-50 shrink-0",
                  sortBy !== "recent" && "bg-purple-50 text-[#7c3aed] border-purple-200"
                )}
                aria-label="Sort / Filter"
              >
                <Filter className="size-4 text-[#7c3aed]" />
                <span className="hidden md:inline capitalize">{sortBy === "recent" ? "Sort / Filter" : sortBy}</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 rounded-2xl p-1.5">
                <DropdownMenuLabel className="text-xs font-semibold text-slate-500 px-2 py-1">
                  Sort Customers
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup value={sortBy} onValueChange={setSortBy}>
                  <DropdownMenuRadioItem value="recent" className="rounded-xl cursor-pointer">
                    Recently Added
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="name" className="rounded-xl cursor-pointer">
                    Name (A-Z)
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="most_bookings" className="rounded-xl cursor-pointer">
                    Most Bookings
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              aria-label="Add customer"
              className="h-11 w-11 md:w-auto rounded-2xl bg-[#7c3aed] text-white shadow-md shadow-purple-950/10 hover:bg-[#6d28d9] px-0 md:px-4 shrink-0 flex items-center justify-center"
              onClick={startCreate}
            >
              <Plus className="size-5 md:size-4" />
              <span className="hidden md:inline ml-1.5 font-semibold">Add customer</span>
            </Button>

            <Button
              aria-label="Broadcasts"
              variant="outline"
              className="h-11 w-11 md:w-auto rounded-2xl border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-sm px-0 md:px-4 shrink-0 flex items-center justify-center"
              onClick={() => router.push("/customers/broadcasts")}
            >
              <MessageSquare className="size-5 md:size-4 text-[#7c3aed]" />
              <span className="hidden md:inline ml-1.5 font-semibold">Broadcasts</span>
            </Button>
          </div>
        }
      />


      {initialLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : customers.length ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {customers.map((customer) => (
              <div key={customer.id} data-customer-id={customer.id}>
                <CustomerCard
                  customer={customer}
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
                onClick={() => void fetchCustomers(page + 1, search, sortBy, true)}
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
              No customers added yet
            </h3>
            <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
              Add your clients with their contact details and reference info to
              keep everything organised.
            </p>
          </CardContent>
        </Card>
      )}

      <ConfirmDialog
        open={duplicatePhonePopupOpen}
        title="Duplicate Phone Number"
        description="this customer link with same mobile no which is already exist please try another mobile no or customer."
        confirmText="OK"
        confirmVariant="default"
        onConfirm={() => setDuplicatePhonePopupOpen(false)}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete customer?"
        description={`This will permanently remove ${deleting?.customer_name ?? "this customer"} from your records.`}
        confirmText="Delete"
        onCancel={() => setDeleting(null)}
        onConfirm={deleteCustomer}
      />

      <AppModal
        open={formOpen}
        icon={<User className="size-5" />}
        title={editing ? "Edit customer" : "Add customer"}
        description="Fill in the customer's contact details. Alt phone and reference are optional."
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
              form="customer-form"
              type="submit"
              className="h-11 rounded-2xl bg-[#7c3aed] hover:bg-[#6d28d9] text-white shadow-md shadow-purple-950/10"
              disabled={loading}
            >
              {editing ? "Update customer" : "Add customer"}
            </Button>
          </>
        }
      >
        <CustomerForm
          values={values}
          loading={loading}
          submitText={editing ? "Update customer" : "Add customer"}
          onChange={setValues}
          onSubmit={saveCustomer}
          onCancel={cancelEdit}
        />
      </AppModal>
    </div>
  );
}
