"use client"

import { ChevronDown } from "lucide-react"
import { useId } from "react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import type { ReactNode } from "react"

type FormDropdownOption = {
  label: string
  value: string
}

type FormDropdownProps = {
  id?: string
  label?: string
  value: string
  options: FormDropdownOption[]
  disabled?: boolean
  icon?: ReactNode
  className?: string
  containerClassName?: string
  onChange: (value: string) => void
}

export function FormDropdown({
  id: externalId,
  label,
  value,
  options,
  disabled = false,
  icon,
  className,
  containerClassName,
  onChange,
}: FormDropdownProps) {
  const autoId = useId()
  const id = externalId ?? autoId
  const selected = options.find((option) => option.value === value)
  const filled = Boolean(value)

  // If no label is given, render the original compact style
  if (!label) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger
          id={id}
          disabled={disabled}
          className={cn(
            "relative inline-flex h-[46px] w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-3 text-sm shadow-sm shadow-slate-200/40 outline-none transition-all duration-200 hover:bg-slate-50 focus:border-[#7c3aed] focus:shadow-[0_0_0_3px_rgba(124,58,237,0.10)] data-[state=open]:border-[#7c3aed] data-[state=open]:shadow-[0_0_0_3px_rgba(124,58,237,0.10)] disabled:pointer-events-none disabled:opacity-50",
            icon && "pl-10",
            className,
          )}
        >
          {icon ? <span className="absolute left-3 text-slate-400">{icon}</span> : null}
          <span>{selected?.label}</span>
          <ChevronDown className="size-4 text-slate-400" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="rounded-2xl p-1.5">
          <DropdownMenuRadioGroup value={value} onValueChange={onChange}>
            {options.map((option) => (
              <DropdownMenuRadioItem
                key={option.value}
                value={option.value}
                closeOnClick
                className="h-10 rounded-xl px-3 text-sm"
              >
                {option.label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  // Floating label style
  return (
    <div className={cn("relative group", containerClassName)}>
      <DropdownMenu>
        <DropdownMenuTrigger
          id={id}
          disabled={disabled}
          className={cn(
            "flex w-full items-center justify-between rounded-lg border border-slate-200 bg-white text-sm text-slate-900",
            "shadow-sm shadow-slate-200/40 outline-none transition-all duration-200",
            "hover:bg-slate-50",
            "focus:border-[#7c3aed] focus:shadow-[0_0_0_3px_rgba(124,58,237,0.10)]",
            "data-[state=open]:border-[#7c3aed] data-[state=open]:shadow-[0_0_0_3px_rgba(124,58,237,0.10)]",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            "h-[46px] px-4",
            icon ? "pl-11" : "pl-4",
            className,
          )}
        >
          <span className={cn("truncate", filled ? "text-slate-900 font-medium" : "text-transparent select-none")}>
            {filled ? selected?.label : "‎"}
          </span>
          <ChevronDown className="size-4 text-slate-400 shrink-0 ml-2 transition-transform duration-200" />
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="start"
          className="w-[var(--anchor-width)] rounded-2xl p-1.5 bg-white border border-slate-100 shadow-xl animate-in fade-in-0 zoom-in-95 duration-150"
        >
          <DropdownMenuRadioGroup value={value} onValueChange={onChange}>
            {options.map((option) => (
              <DropdownMenuRadioItem
                key={option.value}
                value={option.value}
                closeOnClick
                className="h-10 rounded-xl px-3 text-sm"
              >
                {option.label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Floating label */}
      <label
        htmlFor={id}
        className={cn(
          "pointer-events-none absolute select-none text-slate-400 bg-white px-1",
          "transition-all duration-200 ease-out",
          filled
            ? "top-0 -translate-y-1/2 text-[10px] font-semibold uppercase tracking-wider"
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
    </div>
  )
}
