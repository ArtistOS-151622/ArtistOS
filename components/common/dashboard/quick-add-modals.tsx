"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { User, Calendar } from "lucide-react";
import { toast } from "sonner";

import { AppModal } from "@/components/common/shared/app-modal";
import { Button } from "@/components/ui/button";
import { CustomerForm } from "@/components/common/customers/customer-form";
import { BookingForm } from "@/components/common/bookings/booking-form";
import {
  emptyCustomerForm,
  type CustomerFormValues,
} from "@/components/common/customers/customer-types";
import {
  emptyBookingForm,
  type BookingFormValues,
} from "@/components/common/bookings/booking-types";

export type QuickAddModalsProps = {
  customerModalOpen: boolean;
  setCustomerModalOpen: (open: boolean) => void;
  bookingModalOpen: boolean;
  setBookingModalOpen: (open: boolean) => void;
};

export function QuickAddModals({
  customerModalOpen,
  setCustomerModalOpen,
  bookingModalOpen,
  setBookingModalOpen,
}: QuickAddModalsProps) {
  const router = useRouter();

  // Customer State
  const [customerValues, setCustomerValues] = useState<CustomerFormValues>(emptyCustomerForm);
  const [customerLoading, setCustomerLoading] = useState(false);

  // Booking State
  const [bookingValues, setBookingValues] = useState<BookingFormValues>(emptyBookingForm);
  const [bookingLoading, setBookingLoading] = useState(false);

  async function saveCustomer() {
    setCustomerLoading(true);
    const payload = {
      customer_name: customerValues.customer_name.trim(),
      phone: customerValues.phone.trim(),
      alt_phone: customerValues.alt_phone.trim() || null,
      email: customerValues.email.trim(),
      address: customerValues.address.trim(),
      reference_by: customerValues.reference_by.trim() || null,
    };

    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok || !data.customer) {
        if (data.error === "phone_exists") {
          toast.error("A customer with this phone number already exists.");
        } else {
          toast.error(data.error ?? "Unable to save customer.");
        }
      } else {
        toast.success("Customer added successfully!");
        setCustomerModalOpen(false);
        setCustomerValues(emptyCustomerForm);
        router.refresh();
      }
    } catch {
      toast.error("Unable to save customer.");
    } finally {
      setCustomerLoading(false);
    }
  }

  async function saveBooking() {
    setBookingLoading(true);
    const payload = {
      customer_id: bookingValues.customer_id,
      booking_address: bookingValues.booking_address.trim(),
      booking_date: bookingValues.booking_date,
      start_time: bookingValues.start_time,
      end_time: bookingValues.end_time,
      status: bookingValues.status,
      services: bookingValues.services,
      additional_request: bookingValues.additional_request.trim() || null,
    };

    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok || !data.booking) {
        toast.error(data.error ?? "Unable to save booking.");
      } else {
        toast.success("Booking created successfully!");
        setBookingModalOpen(false);
        setBookingValues(emptyBookingForm);
        router.refresh();
      }
    } catch {
      toast.error("Unable to save booking.");
    } finally {
      setBookingLoading(false);
    }
  }

  function closeCustomerModal() {
    setCustomerModalOpen(false);
    setCustomerValues(emptyCustomerForm);
  }

  function closeBookingModal() {
    setBookingModalOpen(false);
    setBookingValues(emptyBookingForm);
  }

  return (
    <>
      {/* Customer Modal */}
      <AppModal
        open={customerModalOpen}
        icon={<User className="size-5" />}
        title="Add customer"
        description="Fill in the customer's contact details. Alt phone and reference are optional."
        onClose={closeCustomerModal}
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-2xl border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
              onClick={closeCustomerModal}
            >
              Cancel
            </Button>
            <Button
              form="quick-customer-form"
              type="submit"
              className="h-11 rounded-2xl bg-[#7c3aed] hover:bg-[#6d28d9] text-white shadow-md shadow-purple-950/10"
              disabled={customerLoading}
            >
              Add customer
            </Button>
          </>
        }
      >
        <CustomerForm
          formId="quick-customer-form"
          values={customerValues}
          loading={customerLoading}
          submitText="Add customer"
          onChange={setCustomerValues}
          onSubmit={saveCustomer}
          onCancel={closeCustomerModal}
        />
      </AppModal>

      {/* Booking Modal */}
      <AppModal
        open={bookingModalOpen}
        icon={<Calendar className="size-5" />}
        title="Add booking"
        description="Select client, assign services, specify date, timings slot, and booking address."
        onClose={closeBookingModal}
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-2xl border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
              onClick={closeBookingModal}
            >
              Cancel
            </Button>
            <div className="flex flex-col items-end gap-1">
              <Button
                form="quick-booking-form"
                type="submit"
                className="h-11 rounded-2xl bg-[#7c3aed] hover:bg-[#6d28d9] text-white shadow-md shadow-purple-950/10 disabled:opacity-50"
                disabled={
                  bookingLoading ||
                  !bookingValues.customer_id ||
                  !bookingValues.booking_address.trim() ||
                  !bookingValues.booking_date ||
                  !bookingValues.start_time ||
                  !bookingValues.end_time ||
                  !bookingValues.status ||
                  bookingValues.services.length === 0
                }
              >
                Create booking
              </Button>
              {bookingValues.services.length === 0 && (
                <p className="text-xs text-amber-600 font-medium">
                  Select at least 1 service to continue
                </p>
              )}
            </div>
          </>
        }
      >
        <BookingForm
          formId="quick-booking-form"
          values={bookingValues}
          loading={bookingLoading}
          submitText="Create booking"
          onChange={setBookingValues}
          onSubmit={saveBooking}
          onCancel={closeBookingModal}
        />
      </AppModal>
    </>
  );
}
