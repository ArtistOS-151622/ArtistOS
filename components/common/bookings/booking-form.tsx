"use client";

import React, { useEffect, useState, useRef } from "react";
import {
  MapPin,
  Plus,
  Search,
  User,
  FileText,
  ChevronDown,
  X,
  ScissorsLineDashed,
} from "lucide-react";

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
import { ServiceForm } from "@/components/common/services/service-form";
import { DatePicker } from "@/components/common/shared/date-picker";
import { TimePicker } from "@/components/common/shared/time-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";

type BookingFormProps = {
  values: BookingFormValues;
  loading?: boolean;
  submitText?: string;
  onChange: (values: BookingFormValues) => void;
  onSubmit: () => void;
  onCancel?: () => void;
  formId?: string;
};

export function BookingForm({
  values,
  loading = false,
  submitText = "Create booking",
  onChange,
  onSubmit,
  onCancel,
  formId = "booking-form",
}: BookingFormProps) {
  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
  const [allServices, setAllServices] = useState<ArtistService[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null,
  );

  // Autocomplete / Select Dropdown state
  const [isFocused, setIsFocused] = useState(false);
  const [dropdownSearch, setDropdownSearch] = useState("");
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
      }
    } else {
      setSelectedCustomer(null);
    }
  }, [values.customer_id, allCustomers]);

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
    onChange({
      ...values,
      customer_id: String(customer.id),
      booking_address: customer.address,
    });
    setIsFocused(false);
    setDropdownSearch("");
  };

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
        email: newCustomerValues.email.trim(),
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
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
      >
        {/* Customer select field with dropdown search & quick-add */}
        <div className="space-y-2">
          <Label htmlFor="customer_id">Select Customer</Label>
          <div className="flex gap-2">
            <div ref={customerContainerRef} className="relative flex-1">
              <div className="relative">
                <input
                  type="text"
                  id="customer_id"
                  disabled={loading}
                  value={
                    isFocused
                      ? dropdownSearch
                      : selectedCustomer
                        ? `${selectedCustomer.phone} - ${selectedCustomer.customer_name}`
                        : ""
                  }
                  onChange={(e) => {
                    setDropdownSearch(e.target.value);
                    if (!isFocused) setIsFocused(true);
                  }}
                  onFocus={() => {
                    setIsFocused(true);
                    setDropdownSearch("");
                  }}
                  placeholder="Search or select customer by name/phone..."
                  className="flex h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 pr-10 text-sm text-[#15172e] shadow-sm outline-none transition-all focus:border-[#7c3aed] placeholder:text-slate-400"
                  required
                />
                <User className="absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>

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

            <Button
              type="button"
              variant="outline"
              size="icon"
              disabled={loading}
              onClick={() => setCustomerModalOpen(true)}
              className="size-11 rounded-2xl shrink-0 border-slate-200 bg-white hover:bg-slate-50 shadow-sm"
              title="Add new customer"
            >
              <Plus className="size-5" />
            </Button>
          </div>
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
        <div className="space-y-2">
          <Label htmlFor="booking_address">Booking Address</Label>
          <div className="relative">
            <MapPin className="absolute left-3 top-3 size-4 text-slate-400" />
            <Textarea
              id="booking_address"
              disabled={loading}
              value={values.booking_address}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                onChange({ ...values, booking_address: e.target.value })
              }
              placeholder="Enter exact booking location address..."
              className="min-h-20 rounded-2xl pl-10 border-slate-200 bg-white shadow-sm resize-none"
              required
            />
          </div>
        </div>

        {/* Multi-select Services Dropdown */}
        <div className="space-y-2">
          <Label>Select Services</Label>
          <div className="flex gap-2">
            <div className="flex-1">
              {allServices.length > 0 ? (
                <DropdownMenu>
                  <DropdownMenuTrigger
                    disabled={loading}
                    className="flex min-h-11 w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-3 py-2 text-left text-sm text-[#15172e] shadow-sm outline-none transition-all hover:bg-slate-50 focus:border-[#7c3aed]"
                  >
                    <div className="flex flex-wrap gap-1.5 items-center max-w-[95%] py-0.5">
                      {values.services.length === 0 ? (
                        <span className="text-slate-400">
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
              className="size-11 rounded-2xl shrink-0 border-slate-200 bg-white hover:bg-slate-50 shadow-sm"
              title="Add new service"
            >
              <Plus className="size-5" />
            </Button>
          </div>
        </div>

        {/* Date and Time Fields */}
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="booking_date">Date</Label>
            <DatePicker
              id="booking_date"
              disabled={loading}
              value={values.booking_date}
              onChange={(val) => onChange({ ...values, booking_date: val })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="start_time">Start Time</Label>
            <TimePicker
              id="start_time"
              disabled={loading}
              value={values.start_time}
              onChange={(val) => onChange({ ...values, start_time: val })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="end_time">End Time</Label>
            <TimePicker
              id="end_time"
              disabled={loading}
              value={values.end_time}
              onChange={(val) => onChange({ ...values, end_time: val })}
            />
          </div>
        </div>

        {/* Status selection and Additional Request */}
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2 md:col-span-1">
            <Label htmlFor="status">Booking Status</Label>
            <DropdownMenu>
              <DropdownMenuTrigger
                disabled={loading}
                className="flex h-11 w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-3 py-2 text-left text-sm text-[#15172e] shadow-sm outline-none transition-all hover:bg-slate-50 focus:border-[#7c3aed]"
              >
                <span className="font-semibold text-slate-700 capitalize">
                  {values.status}
                </span>
                <ChevronDown className="size-4 text-slate-400" />
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-[var(--anchor-width)] rounded-2xl p-1.5 bg-white border border-slate-100 shadow-xl">
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
                    value="canceled"
                    closeOnClick={true}
                    className="h-10 rounded-xl px-3 text-sm cursor-pointer"
                  >
                    Canceled
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="additional_request">Additional Request</Label>
            <div className="relative">
              <FileText className="absolute left-3 top-3 size-4 text-slate-400" />
              <Input
                id="additional_request"
                disabled={loading}
                value={values.additional_request}
                onChange={(e) =>
                  onChange({ ...values, additional_request: e.target.value })
                }
                placeholder="e.g. skin allergies, custom extensions, reference links (Pinterest/Drive)..."
                className="h-11 rounded-2xl pl-10 border-slate-200 bg-white shadow-sm"
              />
            </div>
          </div>
        </div>
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
    </div>
  );
}
