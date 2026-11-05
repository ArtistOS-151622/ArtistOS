"use client";

import IntlTelInput from "@intl-tel-input/react";
import { Phone } from "lucide-react";

import { cn } from "@/lib/utils";

type InternationalPhoneInputProps = {
  id: string;
  label: string;
  value: string;
  onChange: (number: string) => void;
  onValidityChange: (isValid: boolean) => void;
  disabled?: boolean;
  error?: string;
  required?: boolean;
};

export function InternationalPhoneInput({
  id,
  label,
  value,
  onChange,
  onValidityChange,
  disabled = false,
  error,
  required = false,
}: InternationalPhoneInputProps) {
  return (
    <div className="min-w-0 space-y-1.5">
      <label htmlFor={id} className="block text-xs font-semibold text-slate-500">
        {label}{required ? " *" : ""}
      </label>
      <div
        className={cn(
          "international-phone-field relative rounded-xl border border-slate-200 bg-white shadow-sm shadow-slate-200/40 transition focus-within:border-[#7c3aed] focus-within:ring-4 focus-within:ring-purple-100/70",
          error && "border-red-400 focus-within:border-red-500 focus-within:ring-red-100",
          disabled && "cursor-not-allowed bg-slate-50 opacity-70",
        )}
      >
        <Phone className="pointer-events-none absolute right-3 top-1/2 z-10 size-4 -translate-y-1/2 text-slate-400" />
        <IntlTelInput
          value={value}
          initialCountry="in"
          countryOrder={["in", "us", "gb", "ae", "ca", "au"]}
          separateDialCode
          strictMode
          formatAsYouType
          loadUtils={() => import("intl-tel-input/utils")}
          onChangeNumber={onChange}
          onChangeValidity={onValidityChange}
          disabled={disabled}
          inputProps={{
            id,
            name: id,
            inputMode: "tel",
            autoComplete: "tel",
            "aria-invalid": Boolean(error),
            "aria-describedby": error ? `${id}-error` : undefined,
            className:
              "h-12 w-full rounded-xl border-0 bg-transparent pl-3 pr-10 text-sm text-slate-900 outline-none placeholder:text-slate-400 disabled:cursor-not-allowed",
          }}
        />
      </div>
      {error ? (
        <p id={`${id}-error`} className="px-1 text-xs text-red-500" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
