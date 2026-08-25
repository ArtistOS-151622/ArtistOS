"use client";

import { useState } from "react";
import { Mail, MapPin, Phone, User, Users } from "lucide-react";

import type { CustomerFormValues } from "@/components/common/customers/customer-types";
import { FloatingInput } from "@/components/common/shared/floating-input";

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
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = <K extends keyof CustomerFormValues>(
    key: K,
    val: CustomerFormValues[K],
  ) => {
    if (errors[key]) {
      setErrors((prev) => ({ ...prev, [key]: "" }));
    }
    onChange({ ...values, [key]: val });
  };

  return (
    <form
      id={formId}
      noValidate
      className="grid gap-4 md:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        const newErrors: Record<string, string> = {};
        if (!values.customer_name?.trim()) newErrors.customer_name = "Please fill out this field.";
        if (!values.phone?.trim()) newErrors.phone = "Please fill out this field.";
        if (!values.email?.trim()) newErrors.email = "Please fill out this field.";
        if (!values.address?.trim()) newErrors.address = "Please fill out this field.";

        if (Object.keys(newErrors).length > 0) {
          setErrors(newErrors);
          return;
        }
        onSubmit();
      }}
    >
      <FloatingInput
        id="customer_name"
        label="Customer name"
        icon={<User className="size-4" />}
        value={values.customer_name}
        onChange={(e) => set("customer_name", e.target.value.slice(0, 50))}
        containerClassName="md:col-span-2"
        disabled={loading}
        maxLength={50}
        error={errors.customer_name}
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
        error={errors.phone}
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
        error={errors.alt_phone}
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
        error={errors.email}
        required
      />

      <FloatingInput
        id="address"
        label="Customer address"
        icon={<MapPin className="size-4" />}
        value={values.address}
        onChange={(e) => set("address", e.target.value.slice(0, 200))}
        maxLength={200}
        containerClassName="md:col-span-2"
        disabled={loading}
        error={errors.address}
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
