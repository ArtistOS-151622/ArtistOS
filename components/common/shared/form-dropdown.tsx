"use client"

import { ChevronDown } from "lucide-react"

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
  value: string
  options: FormDropdownOption[]
  disabled?: boolean
  icon?: ReactNode
  className?: string
  onChange: (value: string) => void
}

export function FormDropdown({
  id,
  value,
  options,
  disabled = false,
  icon,
  className,
  onChange,
}: FormDropdownProps) {
  const selected = options.find((option) => option.value === value)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        id={id}
        disabled={disabled}
        className={cn(
          "relative inline-flex h-11 w-full items-center justify-between rounded-2xl border border-slate-200/80 bg-white px-3 text-sm shadow-sm outline-none transition hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-primary/35 disabled:pointer-events-none disabled:opacity-50",
          icon && "pl-10",
          className
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
