"use client";

import { Mail, MapPin, Phone, User, Users } from "lucide-react";

import type { CustomerFormValues } from "@/components/common/customers/customer-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type CustomerFormProps = {
  values: CustomerFormValues;
  loading?: boolean;
  submitText?: string;
  onChange: (values: CustomerFormValues) => void;
  onSubmit: () => void;
  onCancel?: () => void;
  formId?: string;
};

function FormField({
  id,
  label,
  icon,
  optional,
  children,
  colSpan2,
}: {
  id: string;
  label: string;
  icon?: React.ReactNode;
  optional?: boolean;
  children: React.ReactNode;
  colSpan2?: boolean;
}) {
  return (
    <div className={`space-y-2${colSpan2 ? " md:col-span-2" : ""}`}>
      <Label htmlFor={id}>
        {label}
        {optional ? (
          <span className="ml-1 text-xs font-normal text-muted-foreground">
            (optional)
          </span>
        ) : null}
      </Label>
      <div className="relative">
        {icon ? (
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 z-10 pointer-events-none">
            {icon}
          </span>
        ) : null}
        {children}
      </div>
    </div>
  );
}

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
      <FormField
        id="customer_name"
        label="Customer name"
        icon={<User className="size-4" />}
        colSpan2
      >
        <Input
          id="customer_name"
          value={values.customer_name}
          onChange={(e) => set("customer_name", e.target.value)}
          placeholder="e.g. Priya Sharma"
          className="h-11 rounded-2xl pl-10"
          disabled={loading}
          required
        />
      </FormField>

      <FormField
        id="phone"
        label="Phone number"
        icon={<Phone className="size-4" />}
      >
        <Input
          id="phone"
          type="tel"
          value={values.phone}
          onChange={(e) => set("phone", e.target.value)}
          placeholder="e.g. 9876543210"
          className="h-11 rounded-2xl pl-10"
          disabled={loading}
          required
        />
      </FormField>

      <FormField
        id="alt_phone"
        label="Alternative phone"
        icon={<Phone className="size-4" />}
        optional
      >
        <Input
          id="alt_phone"
          type="tel"
          value={values.alt_phone}
          onChange={(e) => set("alt_phone", e.target.value)}
          placeholder="e.g. 9123456789"
          className="h-11 rounded-2xl pl-10"
          disabled={loading}
        />
      </FormField>

      <FormField
        id="email"
        label="Email"
        icon={<Mail className="size-4" />}
        colSpan2
      >
        <Input
          id="email"
          type="email"
          value={values.email}
          onChange={(e) => set("email", e.target.value)}
          placeholder="e.g. priya@example.com"
          className="h-11 rounded-2xl pl-10"
          disabled={loading}
          required
        />
      </FormField>

      <FormField
        id="address"
        label="Customer address"
        icon={<MapPin className="size-4" />}
        colSpan2
      >
        <Input
          id="address"
          value={values.address}
          onChange={(e) => set("address", e.target.value)}
          placeholder="e.g. 12 MG Road, Pune"
          className="h-11 rounded-2xl pl-10"
          disabled={loading}
          required
        />
      </FormField>

      <FormField
        id="reference_by"
        label="Reference by"
        icon={<Users className="size-4" />}
        colSpan2
        optional
      >
        <Input
          id="reference_by"
          value={values.reference_by}
          onChange={(e) => set("reference_by", e.target.value)}
          placeholder="e.g. Neha Joshi"
          className="h-11 rounded-2xl pl-10"
          disabled={loading}
        />
      </FormField>
    </form>
  );
}
