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
  ...props
}: FloatingInputProps) {
  const autoId = useId()
  const id = externalId ?? autoId

  return (
    <div className={cn("relative", containerClassName)}>
      <input
        id={id}
        value={value}
        defaultValue={defaultValue}
        disabled={disabled}
        placeholder=" "
        className={cn(
          "peer block w-full rounded-2xl border border-slate-200 bg-white px-4 pb-2.5 pt-5 text-sm text-slate-900",
          "outline-none transition-all",
          "focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/15",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          "placeholder-shown:pt-4 placeholder-shown:pb-4",
          icon ? "pl-11" : "pl-4",
          className,
        )}
        {...props}
      />

      {/* Floating label */}
      <label
        htmlFor={id}
        className={cn(
          "pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-400 transition-all duration-200",
          "peer-focus:top-3.5 peer-focus:translate-y-0 peer-focus:text-[10px] peer-focus:font-semibold peer-focus:text-[#7c3aed] peer-focus:uppercase peer-focus:tracking-wider",
          "peer-[:not(:placeholder-shown)]:top-3.5 peer-[:not(:placeholder-shown)]:translate-y-0 peer-[:not(:placeholder-shown)]:text-[10px] peer-[:not(:placeholder-shown)]:font-semibold peer-[:not(:placeholder-shown)]:text-slate-400 peer-[:not(:placeholder-shown)]:uppercase peer-[:not(:placeholder-shown)]:tracking-wider",
          icon ? "left-11" : "left-4",
        )}
      >
        {label}
      </label>

      {/* Leading icon */}
      {icon ? (
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
          {icon}
        </span>
      ) : null}
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
  ...props
}: FloatingTextareaProps) {
  const autoId = useId()
  const id = externalId ?? autoId

  return (
    <div className={cn("relative", containerClassName)}>
      <textarea
        id={id}
        value={value}
        defaultValue={defaultValue}
        disabled={disabled}
        placeholder=" "
        className={cn(
          "peer block w-full rounded-2xl border border-slate-200 bg-white px-4 pb-3 pt-7 text-sm text-slate-900",
          "outline-none transition-all resize-none",
          "focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/15",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          icon ? "pl-11" : "pl-4",
          className,
        )}
        {...props}
      />

      {/* Floating label */}
      <label
        htmlFor={id}
        className={cn(
          "pointer-events-none absolute left-4 top-4 text-sm text-slate-400 transition-all duration-200",
          "peer-focus:top-2 peer-focus:text-[10px] peer-focus:font-semibold peer-focus:text-[#7c3aed] peer-focus:uppercase peer-focus:tracking-wider",
          "peer-[:not(:placeholder-shown)]:top-2 peer-[:not(:placeholder-shown)]:text-[10px] peer-[:not(:placeholder-shown)]:font-semibold peer-[:not(:placeholder-shown)]:text-slate-400 peer-[:not(:placeholder-shown)]:uppercase peer-[:not(:placeholder-shown)]:tracking-wider",
          icon ? "left-11" : "left-4",
        )}
      >
        {label}
      </label>

      {/* Leading icon */}
      {icon ? (
        <span className="pointer-events-none absolute left-3.5 top-4 text-slate-400">
          {icon}
        </span>
      ) : null}
    </div>
  )
}
