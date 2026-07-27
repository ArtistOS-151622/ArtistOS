"use client";

import { Clock, IndianRupee, ScissorsLineDashed } from "lucide-react";

import {
  durationOptions,
  type ServiceFormValues,
} from "@/components/common/services/service-types";
import { FloatingInput } from "@/components/common/shared/floating-input";
import { FormDropdown } from "@/components/common/shared/form-dropdown";
import { Button } from "@/components/ui/button";

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
      <FloatingInput
        id="service_name"
        label="Service name"
        icon={<ScissorsLineDashed className="size-4" />}
        value={values.service_name}
        onChange={(event) =>
          onChange({ ...values, service_name: event.target.value })
        }
        containerClassName="md:col-span-2"
        disabled={loading}
        required
      />

      <FormDropdown
        id="duration_minutes"
        label="Duration"
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

      <FloatingInput
        id="price"
        label="Price (₹)"
        icon={<IndianRupee className="size-4" />}
        type="number"
        min="0"
        value={values.price}
        onChange={(event) =>
          onChange({ ...values, price: event.target.value })
        }
        disabled={loading}
        required
      />
    </form>
  );
}
