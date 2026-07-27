"use client"

import * as React from "react"
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react"
import { Popover as PopoverPrimitive } from "@base-ui/react/popover"
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  startOfWeek,
  endOfWeek,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  parseISO
} from "date-fns"
import { cn } from "@/lib/utils"

type DatePickerProps = {
  value?: string // YYYY-MM-DD
  onChange: (value: string) => void
  disabled?: boolean
  className?: string
  placeholder?: string
  id?: string
}

export function DatePicker({
  value,
  onChange,
  disabled = false,
  className,
  placeholder = "Select date...",
  id,
}: DatePickerProps) {
  const selectedDate = value ? parseISO(value) : null
  const [currentMonth, setCurrentMonth] = React.useState(selectedDate || new Date())
  const [isOpen, setIsOpen] = React.useState(false)

  // Sync currentMonth state when selectedDate changes from prop (e.g. during edit)
  React.useEffect(() => {
    if (selectedDate) {
      setCurrentMonth(selectedDate)
    }
  }, [value])

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(monthStart)
  const startDate = startOfWeek(monthStart, { weekStartsOn: 0 })
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 })

  const days = eachDayOfInterval({ start: startDate, end: endDate })
  const weekDays = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]

  const handleSelect = (day: Date) => {
    // Format as YYYY-MM-DD
    const formatted = format(day, "yyyy-MM-dd")
    onChange(formatted)
    setIsOpen(false)
  }

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
        <CalendarIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
        <span className={cn("truncate", !value && "text-slate-400 font-normal")}>
          {selectedDate ? format(selectedDate, "PPP") : placeholder}
        </span>
      </PopoverPrimitive.Trigger>

      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Positioner className="isolate z-50 outline-none" side="bottom" sideOffset={6} align="start">
          <PopoverPrimitive.Popup className="z-50 rounded-2xl bg-white p-4 shadow-xl border border-slate-200/80 outline-none text-slate-900 duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 w-[300px]">
            {/* Header */}
            <div className="flex items-center justify-between gap-2 pb-3">
              <button
                type="button"
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                className="flex size-7 items-center justify-center rounded-lg border border-slate-100 bg-white hover:bg-slate-50 text-slate-600 transition"
              >
                <ChevronLeft className="size-4" />
              </button>
              <span className="text-sm font-semibold text-slate-800">
                {format(currentMonth, "MMMM yyyy")}
              </span>
              <button
                type="button"
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                className="flex size-7 items-center justify-center rounded-lg border border-slate-100 bg-white hover:bg-slate-50 text-slate-600 transition"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>

            {/* Weekdays */}
            <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-slate-400 py-1">
              {weekDays.map((wd) => (
                <div key={wd}>{wd}</div>
              ))}
            </div>

            {/* Days grid */}
            <div className="grid grid-cols-7 gap-1 text-center mt-1">
              {days.map((day, idx) => {
                const isSelected = selectedDate ? isSameDay(day, selectedDate) : false
                const isCurrent = isSameMonth(day, currentMonth)
                const isToday = isSameDay(day, new Date())

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelect(day)}
                    className={cn(
                      "flex size-8 items-center justify-center rounded-full text-xs font-medium transition outline-none",
                      !isCurrent && "text-slate-300 hover:bg-slate-50",
                      isCurrent && !isSelected && "text-slate-700 hover:bg-slate-100",
                      isToday && !isSelected && "ring-1 ring-purple-400 text-purple-700",
                      isSelected && "bg-[#7c3aed] text-white hover:bg-[#6d28d9]"
                    )}
                  >
                    {format(day, "d")}
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
