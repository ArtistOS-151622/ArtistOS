"use client";

import { Mail, MapPin, Phone, User, Users } from "lucide-react";

import type { CustomerFormValues } from "@/components/common/customers/customer-types";
import { FloatingInput } from "@/components/common/shared/floating-input";
import { Button } from "@/components/ui/button";

type CustomerFormProps = {
  values: CustomerFormValues;
  loading?: boolean;
  submitText?: string;
  onChange: (values: CustomerFormValues) => void;
  onSubmit: () => void;
  onCancel?: () => void;
  formId?: string;
};

export function CustomerForm({
  values,
  loading = false,
  submitText = "Add customer",
  onChange,
  onSubmit,
  onCancel,
  formId = "customer-form",
}: CustomerFormProps) {
  const set = <K extends keyof CustomerFormValues>(
    key: K,
    val: CustomerFormValues[K],
  ) => onChange({ ...values, [key]: val });

  return (
    <form
      id={formId}
      className="grid gap-4 md:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <FloatingInput
        id="customer_name"
        label="Customer name"
        icon={<User className="size-4" />}
        value={values.customer_name}
        onChange={(e) => set("customer_name", e.target.value)}
        containerClassName="md:col-span-2"
        disabled={loading}
        maxLength={50}
        required
      />

      <FloatingInput
        id="phone"
        label="Phone number"
        icon={<Phone className="size-4" />}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={10}
        value={values.phone}
        onChange={(e) => set("phone", e.target.value.replace(/\D/g, "").slice(0, 10))}
        onKeyDown={(e) => {
          const allowed = ["Backspace","Delete","Tab","Escape","Enter","ArrowLeft","ArrowRight","ArrowUp","ArrowDown","Home","End"]
          if (!allowed.includes(e.key) && !/^\d$/.test(e.key) && !e.ctrlKey && !e.metaKey) e.preventDefault()
        }}
        disabled={loading}
        required
      />

      <FloatingInput
        id="alt_phone"
        label="Alternative phone (optional)"
        icon={<Phone className="size-4" />}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={10}
        value={values.alt_phone}
        onChange={(e) => set("alt_phone", e.target.value.replace(/\D/g, "").slice(0, 10))}
        onKeyDown={(e) => {
          const allowed = ["Backspace","Delete","Tab","Escape","Enter","ArrowLeft","ArrowRight","ArrowUp","ArrowDown","Home","End"]
          if (!allowed.includes(e.key) && !/^\d$/.test(e.key) && !e.ctrlKey && !e.metaKey) e.preventDefault()
        }}
        disabled={loading}
      />

      <FloatingInput
        id="email"
        label="Email"
        icon={<Mail className="size-4" />}
        type="email"
        value={values.email}
        onChange={(e) => set("email", e.target.value)}
        containerClassName="md:col-span-2"
        disabled={loading}
        required
      />

      <FloatingInput
        id="address"
        label="Customer address"
        icon={<MapPin className="size-4" />}
        value={values.address}
        onChange={(e) => set("address", e.target.value)}
        containerClassName="md:col-span-2"
        disabled={loading}
        required
      />

      <FloatingInput
        id="reference_by"
        label="Reference by (optional)"
        icon={<Users className="size-4" />}
        value={values.reference_by}
        onChange={(e) => set("reference_by", e.target.value)}
        containerClassName="md:col-span-2"
        disabled={loading}
      />
    </form>
  );
}
