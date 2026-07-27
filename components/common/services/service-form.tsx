"use client";

import { Clock, IndianRupee, ScissorsLineDashed } from "lucide-react";

import {
  durationOptions,
  type ServiceFormValues,
} from "@/components/common/services/service-types";
import { FormDropdown } from "@/components/common/shared/form-dropdown";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ServiceFormProps = {
  values: ServiceFormValues;
  loading?: boolean;
  submitText?: string;
  onChange: (values: ServiceFormValues) => void;
  onSubmit: () => void;
  onCancel?: () => void;
  formId?: string;
};

export function ServiceForm({
  values,
  loading = false,
  submitText = "Add service",
  onChange,
  onSubmit,
  onCancel,
  formId = "service-form",
}: ServiceFormProps) {
  return (
    <form
      id={formId}
      className="grid gap-4 md:grid-cols-2"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="service_name">Service name</Label>
        <div className="relative">
          <ScissorsLineDashed className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <Input
            id="service_name"
            value={values.service_name}
            onChange={(event) =>
              onChange({ ...values, service_name: event.target.value })
            }
            placeholder="e.g. Bridal mehendi"
            className="h-11 rounded-2xl pl-10"
            disabled={loading}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="duration_minutes">Duration</Label>
        <FormDropdown
          id="duration_minutes"
          value={String(values.duration_minutes)}
          options={durationOptions.map((option) => ({
            label: option.label,
            value: String(option.value),
          }))}
          icon={<Clock className="size-4" />}
          disabled={loading}
          onChange={(value) =>
            onChange({ ...values, duration_minutes: Number(value) })
          }
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="price">Price</Label>
        <div className="relative">
          <IndianRupee className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <Input
            id="price"
            type="number"
            min="0"
            value={values.price}
            onChange={(event) =>
              onChange({ ...values, price: event.target.value })
            }
            placeholder="2500"
            className="h-11 rounded-2xl pl-10"
            disabled={loading}
          />
        </div>
      </div>
    </form>
  );
}
