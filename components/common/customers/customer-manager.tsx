"use client";

import { useEffect, useState } from "react";
import { Filter, Plus, Search, User } from "lucide-react";

import { AppLoader } from "@/components/common/shared/app-loader";
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
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [values, setValues] = useState<CustomerFormValues>(emptyCustomerForm);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [deleting, setDeleting] = useState<Customer | null>(null);
  const [duplicatePhonePopupOpen, setDuplicatePhonePopupOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState("");

  // Search, filter and pagination states
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("recent");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Fetch customers with pagination and search query
  async function fetchCustomers(
    pageNum: number,
    searchVal: string,
    append = false,
  ) {
    if (pageNum === 1) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }
    setError("");
    try {
      const res = await fetch(
        `/api/customers?page=${pageNum}&search=${encodeURIComponent(searchVal)}`,
      );
      const data = (await res.json()) as CustomersResponse;
      if (!res.ok) {
        setError(data.error ?? "Unable to load customers.");
      } else {
        const fetched = data.customers ?? [];
        setCustomers((prev) => (append ? [...prev, ...fetched] : fetched));
        setHasMore(data.hasMore ?? false);
        setPage(pageNum);
      }
    } catch {
      setError("Unable to load customers.");
    } finally {
      setInitialLoading(false);
      setLoading(false);
      setLoadingMore(false);
    }
  }

  // Debounced search effect
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      void fetchCustomers(1, search, false);
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [search]);

  // Check URL query parameters for ?add=true to automatically open form
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("add") === "true") {
        startCreate();
        const newUrl = window.location.pathname;
        window.history.replaceState({}, "", newUrl);
      }
    }
  }, []);

  async function saveCustomer() {
    setLoading(true);
    setError("");

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
          setError(data.error ?? "Unable to save customer.");
        }
      } else {
        cancelEdit();
        if (editing) {
          void fetchCustomers(1, search, false);
        } else {
          if (search !== "") {
            setSearch("");
          } else {
            void fetchCustomers(1, "", false);
          }
        }
      }
    } catch {
      setError("Unable to save customer.");
    } finally {
      setLoading(false);
    }
  }

  async function deleteCustomer() {
    if (!deleting) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/customers/${deleting.id}`, {
        method: "DELETE",
      });
      const data = (await res.json()) as CustomersResponse;

      if (!res.ok) {
        setError(data.error ?? "Unable to delete customer.");
      } else {
        setDeleting(null);
        void fetchCustomers(1, search, false);
      }
    } catch {
      setError("Unable to delete customer.");
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

  const sortedCustomers = [...customers].sort((a, b) => {
    if (sortBy === "name") {
      return a.customer_name.localeCompare(b.customer_name);
    }
    return 0;
  });

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
              placeholder="Search customer..."
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
                  sortBy !== "recent" && "bg-purple-50 text-[#7c3aed] border-purple-200"
                )}
              >
                <Filter className="size-4 text-[#7c3aed]" />
                <span className="capitalize">{sortBy === "recent" ? "Sort / Filter" : sortBy}</span>
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
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              className="h-11 rounded-2xl bg-[#7c3aed] text-white shadow-md shadow-purple-950/10 hover:bg-[#6d28d9]"
              onClick={startCreate}
            >
              <Plus className="size-4" />
              Add customer
            </Button>
          </div>
        }
      />

      {/* Mobile Control Row: 80% Search | 10% Plus Customer Button | 10% Funnel Filter Button */}
      <div className="flex items-center gap-2 w-full md:hidden">
        {/* 80% Width Search */}
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#858aa5]" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search customer..."
            className="h-11 rounded-2xl border-slate-100/80 bg-white pl-10 shadow-md shadow-purple-950/5 w-full text-sm"
          />
        </div>

        {/* 10% Width Add Customer Button (Plus Icon Only) */}
        <Button
          type="button"
          aria-label="Add customer"
          className="h-11 w-11 shrink-0 rounded-2xl bg-[#7c3aed] text-white p-0 shadow-md shadow-purple-950/10 hover:bg-[#6d28d9] flex items-center justify-center"
          onClick={startCreate}
        >
          <Plus className="size-5" />
        </Button>

        {/* 10% Width Filter Button (Funnel Icon Only) */}
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label="Filter customers"
            className={cn(
              "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-100/80 bg-white p-0 shadow-md shadow-purple-950/5 outline-none transition hover:bg-slate-50",
              sortBy !== "recent" && "bg-purple-50 text-[#7c3aed] border-purple-200"
            )}
          >
            <Filter className="size-5 text-[#7c3aed]" />
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
          label="Loading customers"
          className="min-h-[52vh] rounded-[2rem] bg-white/45"
        />
      ) : customers.length ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {customers.map((customer) => (
              <CustomerCard
                key={customer.id}
                customer={customer}
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
                onClick={() => void fetchCustomers(page + 1, search, true)}
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
