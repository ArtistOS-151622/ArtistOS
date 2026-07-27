"use client"

import * as React from "react"
import { Clock } from "lucide-react"
import { Popover as PopoverPrimitive } from "@base-ui/react/popover"
import { cn } from "@/lib/utils"

type TimePickerProps = {
  value?: string // HH:MM (24-hour format)
  onChange: (value: string) => void
  disabled?: boolean
  className?: string
  placeholder?: string
  id?: string
}

// Generate slots from 07:00 to 22:00
const timeSlots = (() => {
  const slots = []
  for (let hour = 7; hour <= 22; hour++) {
    for (const min of ["00", "30"]) {
      if (hour === 22 && min === "30") continue
      const hourStr = String(hour).padStart(2, "0")
      const val = `${hourStr}:${min}`
      const ampm = hour >= 12 ? "PM" : "AM"
      const displayHour = hour % 12 || 12
      const lbl = `${displayHour}:${min} ${ampm}`
      slots.push({ value: val, label: lbl })
    }
  }
  return slots
})()

export function TimePicker({
  value,
  onChange,
  disabled = false,
  className,
  placeholder = "Select time...",
  id,
}: TimePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const listRef = React.useRef<HTMLDivElement>(null)

  const selectedSlot = timeSlots.find((slot) => slot.value === value)

  const handleSelect = (val: string) => {
    onChange(val)
    setIsOpen(false)
  }

  // Scroll active item into view when opening
  React.useEffect(() => {
    if (isOpen && value && listRef.current) {
      const activeElement = listRef.current.querySelector('[data-selected="true"]')
      if (activeElement) {
        activeElement.scrollIntoView({ block: "nearest" })
      }
    }
  }, [isOpen, value])

  return (
    <PopoverPrimitive.Root open={isOpen} onOpenChange={setIsOpen}>
      <PopoverPrimitive.Trigger
        id={id}
        disabled={disabled}
        className={cn(
          "relative inline-flex h-11 w-full items-center justify-between rounded-2xl border border-slate-200/80 bg-white px-3 pl-10 text-sm shadow-sm outline-none transition hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-primary/35 disabled:pointer-events-none disabled:opacity-50 text-left",
          className
        )}
      >
        <Clock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
        <span className={cn("truncate", !value && "text-slate-400 font-normal")}>
          {selectedSlot ? selectedSlot.label : value ? value : placeholder}
        </span>
      </PopoverPrimitive.Trigger>

      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Positioner className="isolate z-50 outline-none" side="bottom" sideOffset={6} align="start">
          <PopoverPrimitive.Popup className="z-50 rounded-2xl bg-white p-1.5 shadow-xl border border-slate-200/80 outline-none text-slate-900 duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 w-[160px]">
            <div
              ref={listRef}
              className="max-h-60 overflow-y-auto pr-0.5 space-y-0.5 scrollbar-thin scrollbar-thumb-slate-200"
            >
              {timeSlots.map((slot) => {
                const isSelected = value === slot.value
                return (
                  <button
                    key={slot.value}
                    type="button"
                    data-selected={isSelected ? "true" : "false"}
                    onClick={() => handleSelect(slot.value)}
                    className={cn(
                      "flex w-full items-center justify-center rounded-xl py-2 px-3 text-xs font-semibold transition outline-none",
                      isSelected
                        ? "bg-[#7c3aed] text-white"
                        : "text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    {slot.label}
                  </button>
                )
              })}
            </div>
          </PopoverPrimitive.Popup>
        </PopoverPrimitive.Positioner>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  )
}
