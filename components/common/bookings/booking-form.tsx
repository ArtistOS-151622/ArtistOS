"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  MapPin,
  Plus,
  Search,
  User,
  FileText,
  ChevronDown,
  X,
  ScissorsLineDashed,
  Image as ImageIcon,
  UploadCloud,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { StoragePlansModal } from "@/components/storage/storage-plans-modal";
import type { StoragePlanRow, QuotaInfo } from "@/lib/portfolio/types";

import type {
  Customer,
  CustomerFormValues,
} from "@/components/common/customers/customer-types";
import { emptyCustomerForm } from "@/components/common/customers/customer-types";
import { CustomerForm } from "@/components/common/customers/customer-form";
import { AppModal } from "@/components/common/shared/app-modal";
import { ConfirmDialog } from "@/components/common/shared/confirm-dialog";
import type { BookingFormValues } from "@/components/common/bookings/booking-types";
import type {
  ArtistService,
  ServiceFormValues,
} from "@/components/common/services/service-types";
import { formatDuration } from "@/components/common/services/service-types";
import { ServiceForm } from "@/components/common/services/service-form";
import { DatePicker } from "@/components/common/shared/date-picker";
import { TimePicker } from "@/components/common/shared/time-picker";
import { FloatingInput } from "@/components/common/shared/floating-input";
import { FloatingTextarea } from "@/components/common/shared/floating-input";
import { FloatingDropdown } from "@/components/common/shared/floating-dropdown";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";

type SlotItem =
  | {
      type: "existing";
      id: number;
      name: string;
      size: number;
      url: string;
    }
  | {
      type: "new";
      file: File;
      name: string;
      size: number;
      url: string;
    }
  | null;

type BookingFormProps = {
  bookingId?: number;
  values: BookingFormValues;
  loading?: boolean;
  submitText?: string;
  onChange: (values: BookingFormValues) => void;
  onSubmit: () => void;
  onCancel?: () => void;
  formId?: string;
  onQuotaExceededChange?: (exceeded: boolean) => void;
};

