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
}: FloatingDropdownProps) {
  const autoId = useId()
  const id = externalId ?? autoId

  const filled = hasValue !== undefined ? hasValue : Boolean(value && value.length > 0)

  return (
    <div className={cn("relative", containerClassName)}>
      <DropdownMenu>
        <DropdownMenuTrigger
          id={id}
          disabled={disabled}
          className={cn(
            "flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900",
            "outline-none transition-all hover:bg-slate-50",
            "focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/15",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            filled ? "pb-2.5 pt-5" : "h-[52px]",
            icon ? "pl-11" : "pl-4",
            triggerClassName,
          )}
        >
          <span className={cn("truncate", filled ? "text-slate-900 font-medium" : "text-slate-400")}>
            {filled ? value : ""}
          </span>
          <ChevronDown className="size-4 text-slate-400 shrink-0 ml-2" />
        </DropdownMenuTrigger>

        <DropdownMenuContent
          className={cn(
            "w-[var(--anchor-width)] rounded-2xl p-1.5 bg-white border border-slate-100 shadow-xl",
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
          "pointer-events-none absolute left-4 transition-all duration-200 text-slate-400",
          filled
            ? "top-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400"
            : "top-1/2 -translate-y-1/2 text-sm",
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
