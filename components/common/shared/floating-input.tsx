"use client"

import React, { useId } from "react"
import { cn } from "@/lib/utils"

/* ─────────────────────────────────────────
   FloatingInput
───────────────────────────────────────── */
type FloatingInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "id" | "placeholder"> & {
  label: string
  icon?: React.ReactNode
  id?: string
  containerClassName?: string
  error?: string
}

export function FloatingInput({
  label,
  icon,
  id: externalId,
  className,
  containerClassName,
  disabled,
  value,
  defaultValue,
  error,
  ...props
}: FloatingInputProps) {
  const autoId = useId()
  const id = externalId ?? autoId

  return (
    <div className={cn("relative group", containerClassName)}>
      <input
        id={id}
        value={value}
        defaultValue={defaultValue}
        disabled={disabled}
        placeholder=" "
        className={cn(
          // Base layout
          "peer block w-full rounded-lg border bg-white px-4 h-[46px] text-sm text-slate-900",
          // Border
          "border-slate-200 shadow-sm shadow-slate-200/40",
          // Transitions
          "outline-none transition-all duration-200",
          // Focus styles
          "focus:border-[#7c3aed] focus:shadow-[0_0_0_3px_rgba(124,58,237,0.10)]",
          // Disabled
          "disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-50",
          // Error
          error && "border-red-400 focus:border-red-500 focus:shadow-[0_0_0_3px_rgba(239,68,68,0.10)]",
          // Icon padding
          icon ? "pl-11" : "pl-4",
          className,
        )}
        {...props}
      />

      {/* Floating label */}
      <label
        htmlFor={id}
        className={cn(
          // Base position — vertically centered
          "pointer-events-none absolute select-none text-slate-400 bg-white px-1",
          "top-1/2 -translate-y-1/2 text-sm",
          // Smooth transition for all transform properties
          "transition-all duration-200 ease-out",
          // When focused OR has value — float up to border
          "peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:text-[10px] peer-focus:font-semibold peer-focus:text-[#7c3aed] peer-focus:uppercase peer-focus:tracking-wider",
          "peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:-translate-y-1/2 peer-[:not(:placeholder-shown)]:text-[10px] peer-[:not(:placeholder-shown)]:font-semibold peer-[:not(:placeholder-shown)]:text-slate-400 peer-[:not(:placeholder-shown)]:uppercase peer-[:not(:placeholder-shown)]:tracking-wider",
          // Disabled label
          "peer-disabled:opacity-50",
          // Error color
          error && "peer-focus:text-red-500",
          // Icon offset
          icon ? "left-10" : "left-3",
        )}
      >
        {label}
      </label>

      {/* Leading icon */}
      {icon ? (
        <span
          className={cn(
            "pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400",
            "transition-colors duration-200",
            "peer-focus:text-[#7c3aed]",
          )}
        >
          {icon}
        </span>
      ) : null}

      {/* Error message */}
      {error && (
        <p className="mt-1.5 text-xs text-red-500 pl-1">{error}</p>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────
   FloatingTextarea
───────────────────────────────────────── */
type FloatingTextareaProps = Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "id" | "placeholder"> & {
  label: string
  icon?: React.ReactNode
  id?: string
  containerClassName?: string
  error?: string
}

export function FloatingTextarea({
  label,
  icon,
  id: externalId,
  className,
  containerClassName,
  disabled,
  value,
  defaultValue,
  error,
  ...props
}: FloatingTextareaProps) {
  const autoId = useId()
  const id = externalId ?? autoId

  return (
    <div className={cn("relative group", containerClassName)}>
      <textarea
        id={id}
        value={value}
        defaultValue={defaultValue}
        disabled={disabled}
        placeholder=" "
        className={cn(
          "peer block w-full rounded-lg border border-slate-200 bg-white px-4 py-4 text-sm text-slate-900",
          "shadow-sm shadow-slate-200/40 outline-none transition-all duration-200 resize-none",
          "focus:border-[#7c3aed] focus:shadow-[0_0_0_3px_rgba(124,58,237,0.10)]",
          "disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-50",
          error && "border-red-400 focus:border-red-500",
          icon ? "pl-11" : "pl-4",
          className,
        )}
        {...props}
      />

      {/* Floating label */}
      <label
        htmlFor={id}
        className={cn(
          "pointer-events-none absolute top-4 select-none text-sm text-slate-400 bg-white px-1",
          "transition-all duration-200 ease-out",
          "peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:text-[10px] peer-focus:font-semibold peer-focus:text-[#7c3aed] peer-focus:uppercase peer-focus:tracking-wider",
          "peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:-translate-y-1/2 peer-[:not(:placeholder-shown)]:text-[10px] peer-[:not(:placeholder-shown)]:font-semibold peer-[:not(:placeholder-shown)]:text-slate-400 peer-[:not(:placeholder-shown)]:uppercase peer-[:not(:placeholder-shown)]:tracking-wider",
          "peer-disabled:opacity-50",
          error && "peer-focus:text-red-500",
          icon ? "left-10" : "left-3",
        )}
      >
        {label}
      </label>

      {/* Leading icon */}
      {icon ? (
        <span
          className={cn(
            "pointer-events-none absolute left-3.5 top-4 text-slate-400",
            "transition-colors duration-200 peer-focus:text-[#7c3aed]",
          )}
        >
          {icon}
        </span>
      ) : null}

      {/* Error message */}
      {error && (
        <p className="mt-1.5 text-xs text-red-500 pl-1">{error}</p>
      )}
    </div>
  )
}

// ── Floating Phone Input ───────────────────────────────────────────────────────

export type FloatingPhoneInputProps = Omit<React.ComponentProps<"input">, "type" | "placeholder" | "id"> & {
  label: string
  id?: string
  containerClassName?: string
  error?: string
  countryCode?: string
}

export function FloatingPhoneInput({
  label,
  countryCode = "+91",
  id: externalId,
  className,
  containerClassName,
  disabled,
  value,
  defaultValue,
  error,
  ...props
}: FloatingPhoneInputProps) {
  const autoId = useId()
  const id = externalId ?? autoId

  return (
    <div className={cn("relative group", containerClassName)}>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={value}
        defaultValue={defaultValue}
        disabled={disabled}
        placeholder=" "
        className={cn(
          // Base layout
          "peer block w-full rounded-lg border bg-white px-4 h-[46px] text-sm text-slate-900 font-semibold tracking-[0.1em]",
          // Border
          "border-slate-200 shadow-sm shadow-slate-200/40",
          // Transitions
          "outline-none transition-all duration-200",
          // Focus styles
          "focus:border-[#7c3aed] focus:shadow-[0_0_0_3px_rgba(124,58,237,0.10)]",
          // Disabled
          "disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-50",
          // Error
          error && "border-red-400 focus:border-red-500 focus:shadow-[0_0_0_3px_rgba(239,68,68,0.10)]",
          // Padding for badge
          "pl-[3.25rem]",
          className,
        )}
        {...props}
      />

      {/* Country Code Badge */}
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 shrink-0 rounded bg-[#f3e8ff] px-1.5 py-0.5 text-xs font-semibold text-[#7c3aed] transition-colors peer-disabled:opacity-50">
        {countryCode}
      </span>

      {/* Floating label */}
      <label
        htmlFor={id}
        className={cn(
          // Base position — vertically centered
          "pointer-events-none absolute select-none text-slate-400 bg-white px-1",
          "top-1/2 -translate-y-1/2 text-sm",
          // Smooth transition for all transform properties
          "transition-all duration-200 ease-out",
          // When focused OR has value — float up to border
          "peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:text-[10px] peer-focus:font-semibold peer-focus:text-[#7c3aed] peer-focus:uppercase peer-focus:tracking-wider peer-focus:left-3",
          "peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:-translate-y-1/2 peer-[:not(:placeholder-shown)]:text-[10px] peer-[:not(:placeholder-shown)]:font-semibold peer-[:not(:placeholder-shown)]:text-slate-400 peer-[:not(:placeholder-shown)]:uppercase peer-[:not(:placeholder-shown)]:tracking-wider peer-[:not(:placeholder-shown)]:left-3",
          "peer-disabled:opacity-50",
          error && "peer-focus:text-red-500",
          // Start position (with badge offset)
          "left-[3.25rem]",
        )}
      >
        {label}
      </label>

      {/* Error message */}
      {error && (
        <p className="mt-1.5 text-xs text-red-500 pl-1">{error}</p>
      )}
    </div>
  )
}