export function BookingForm({
  bookingId,
  values,
  loading = false,
  submitText = "Create booking",
  onChange,
  onSubmit,
  onCancel,
  formId = "booking-form",
  onQuotaExceededChange,
}: BookingFormProps) {
  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
  const [allServices, setAllServices] = useState<ArtistService[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null,
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Autocomplete / Select Dropdown state
  const [isFocused, setIsFocused] = useState(false);
  const [dropdownSearch, setDropdownSearch] = useState("");
  const [isServicesOpen, setIsServicesOpen] = useState(false);
  const customerContainerRef = useRef<HTMLDivElement>(null);

  // Quick Customer Creation modal states
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [newCustomerValues, setNewCustomerValues] =
    useState<CustomerFormValues>(emptyCustomerForm);
  const [customerLoading, setCustomerLoading] = useState(false);
  const [customerError, setCustomerError] = useState("");
  const [duplicatePhonePopupOpen, setDuplicatePhonePopupOpen] = useState(false);

  // Quick Service Creation modal states
  const [serviceModalOpen, setServiceModalOpen] = useState(false);
  const [newServiceValues, setNewServiceValues] = useState<ServiceFormValues>({
    service_name: "",
    duration_minutes: 60,
    price: "",
  });
  const [serviceLoading, setServiceLoading] = useState(false);
  const [serviceError, setServiceError] = useState("");

  // Reference Images state for the 3 slots: [SlotItem, SlotItem, SlotItem]
  const [slots, setSlots] = useState<SlotItem[]>([null, null, null]);
  const [loadingReferences, setLoadingReferences] = useState(false);
  const [zoomImage, setZoomImage] = useState<{ url: string; name: string } | null>(null);

  // Storage Quota states
  const [storageQuota, setStorageQuota] = useState<QuotaInfo | null>(null);
  const [storagePlans, setStoragePlans] = useState<StoragePlanRow[]>([]);
  const [storageModalOpen, setStorageModalOpen] = useState(false);

  const loadStorageInfo = useCallback(async () => {
    try {
      const res = await fetch("/api/portfolio/storage-info");
      if (!res.ok) return;
      const json = await res.json();
      if (json.status && json.data) {
        setStorageQuota(json.data.quota ?? null);
        setStoragePlans(json.data.plans ?? []);
      }
    } catch (err) {
      console.error("Failed to load storage quota:", err);
    }
  }, []);

  useEffect(() => {
    void loadStorageInfo();
  }, [loadStorageInfo]);

  // Compute total size of newly selected images
  const newFilesTotalBytes = slots.reduce(
    (total, s) => (s && s.type === "new" ? total + s.size : total),
    0
  );
  const remainingBytes = storageQuota ? storageQuota.remaining_bytes : null;
  const isQuotaExceeded =
    remainingBytes !== null &&
    (newFilesTotalBytes > remainingBytes || (newFilesTotalBytes > 0 && remainingBytes <= 0));

  // Sync quota exceeded state
  useEffect(() => {
    onQuotaExceededChange?.(isQuotaExceeded);
    if (values.storage_quota_exceeded !== isQuotaExceeded) {
      onChange({
        ...values,
        storage_quota_exceeded: isQuotaExceeded,
      });
    }
  }, [isQuotaExceeded, values, onChange, onQuotaExceededChange]);

  // Sync / fetch reference images
  useEffect(() => {
    let cancelled = false;

    async function loadReferenceImages() {
      if (!bookingId) {
        // If creating new booking and values already has reference_images
        if (values.reference_images && values.reference_images.length > 0) {
          const newSlots: SlotItem[] = [null, null, null];
          values.reference_images.slice(0, 3).forEach((f, idx) => {
            newSlots[idx] = {
              type: "new",
              file: f,
              name: f.name,
              size: f.size,
              url: URL.createObjectURL(f),
            };
          });
          setSlots(newSlots);
        } else {
          setSlots([null, null, null]);
        }
        return;
      }

      setLoadingReferences(true);
      try {
        const res = await fetch(`/api/bookings/${bookingId}/portfolio`);
        if (!res.ok) return;
        const json = await res.json();
        if (cancelled) return;

        const refFiles = (json.data?.reference_files ?? []).slice(0, 3);
        const loadedSlots: SlotItem[] = [null, null, null];
        refFiles.forEach((rf: any, idx: number) => {
          loadedSlots[idx] = {
            type: "existing",
            id: rf.id,
            name: rf.file_name,
            size: Number(rf.file_size),
            url: rf.public_url,
          };
        });
        setSlots(loadedSlots);

        onChange({
          ...values,
          existing_reference_images: refFiles.map((rf: any) => ({
            id: rf.id,
            file_name: rf.file_name,
            file_size: Number(rf.file_size),
            public_url: rf.public_url,
            mime_type: rf.mime_type,
          })),
          reference_images: [],
          removed_reference_image_ids: [],
        });
      } catch (err) {
        console.error("Failed to load booking reference images:", err);
      } finally {
        if (!cancelled) setLoadingReferences(false);
      }
    }

    void loadReferenceImages();

    return () => {
      cancelled = true;
    };
  }, [bookingId]);

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      slots.forEach((s) => {
        if (s && s.type === "new" && s.url.startsWith("blob:")) {
          URL.revokeObjectURL(s.url);
        }
      });
    };
  }, [slots]);

  const handleSlotChange = (slotIndex: number, file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file (JPEG, PNG, WebP, etc.).");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast.error("Image file size must be less than 20MB.");
      return;
    }

    // Check if adding this image exceeds available quota
    const otherNewBytes = slots.reduce((total, s, idx) => {
      if (idx === slotIndex) return total;
      return s && s.type === "new" ? total + s.size : total;
    }, 0);
    const projectedNewBytes = otherNewBytes + file.size;
    const isExceeded =
      storageQuota !== null &&
      (projectedNewBytes > storageQuota.remaining_bytes ||
        (projectedNewBytes > 0 && storageQuota.remaining_bytes <= 0));

    if (isExceeded && storageQuota) {
      toast.error(
        `Storage quota exceeded! These photos require ${(projectedNewBytes / (1024 * 1024)).toFixed(1)} MB, but you only have ${storageQuota.remaining_bytes_human} remaining. Please upgrade your storage quota.`
      );
    }

    const prevSlot = slots[slotIndex];
    const updatedRemoved = [...(values.removed_reference_image_ids || [])];
    if (prevSlot) {
      if (prevSlot.type === "existing") {
        if (!updatedRemoved.includes(prevSlot.id)) {
          updatedRemoved.push(prevSlot.id);
        }
      } else if (prevSlot.type === "new" && prevSlot.url.startsWith("blob:")) {
        URL.revokeObjectURL(prevSlot.url);
      }
    }

    const previewUrl = URL.createObjectURL(file);
    const updatedSlots = [...slots];
    updatedSlots[slotIndex] = {
      type: "new",
      file,
      name: file.name,
      size: file.size,
      url: previewUrl,
    };
    setSlots(updatedSlots);

    const newFiles = updatedSlots
      .filter((s): s is Extract<SlotItem, { type: "new" }> => s !== null && s.type === "new")
      .map((s) => s.file);

    const existingFiles = updatedSlots
      .filter((s): s is Extract<SlotItem, { type: "existing" }> => s !== null && s.type === "existing")
      .map((s) => ({
        id: s.id,
        file_name: s.name,
        file_size: s.size,
        public_url: s.url,
      }));

    onChange({
      ...values,
      reference_images: newFiles,
      existing_reference_images: existingFiles,
      removed_reference_image_ids: updatedRemoved,
      storage_quota_exceeded: isExceeded,
    });
  };

  const removeSlot = (slotIndex: number) => {
    const prevSlot = slots[slotIndex];
    if (!prevSlot) return;

    const updatedRemoved = [...(values.removed_reference_image_ids || [])];
    if (prevSlot.type === "existing") {
      if (!updatedRemoved.includes(prevSlot.id)) {
        updatedRemoved.push(prevSlot.id);
      }
    } else if (prevSlot.type === "new" && prevSlot.url.startsWith("blob:")) {
      URL.revokeObjectURL(prevSlot.url);
    }

    const updatedSlots = [...slots];
    updatedSlots[slotIndex] = null;
    setSlots(updatedSlots);

    const newFiles = updatedSlots
      .filter((s): s is Extract<SlotItem, { type: "new" }> => s !== null && s.type === "new")
      .map((s) => s.file);

    const existingFiles = updatedSlots
      .filter((s): s is Extract<SlotItem, { type: "existing" }> => s !== null && s.type === "existing")
      .map((s) => ({
        id: s.id,
        file_name: s.name,
        file_size: s.size,
        public_url: s.url,
      }));

    const remainingNewBytes = updatedSlots.reduce(
      (total, s) => (s && s.type === "new" ? total + s.size : total),
      0
    );
    const quotaExceededAfterRemove =
      storageQuota !== null &&
      (remainingNewBytes > storageQuota.remaining_bytes ||
        (remainingNewBytes > 0 && storageQuota.remaining_bytes <= 0));

    onChange({
      ...values,
      reference_images: newFiles,
      existing_reference_images: existingFiles,
      removed_reference_image_ids: updatedRemoved,
      storage_quota_exceeded: quotaExceededAfterRemove,
    });
  };

  // Fetch initial data
  useEffect(() => {
    async function loadData() {
      try {
        const resServices = await fetch("/api/services");
        if (resServices.ok) {
          const dataS = await resServices.json();
          setAllServices(dataS.services ?? []);
        }

        const resCustomers = await fetch("/api/customers");
        if (resCustomers.ok) {
          const dataC = await resCustomers.json();
          setAllCustomers(dataC.customers ?? []);
        }
      } catch (err) {
        console.error("Failed to load initial data for BookingForm", err);
      }
    }
    void loadData();
  }, []);

  // Sync selected customer when customer_id changes
  useEffect(() => {
    if (values.customer_id) {
      const match = allCustomers.find(
        (c) => String(c.id) === values.customer_id,
      );
      if (match) {
        setSelectedCustomer(match);
      } else if (values.initial_customer && String(values.initial_customer.id) === values.customer_id) {
        setSelectedCustomer(values.initial_customer as Customer);
        setAllCustomers(prev => {
          if (!prev.find(c => c.id === values.initial_customer!.id)) {
            return [values.initial_customer as Customer, ...prev];
          }
          return prev;
        });
      }
    } else {
      setSelectedCustomer(null);
    }
  }, [values.customer_id, allCustomers, values.initial_customer]);

  // Click outside to close customer dropdown list
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        customerContainerRef.current &&
        !customerContainerRef.current.contains(event.target as Node)
      ) {
        setIsFocused(false);
        setDropdownSearch("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced search for customers in the database
  useEffect(() => {
    if (!dropdownSearch.trim()) return;

    const delayDebounce = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/customers?search=${encodeURIComponent(dropdownSearch)}`,
        );
        if (res.ok) {
          const data = await res.json();
          const fetched = data.customers ?? [];
          setAllCustomers((prev) => {
            const merged = [...prev];
            fetched.forEach((fc: Customer) => {
              if (!merged.some((c) => c.id === fc.id)) {
                merged.push(fc);
              }
            });
            return merged;
          });
        }
      } catch (err) {
        console.error(err);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [dropdownSearch]);

  // Local filter for customer dropdown
  const filteredCustomers = allCustomers.filter((c) => {
    const term = dropdownSearch.toLowerCase();
    return (
      c.customer_name.toLowerCase().includes(term) ||
      c.phone.toLowerCase().includes(term)
    );
  });

  // Select customer callback
  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    if (errors.customer_id) {
      setErrors((prev) => ({ ...prev, customer_id: "" }));
    }
    onChange({
      ...values,
      customer_id: String(customer.id),
      booking_address: customer.address,
    });
    setDropdownSearch(customer.customer_name);
    setIsFocused(false);
  };

  const totalEstimatedMinutes = values.services.reduce((total, id) => {
    const svc = allServices.find((s) => String(s.id) === id);
    return total + (svc?.duration_minutes || 0);
  }, 0);

  // Toggle selected service
  const handleToggleService = (serviceId: string) => {
    const isSelected = values.services.includes(serviceId);
    const newServices = isSelected
      ? values.services.filter((id) => id !== serviceId)
      : [...values.services, serviceId];
    onChange({ ...values, services: newServices });
  };

  // Quick-create customer
  const handleCreateCustomer = async () => {
    setCustomerLoading(true);
    setCustomerError("");

    try {
      const payload = {
        customer_name: newCustomerValues.customer_name.trim(),
        phone: newCustomerValues.phone.trim(),
        alt_phone: newCustomerValues.alt_phone.trim() || null,
        email: newCustomerValues.email.trim() || null,
        address: newCustomerValues.address.trim(),
        reference_by: newCustomerValues.reference_by.trim() || null,
      };

      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.error === "phone_exists") {
          setDuplicatePhonePopupOpen(true);
          setCustomerModalOpen(false);
        } else {
          setCustomerError(data.error ?? "Unable to save customer.");
        }
      } else {
        const newCust = data.customer as Customer;
        setAllCustomers((prev) => [newCust, ...prev]);
        setSelectedCustomer(newCust);
        onChange({
          ...values,
          customer_id: String(newCust.id),
          booking_address: newCust.address,
        });
        setNewCustomerValues(emptyCustomerForm);
        setCustomerModalOpen(false);
      }
    } catch {
      setCustomerError("Unable to save customer.");
    } finally {
      setCustomerLoading(false);
    }
  };

  // Quick-create service
  const handleCreateService = async () => {
    setServiceLoading(true);
    setServiceError("");

    try {
      const payload = {
        service_name: newServiceValues.service_name.trim(),
        duration_minutes: Number(newServiceValues.duration_minutes),
        price: Number(newServiceValues.price),
      };

      const res = await fetch("/api/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        setServiceError(data.error ?? "Unable to save service.");
      } else {
        const newSer = data.service as ArtistService;
        setAllServices((prev) => [newSer, ...prev]);
        // Automatically check/select this newly created service
        onChange({
          ...values,
          services: [...values.services, String(newSer.id)],
        });
        setNewServiceValues({
          service_name: "",
          duration_minutes: 60,
          price: "",
        });
        setServiceModalOpen(false);
      }
    } catch {
      setServiceError("Unable to save service.");
    } finally {
      setServiceLoading(false);
    }
  };

  // Generate label for selected services
  const selectedServicesLabel = () => {
    if (values.services.length === 0) return "Select services...";
    if (values.services.length === 1) {
      const match = allServices.find(
        (s) => String(s.id) === values.services[0],
      );
      return match ? match.service_name : "1 service selected";
    }
    return `${values.services.length} services selected`;
  };

  return (
    <div className="relative">
      <form
        id={formId}
        noValidate
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          if (isQuotaExceeded) {
            toast.error("Storage quota exceeded! Please upgrade your storage quota or remove photos before saving.");
            return;
          }
          const newErrors: Record<string, string> = {};
          if (!values.customer_id) newErrors.customer_id = "Please fill out this field.";
          if (!values.booking_address?.trim()) newErrors.booking_address = "Please fill out this field.";
          if (!values.booking_date) newErrors.booking_date = "Please fill out this field.";
          if (!values.start_time) newErrors.start_time = "Please fill out this field.";
          if (!values.end_time) newErrors.end_time = "Please fill out this field.";

          if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
          }
          onSubmit();
        }}
      >
        {/* Customer select field with dropdown search & quick-add */}
        <div className="flex gap-2">
          <div ref={customerContainerRef} className="flex-1 group">
            <div className="relative w-full">
              <input
                type="text"
                id="customer_id"
                disabled={loading}
                value={
                  selectedCustomer
                    ? `${selectedCustomer.customer_name} (${selectedCustomer.phone})`
                    : dropdownSearch
                }
                onChange={(e) => {
                  setDropdownSearch(e.target.value);
                  if (errors.customer_id) setErrors((prev) => ({ ...prev, customer_id: "" }));
                  if (!isFocused) setIsFocused(true);
                }}
                onFocus={() => {
                  setIsFocused(true);
                  setDropdownSearch("");
                }}
                placeholder={isFocused ? "Search or select customer by name/phone..." : ""}
                className={cn(
                  "peer flex h-[46px] w-full rounded-lg border bg-white px-4 text-sm text-[#15172e] shadow-sm shadow-slate-200/40 outline-none transition-all focus:border-[#7c3aed] focus:shadow-[0_0_0_3px_rgba(124,58,237,0.10)] disabled:opacity-50 placeholder:text-slate-400 pr-10",
                  errors.customer_id ? "border-red-400 focus:border-red-500 focus:shadow-[0_0_0_3px_rgba(239,68,68,0.10)]" : "border-slate-200"
                )}
                autoComplete="off"
                spellCheck={false}
                required
              />
              <label
                htmlFor="customer_id"
                className={cn(
                  "pointer-events-none absolute select-none text-slate-400 bg-white px-1",
                  "transition-all duration-200 ease-out",
                  (isFocused || dropdownSearch || selectedCustomer)
                    ? "top-0 -translate-y-1/2 text-[10px] font-semibold uppercase tracking-wider text-slate-400 peer-focus:text-[#7c3aed]"
                    : "top-1/2 -translate-y-1/2 text-sm",
                  "left-3"
                )}
              >
                Select Customer
              </label>
              <User className="absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400 pointer-events-none transition-colors peer-focus:text-[#7c3aed]" />
              
              {/* Autocomplete Search Dropdown List (No internal search bar) */}
              {isFocused ? (
                <div className="absolute left-0 right-0 z-50 mt-2 max-h-60 overflow-y-auto rounded-2xl border border-slate-100 bg-white p-2 shadow-2xl shadow-purple-950/15">
                  {filteredCustomers.length > 0 ? (
                    <div className="space-y-0.5">
                      {filteredCustomers.map((customer) => (
                        <button
                          key={customer.id}
                          type="button"
                          onMouseDown={() => handleSelectCustomer(customer)}
                          className="flex w-full items-center rounded-xl px-3 py-2 text-left text-sm hover:bg-slate-50 text-slate-700"
                        >
                          <span className="font-semibold text-slate-900 mr-2">
                            {customer.phone}
                          </span>
                          <span className="text-slate-500">
                            - {customer.customer_name}
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="p-3 text-center text-xs text-slate-400">
                      No customers found
                    </p>
                  )}
                </div>
              ) : null}
            </div>

            {errors.customer_id && (
              <p className="mt-1.5 text-xs text-red-500 pl-1">{errors.customer_id}</p>
            )}
          </div>

            <Button
              type="button"
              variant="outline"
              size="icon"
              disabled={loading}
              onClick={() => setCustomerModalOpen(true)}
              className="size-[52px] rounded-2xl shrink-0 border-slate-200 bg-white hover:bg-slate-50 shadow-sm"
              title="Add new customer"
            >
              <Plus className="size-5" />
            </Button>
          </div>

        {/* Read-only customer summary cards */}
        {selectedCustomer ? (
          <div className="rounded-2xl border border-slate-100 bg-slate-50/40 p-4 text-sm space-y-1 md:grid md:grid-cols-3 md:gap-4 md:space-y-0">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Name
              </p>
              <p className="font-medium text-slate-800 mt-0.5">
                {selectedCustomer.customer_name}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Mobile
              </p>
              <p className="font-medium text-slate-800 mt-0.5">
                {selectedCustomer.phone}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Email
              </p>
              <p className="font-medium text-slate-800 mt-0.5">
                {selectedCustomer.email || "No email"}
              </p>
            </div>
          </div>
        ) : null}

        {/* Booking Address field (editable, initialized with customer address) */}
        <FloatingTextarea
          label="Booking Address"
          icon={<MapPin className="size-4" />}
          id="booking_address"
          disabled={loading}
          value={values.booking_address}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
            if (errors.booking_address) setErrors((prev) => ({ ...prev, booking_address: "" }));
            onChange({ ...values, booking_address: e.target.value.slice(0, 200) });
          }}
          maxLength={200}
          className="min-h-20"
          error={errors.booking_address}
          required
        />

        {/* Multi-select Services Dropdown */}
        <div className="flex gap-2">
          <div className="flex-1 relative group">
            {allServices.length > 0 ? (
              <DropdownMenu onOpenChange={setIsServicesOpen}>
                <DropdownMenuTrigger
                  disabled={loading}
                  className="relative flex min-h-[46px] py-2 w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-4 text-left text-sm text-[#15172e] shadow-sm shadow-slate-200/40 outline-none transition-all hover:bg-slate-50 focus:border-[#7c3aed] focus:shadow-[0_0_0_3px_rgba(124,58,237,0.10)] data-[state=open]:border-[#7c3aed] data-[state=open]:shadow-[0_0_0_3px_rgba(124,58,237,0.10)]"
                >
                  <div className="flex flex-wrap gap-1.5 items-center max-w-[95%]">
                    {values.services.length === 0 ? (
                      <span className={cn("text-transparent select-none")}>
                        Select services...
                      </span>
                    ) : (
                      values.services.map((id) => {
                        const svc = allServices.find(
                          (s) => String(s.id) === id,
                        );
                        if (!svc) return null;
                        return (
                          <span
                            key={id}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-600 text-white px-2.5 py-1 text-xs font-medium tracking-wide shadow-sm"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleToggleService(id);
                            }}
                          >
                            <X className="size-3 cursor-pointer hover:text-slate-200" />
                            {svc.service_name}
                          </span>
                        );
                      })
                    )}
                  </div>
                  
                  <span
                    className={cn(
                      "pointer-events-none absolute select-none text-slate-400 bg-white px-1",
                      "transition-all duration-200 ease-out",
                      (values.services.length > 0 || isServicesOpen)
                        ? "top-0 -translate-y-1/2 text-[10px] font-semibold uppercase tracking-wider text-slate-400"
                        : "top-1/2 -translate-y-1/2 text-sm",
                      "left-3"
                    )}
                  >
                    Select Services
                  </span>
                  <ChevronDown className="size-4 text-slate-400 shrink-0" />
                </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-[var(--anchor-width)] max-h-60 overflow-y-auto rounded-2xl p-1.5 bg-white border border-slate-100 shadow-xl">
                    {allServices.map((service) => {
                      const serviceId = String(service.id);
                      const isChecked = values.services.includes(serviceId);
                      return (
                        <DropdownMenuCheckboxItem
                          key={service.id}
                          checked={isChecked}
                          onCheckedChange={() => handleToggleService(serviceId)}
                          closeOnClick={true}
                          className="h-10 rounded-xl px-3 text-sm flex items-center justify-between cursor-pointer"
                        >
                          <span className="font-semibold text-slate-700">
                            {service.service_name}
                          </span>
                          <span className="text-xs font-bold text-slate-400 ml-auto mr-5">
                            ₹{Number(service.price).toLocaleString()}
                          </span>
                        </DropdownMenuCheckboxItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <p className="text-sm text-slate-400 italic mt-2.5">
                  No services created yet. Please add services first.
                </p>
              )}
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              disabled={loading}
              onClick={() => setServiceModalOpen(true)}
              className="size-[52px] rounded-2xl shrink-0 border-slate-200 bg-white hover:bg-slate-50 shadow-sm"
              title="Add new service"
            >
              <Plus className="size-5" />
            </Button>
          </div>

        {/* Estimated Time Indicator */}
        {totalEstimatedMinutes > 0 && (
          <div className="flex items-center gap-2 mt-1">
            <span className="inline-flex shrink-0 items-center rounded-md border border-purple-200/50 bg-purple-50 px-2 py-1 text-xs font-semibold text-purple-700">
              Estimated Total Duration: {formatDuration(totalEstimatedMinutes)}
            </span>
          </div>
        )}

        {/* Date and Time Fields */}
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <DatePicker
              id="booking_date"
              label="Date"
              disabled={loading}
              value={values.booking_date}
              onChange={(val) => {
                if (errors.booking_date) setErrors((prev) => ({ ...prev, booking_date: "" }));
                onChange({ ...values, booking_date: val });
              }}
            />
            {errors.booking_date && <p className="mt-1.5 text-xs text-red-500 pl-1">{errors.booking_date}</p>}
          </div>

          <div>
            <TimePicker
              id="start_time"
              label="Start Time"
              disabled={loading}
              value={values.start_time}
              onChange={(val) => {
                if (errors.start_time) setErrors((prev) => ({ ...prev, start_time: "" }));
                onChange({ ...values, start_time: val });
              }}
            />
            {errors.start_time && <p className="mt-1.5 text-xs text-red-500 pl-1">{errors.start_time}</p>}
          </div>

          <div>
            <TimePicker
              id="end_time"
              label="End Time"
              disabled={loading}
              value={values.end_time}
              onChange={(val) => {
                if (errors.end_time) setErrors((prev) => ({ ...prev, end_time: "" }));
                onChange({ ...values, end_time: val });
              }}
            />
            {errors.end_time && <p className="mt-1.5 text-xs text-red-500 pl-1">{errors.end_time}</p>}
          </div>
        </div>

        {/* Status selection and Additional Request */}
        <div className="grid gap-4 md:grid-cols-3">
          <div className="md:col-span-1">
            <FloatingDropdown
              label="Booking Status"
              value={values.status}
              hasValue={true}
              disabled={loading}
            >
              <DropdownMenuRadioGroup
                value={values.status}
                onValueChange={(val) =>
                  onChange({ ...values, status: val as any })
                }
              >
                <DropdownMenuRadioItem
                  value="pending"
                  closeOnClick={true}
                  className="h-10 rounded-xl px-3 text-sm cursor-pointer"
                >
                  Pending
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem
                  value="confirmed"
                  closeOnClick={true}
                  className="h-10 rounded-xl px-3 text-sm cursor-pointer"
                >
                  Confirmed
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem
                  value="completed"
                  closeOnClick={true}
                  className="h-10 rounded-xl px-3 text-sm cursor-pointer"
                >
                  Completed
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem
                  value="cancelled"
                  closeOnClick={true}
                  className="h-10 rounded-xl px-3 text-sm cursor-pointer"
                >
                  Cancelled
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </FloatingDropdown>
          </div>

          <div className="md:col-span-2">
            <FloatingInput
              id="additional_request"
              label="Additional Request"
              icon={<FileText className="size-4" />}
              disabled={loading}
              value={values.additional_request}
              onChange={(e) =>
                onChange({ ...values, additional_request: e.target.value })
              }
            />
          </div>

          {/* Reference Images Section (Max 3) */}
          <div className="md:col-span-3 space-y-3 pt-1">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <ImageIcon className="size-3.5 text-[#7c3aed]" />
                Reference Images (Optional, Max 3)
              </Label>
              <div className="flex items-center gap-2">
                {storageQuota && (
                  <span
                    className={cn(
                      "text-[10px] sm:text-[11px] font-semibold px-2.5 py-0.5 rounded-full border transition-colors",
                      isQuotaExceeded
                        ? "bg-red-50 text-red-600 border-red-200"
                        : "bg-purple-50/70 text-purple-700 border-purple-100"
                    )}
                  >
                    Storage: {storageQuota.remaining_bytes_human} free
                  </span>
                )}
                <span className="text-[11px] font-medium text-slate-400">
                  {slots.filter(Boolean).length} / 3 selected
                </span>
              </div>
            </div>

            {/* Quota Exceeded Banner */}
            {isQuotaExceeded && (
              <div className="rounded-2xl border border-red-200 bg-red-50/95 p-3.5 sm:p-4 text-red-800 space-y-2.5 shadow-xs animate-in fade-in duration-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="size-5 text-red-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-red-900">
                        Storage Quota Exceeded
                      </h4>
                      <p className="text-xs text-red-700 mt-0.5 leading-relaxed">
                        These photos require{" "}
                        <span className="font-bold text-red-900">
                          {(newFilesTotalBytes / (1024 * 1024)).toFixed(1)} MB
                        </span>
                        , but your remaining storage quota is only{" "}
                        <span className="font-bold text-red-900">
                          {storageQuota?.remaining_bytes_human ?? "0 MB"}
                        </span>
                        . Please upgrade your storage quota or remove photos to save this booking.
                      </p>
                    </div>
                  </div>
                  {storagePlans.length > 0 && (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => setStorageModalOpen(true)}
                      className="shrink-0 h-8 px-3.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-xs"
                    >
                      Upgrade Storage Quota
                    </Button>
                  )}
                </div>
              </div>
            )}

            {loadingReferences ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="min-h-[140px] rounded-2xl border border-slate-200 bg-slate-50/50 p-3 flex flex-col items-center justify-center animate-pulse"
                  >
                    <div className="w-full h-20 bg-slate-200/70 rounded-xl mb-2" />
                    <div className="w-16 h-3 bg-slate-200/70 rounded" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {slots.map((slot, index) => {
                  const isThisSlotExceeded = isQuotaExceeded && slot?.type === "new";
                  return (
                    <div
                      key={index}
                      className={cn(
                        "relative group rounded-2xl border transition-all duration-200 overflow-hidden flex flex-col items-center justify-center p-3 text-center min-h-[140px]",
                        slot
                          ? isThisSlotExceeded
                            ? "border-red-300 bg-red-50/20 ring-1 ring-red-200"
                            : "border-purple-200 bg-purple-50/20"
                          : "border-dashed border-slate-200 hover:border-purple-300 hover:bg-slate-50/60 bg-white"
                      )}
                    >
                      {slot ? (
                        <div className="relative w-full h-full flex flex-col items-center">
                          <div
                            className="relative w-full h-24 rounded-xl overflow-hidden bg-slate-100 border border-slate-200/60 mb-2 cursor-pointer group/img"
                            onClick={() => setZoomImage({ url: slot.url, name: slot.name })}
                            title="Click to view image"
                          >
                            <img
                              src={slot.url}
                              alt={slot.name}
                              className="w-full h-full object-cover transition-transform group-hover/img:scale-105"
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/25 transition-colors flex items-center justify-center">
                              <span className="opacity-0 group-hover/img:opacity-100 text-white text-[10px] font-medium bg-black/60 px-2 py-0.5 rounded-full transition-opacity shadow-xs">
                                View
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeSlot(index);
                              }}
                              className="absolute top-1.5 right-1.5 size-6 rounded-full bg-slate-900/70 hover:bg-red-600 text-white flex items-center justify-center shadow-md transition-colors z-10"
                              title="Remove image"
                            >
                              <X className="size-3.5" />
                            </button>
                          </div>
                          <div className="w-full flex items-center justify-between text-[11px] text-slate-500 px-0.5">
                            <span className="truncate max-w-[110px] font-medium text-slate-700" title={slot.name}>
                              {slot.name}
                            </span>
                            <span className={cn("text-[10px] shrink-0 font-medium", isThisSlotExceeded ? "text-red-600 font-semibold" : "text-slate-400")}>
                              {(slot.size / (1024 * 1024)).toFixed(1)} MB
                            </span>
                          </div>
                        </div>
                      ) : (
                        <label className="w-full h-full cursor-pointer flex flex-col items-center justify-center py-4">
                          <div className="size-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-[#7c3aed] mb-2 group-hover:scale-105 transition-transform shadow-2xs">
                            <UploadCloud className="size-5" />
                          </div>
                          <span className="text-xs font-semibold text-slate-700">
                            Slot {index + 1}
                          </span>
                          <span className="text-[10px] text-slate-400 mt-0.5">
                            Click to choose image
                          </span>
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/heic"
                            className="sr-only"
                            disabled={loading}
                            onChange={(e) => {
                              const selected = e.target.files?.[0];
                              if (selected) handleSlotChange(index, selected);
                              e.target.value = "";
                            }}
                          />
                        </label>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            <p className="text-[11px] text-slate-400">
              Reference images will be stored under this booking in the Portfolio section and count towards your storage quota.
            </p>
          </div>
        </div>

        {/* Zoom Lightbox Preview Modal */}
        {zoomImage ? (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs"
            onClick={() => setZoomImage(null)}
          >
            <div
              className="relative max-w-2xl max-h-[85vh] bg-black rounded-2xl overflow-hidden shadow-2xl flex flex-col items-center border border-white/10"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setZoomImage(null)}
                className="absolute top-3 right-3 size-8 rounded-full bg-black/70 hover:bg-white hover:text-black text-white flex items-center justify-center transition-colors z-20"
              >
                <X className="size-4" />
              </button>
              <img
                src={zoomImage.url}
                alt={zoomImage.name}
                className="max-h-[75vh] w-auto object-contain rounded-t-2xl"
              />
              <div className="p-3 text-center text-xs text-white/90 w-full bg-slate-900 truncate">
                {zoomImage.name}
              </div>
            </div>
          </div>
        ) : null}
      </form>

      {/* Tiny Quick-Create Customer Form Modal */}
      <AppModal
        open={customerModalOpen}
        icon={<User className="size-5" />}
        title="Add customer"
        description="Quickly add a client's details to associate with this booking."
        onClose={() => setCustomerModalOpen(false)}
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-2xl border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
              onClick={() => setCustomerModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              form="quick-customer-form"
              type="submit"
              className="h-11 rounded-2xl bg-[#7c3aed] hover:bg-[#6d28d9] text-white shadow-md shadow-purple-950/10"
              disabled={customerLoading}
            >
              Create and Select
            </Button>
          </>
        }
      >
        {customerError ? (
          <p className="mb-4 rounded-xl bg-red-50 p-3 text-xs text-red-600 border border-red-100">
            {customerError}
          </p>
        ) : null}
        <CustomerForm
          formId="quick-customer-form"
          values={newCustomerValues}
          loading={customerLoading}
          submitText="Create and Select"
          onChange={setNewCustomerValues}
          onSubmit={handleCreateCustomer}
          onCancel={() => setCustomerModalOpen(false)}
        />
      </AppModal>

      {/* Tiny Quick-Create Service Form Modal */}
      <AppModal
        open={serviceModalOpen}
        icon={<ScissorsLineDashed className="size-5" />}
        title="Add service"
        description="Quickly add a service to select for this booking."
        onClose={() => setServiceModalOpen(false)}
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-2xl border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
              onClick={() => setServiceModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              form="quick-service-form"
              type="submit"
              className="h-11 rounded-2xl bg-[#7c3aed] hover:bg-[#6d28d9] text-white shadow-md shadow-purple-950/10"
              disabled={serviceLoading}
            >
              Create and Select
            </Button>
          </>
        }
      >
        {serviceError ? (
          <p className="mb-4 rounded-xl bg-red-50 p-3 text-xs text-red-600 border border-red-100">
            {serviceError}
          </p>
        ) : null}
        <ServiceForm
          formId="quick-service-form"
          values={newServiceValues}
          loading={serviceLoading}
          submitText="Create and Select"
          onChange={setNewServiceValues}
          onSubmit={handleCreateService}
          onCancel={() => setServiceModalOpen(false)}
        />
      </AppModal>

      {/* Duplicate Phone Number Dialog inside Booking Form */}
      <ConfirmDialog
        open={duplicatePhonePopupOpen}
        title="Duplicate Phone Number"
        description="this customer link with same mobile no which is already exist please try another mobile no or customer."
        confirmText="OK"
        confirmVariant="default"
        onConfirm={() => setDuplicatePhonePopupOpen(false)}
      />

      {/* Storage Plans Upgrade Modal */}
      {storagePlans.length > 0 && (
        <StoragePlansModal
          open={storageModalOpen}
          onClose={() => setStorageModalOpen(false)}
          plans={storagePlans}
          onSuccess={() => {
            void loadStorageInfo();
            toast.success("Storage quota upgraded successfully!");
          }}
        />
      )}
    </div>
  );
}
