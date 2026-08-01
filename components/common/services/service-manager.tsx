"use client";

import { useEffect, useRef, useState } from "react";
import { Filter, Plus, ScissorsLineDashed, Search } from "lucide-react";
import { AppModal } from "@/components/common/shared/app-modal";
import { SkeletonCard } from "@/components/common/shared/skeleton-card";
import { ConfirmDialog } from "@/components/common/shared/confirm-dialog";
import { ServiceCard } from "@/components/common/services/service-card";
import { ServiceForm } from "@/components/common/services/service-form";
import type {
  ArtistService,
  ServiceFormValues,
} from "@/components/common/services/service-types";
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

const emptyForm: ServiceFormValues = {
  service_name: "",
  duration_minutes: 60,
  price: "",
};

type ServicesResponse = {
  services?: ArtistService[];
  service?: ArtistService;
  error?: string;
};

export function ServiceManager() {
  const pendingScrollId = useRef<number | null>(null);
  const [services, setServices] = useState<ArtistService[]>([]);
  const [values, setValues] = useState<ServiceFormValues>(emptyForm);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ArtistService | null>(null);
  const [deleting, setDeleting] = useState<ArtistService | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState("");

  // Search & Filter states
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("all");

  useEffect(() => {
    if (loading || pendingScrollId.current === null) return;

    const targetId = pendingScrollId.current;
    const target = document.querySelector(
      `[data-service-id="${targetId}"]`,
    );

    if (!target) return;

    pendingScrollId.current = null;
    target.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [services, loading]);

  // Debounced search effect
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      void loadServices(search, sortBy);
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [search, sortBy]);

  async function loadServices(searchVal: string, sortVal: string) {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `/api/services?search=${encodeURIComponent(searchVal)}&sort=${encodeURIComponent(sortVal)}`,
      );
      const data = (await response.json()) as ServicesResponse;

      if (!response.ok) {
        setError(data.error ?? "Unable to load services.");
      } else {
        setServices(data.services ?? []);
      }
    } catch {
      setError("Unable to load services.");
    } finally {
      setInitialLoading(false);
      setLoading(false);
    }
  }

  async function saveService() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        editing ? `/api/services/${editing.id}` : "/api/services",
        {
          method: editing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            service_name: values.service_name,
            duration_minutes: values.duration_minutes,
            price: Number(values.price),
          }),
        },
      );
      const data = (await response.json()) as ServicesResponse;

      if (!response.ok || !data.service) {
        setError(data.error ?? "Unable to save service.");
      } else {
        if (editing) pendingScrollId.current = editing.id;
        cancelEdit();
        if (editing) {
          void loadServices(search, sortBy);
        } else {
          if (search !== "") {
            setSearch("");
          } else {
            void loadServices("", sortBy);
          }
        }
      }
    } catch {
      setError("Unable to save service.");
    } finally {
      setLoading(false);
    }
  }

  async function deleteService() {
    if (!deleting) return;

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/services/${deleting.id}`, {
        method: "DELETE",
      });
      const data = (await response.json()) as ServicesResponse;

      if (!response.ok) {
        setError(data.error ?? "Unable to delete service.");
      } else {
        setDeleting(null);
        void loadServices(search, sortBy);
      }
    } catch {
      setError("Unable to delete service.");
    } finally {
      setLoading(false);
    }
  }

  function startEdit(service: ArtistService) {
    setEditing(service);
    setFormOpen(true);
    setValues({
      service_name: service.service_name,
      duration_minutes: service.duration_minutes,
      price: String(Number(service.price)),
    });
  }

  function cancelEdit() {
    setEditing(null);
    setValues(emptyForm);
    setFormOpen(false);
  }

  function startCreate() {
    setEditing(null);
    setValues(emptyForm);
    setFormOpen(true);
  }

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
              placeholder="Search services..."
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
                  sortBy !== "all" && "bg-purple-50 text-[#7c3aed] border-purple-200"
                )}
              >
                <Filter className="size-4 text-[#7c3aed]" />
                <span className="capitalize">{sortBy === "all" ? "Sort / Filter" : sortBy.replace("_", " ")}</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52 rounded-2xl p-1.5">
                <DropdownMenuLabel className="text-xs font-semibold text-slate-500 px-2 py-1">
                  Sort Services
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup value={sortBy} onValueChange={setSortBy}>
                  <DropdownMenuRadioItem value="all" className="rounded-xl cursor-pointer">
                    All Services
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="price_asc" className="rounded-xl cursor-pointer">
                    Price: Low to High
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="price_desc" className="rounded-xl cursor-pointer">
                    Price: High to Low
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="name_asc" className="rounded-xl cursor-pointer">
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
              Add service
            </Button>
          </div>
        }
      />

      {/* Mobile Control Row: 80% Search | 10% Plus Service Button | 10% Funnel Filter Button */}
      <div className="flex items-center gap-2 w-full md:hidden">
        {/* 80% Width Search */}
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#858aa5]" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search services..."
            className="h-11 rounded-2xl border-slate-100/80 bg-white pl-10 shadow-md shadow-purple-950/5 w-full text-sm"
          />
        </div>

        {/* 10% Width Add Service Button (Plus Icon Only) */}
        <Button
          type="button"
          aria-label="Add service"
          className="h-11 w-11 shrink-0 rounded-2xl bg-[#7c3aed] text-white p-0 shadow-md shadow-purple-950/10 hover:bg-[#6d28d9] flex items-center justify-center"
          onClick={startCreate}
        >
          <Plus className="size-5" />
        </Button>

        {/* 10% Width Filter Button (Funnel Icon Only) */}
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label="Filter services"
            className={cn(
              "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-100/80 bg-white p-0 shadow-md shadow-purple-950/5 outline-none transition hover:bg-slate-50",
              sortBy !== "all" && "bg-purple-50 text-[#7c3aed] border-purple-200"
            )}
          >
            <Filter className="size-5 text-[#7c3aed]" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52 rounded-2xl p-1.5">
            <DropdownMenuLabel className="text-xs font-semibold text-slate-500 px-2 py-1">
              Sort Services
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuRadioGroup value={sortBy} onValueChange={setSortBy}>
              <DropdownMenuRadioItem value="all" className="rounded-xl cursor-pointer">
                All Services
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="price_asc" className="rounded-xl cursor-pointer">
                Price: Low to High
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="price_desc" className="rounded-xl cursor-pointer">
                Price: High to Low
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="name_asc" className="rounded-xl cursor-pointer">
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
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : services.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {services.map((service) => (
            <div key={service.id} data-service-id={service.id}>
              <ServiceCard
                service={service}
                onEdit={startEdit}
                onDelete={setDeleting}
              />
            </div>
          ))}
        </div>
      ) : (
        <Card className="rounded-[1.75rem] border-dashed border-slate-200 bg-white/80 shadow-md shadow-purple-950/5">
          <CardContent className="flex flex-col items-center justify-center p-10 text-center">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-[#f3e8ff] text-[#7c3aed]">
              <Plus className="size-5" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">
              No services added yet
            </h3>
            <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
              Add services like side mehendi, bridal mehendi, nail extensions,
              or party makeup with duration and price.
            </p>
          </CardContent>
        </Card>
      )}

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete service?"
        description={`This will remove ${deleting?.service_name ?? "this service"} from your service list.`}
        confirmText="Delete"
        onCancel={() => setDeleting(null)}
        onConfirm={deleteService}
      />

      <AppModal
        open={formOpen}
        icon={<ScissorsLineDashed className="size-5" />}
        title={editing ? "Edit service" : "Add service"}
        description="Add the service name, expected duration, and price shown to clients."
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
              form="service-form"
              type="submit"
              className="h-11 rounded-2xl bg-[#7c3aed] hover:bg-[#6d28d9] text-white shadow-md shadow-purple-950/10"
              disabled={loading}
            >
              {editing ? "Update service" : "Add service"}
            </Button>
          </>
        }
      >
        <ServiceForm
          values={values}
          loading={loading}
          submitText={editing ? "Update service" : "Add service"}
          onChange={setValues}
          onSubmit={saveService}
          onCancel={cancelEdit}
        />
      </AppModal>
    </div>
  );
}
