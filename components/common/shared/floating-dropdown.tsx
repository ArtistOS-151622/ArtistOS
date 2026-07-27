"use client"

import React, { useId } from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
} from "@/components/ui/dropdown-menu"

type FloatingDropdownProps = {
  label: string
  value?: string
  hasValue?: boolean
  icon?: React.ReactNode
  disabled?: boolean
  children: React.ReactNode
  triggerClassName?: string
  contentClassName?: string
  containerClassName?: string
  id?: string
  error?: string
}

export function FloatingDropdown({
  label,
  value,
  hasValue,
  icon,
  disabled,
  children,
  triggerClassName,
  contentClassName,
  containerClassName,
  id: externalId,
  error,
}: FloatingDropdownProps) {
  const autoId = useId()
  const id = externalId ?? autoId

  const filled = hasValue !== undefined ? hasValue : Boolean(value && value.length > 0)

  return (
    <div className={cn("relative group", containerClassName)}>
      <DropdownMenu>
        <DropdownMenuTrigger
          id={id}
          disabled={disabled}
          className={cn(
            "flex w-full items-center justify-between rounded-lg border bg-white text-sm text-slate-900",
            "border-slate-200 shadow-sm shadow-slate-200/40",
            "outline-none transition-all duration-200",
            "hover:bg-slate-50",
            "focus:border-[#7c3aed] focus:shadow-[0_0_0_3px_rgba(124,58,237,0.10)]",
            "data-[state=open]:border-[#7c3aed] data-[state=open]:shadow-[0_0_0_3px_rgba(124,58,237,0.10)]",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            error && "border-red-400",
            // Height: consistent height since label floats to border
            "h-[46px] px-4",
            icon ? "pl-11" : "pl-4",
            triggerClassName,
          )}
        >
          <span className={cn("truncate", filled ? "text-slate-900 font-medium" : "text-transparent select-none")}>
            {filled ? value : "‎"}
          </span>
          <ChevronDown
            className={cn(
              "size-4 text-slate-400 shrink-0 ml-2 transition-transform duration-200",
              "group-data-[state=open]:rotate-180",
            )}
          />
        </DropdownMenuTrigger>

        <DropdownMenuContent
          className={cn(
            "w-[var(--anchor-width)] rounded-2xl p-1.5 bg-white border border-slate-100 shadow-xl",
            "animate-in fade-in-0 zoom-in-95 duration-150",
            contentClassName,
          )}
        >
          {children}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Floating label */}
      <label
        htmlFor={id}
        className={cn(
          "pointer-events-none absolute select-none text-slate-400 bg-white px-1",
          "transition-all duration-200 ease-out",
          filled
            ? "top-0 -translate-y-1/2 text-[10px] font-semibold uppercase tracking-wider text-slate-400"
            : "top-1/2 -translate-y-1/2 text-sm",
          icon ? "left-10" : "left-3",
        )}
      >
        {label}
      </label>

      {/* Leading icon */}
      {icon ? (
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition-colors duration-200">
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
