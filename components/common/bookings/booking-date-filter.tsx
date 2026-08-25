"use client"

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type WheelEvent,
} from "react"
import {
  addMonths,
  format,
  getDaysInMonth,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfToday,
  subMonths,
} from "date-fns"
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

type BookingDateFilterProps = {
  selectedDate: string
  status?: string
  onChange: (date: string) => void
}

export function BookingDateFilter({ selectedDate, status = "all", onChange }: BookingDateFilterProps) {
  const [counts, setCounts] = useState<Record<string, number>>({})
  const scrollRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [startX, setStartX] = useState(0)
  const [scrollLeft, setScrollLeft] = useState(0)

  const initialMonth = parseSelectedDate(selectedDate)
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(initialMonth))
  const [pickerYear, setPickerYear] = useState(currentMonth.getFullYear())
  const today = startOfToday()

  const dates = useMemo(() => {
    const daysInMonth = getDaysInMonth(currentMonth)
    const monthStart = startOfMonth(currentMonth)

    return Array.from({ length: daysInMonth }, (_, index) => {
      const date = new Date(monthStart)
      date.setDate(index + 1)
      return date
    })
  }, [currentMonth])

  useEffect(() => {
    if (dates.length === 0) return

    let ignore = false

    async function fetchCounts() {
      try {
        const start = format(dates[0], "yyyy-MM-dd")
        const end = format(dates[dates.length - 1], "yyyy-MM-dd")
        const res = await fetch(`/api/bookings/counts?start_date=${start}&end_date=${end}&status=${encodeURIComponent(status)}`)

        if (res.ok) {
          const data = await res.json()
          const countsMap: Record<string, number> = {}

          ;(data.counts ?? []).forEach((count: { date: string; count: number }) => {
            countsMap[count.date] = count.count
          })

          if (!ignore) setCounts(countsMap)
        }
      } catch (error) {
        console.error("Failed to fetch booking counts", error)
      }
    }

    void fetchCounts()

    return () => {
      ignore = true
    }
  }, [dates, status])

  useEffect(() => {
    if (!scrollRef.current) return

    const container = scrollRef.current
    const timeout = window.setTimeout(() => {
      const selectedEl = container.querySelector('[data-selected="true"]') as HTMLElement

      if (selectedEl) {
        const left = selectedEl.offsetLeft - container.offsetWidth / 2 + selectedEl.offsetWidth / 2
        container.scrollTo({ left, behavior: "smooth" })
      } else {
        container.scrollTo({ left: 0, behavior: "smooth" })
      }
    }, 100)

    return () => window.clearTimeout(timeout)
  }, [selectedDate, dates])

  function handleMouseDown(e: MouseEvent<HTMLDivElement>) {
    setIsDragging(true)
    setStartX(e.pageX - (scrollRef.current?.offsetLeft || 0))
    setScrollLeft(scrollRef.current?.scrollLeft || 0)
  }

  function handleMouseMove(e: MouseEvent<HTMLDivElement>) {
    if (!isDragging) return

    e.preventDefault()
    const x = e.pageX - (scrollRef.current?.offsetLeft || 0)
    const walk = (x - startX) * 2

    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollLeft - walk
    }
  }

  function handleWheel(e: WheelEvent<HTMLDivElement>) {
    if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return

    e.currentTarget.scrollLeft += e.deltaY
  }

  function scrollDates(direction: "left" | "right") {
    scrollRef.current?.scrollBy({
      left: direction === "left" ? -280 : 280,
      behavior: "smooth",
    })
  }

  function changeCurrentMonth(month: Date) {
    const nextMonth = startOfMonth(month)
    setCurrentMonth(nextMonth)
    setPickerYear(nextMonth.getFullYear())

    const targetDate = isSameMonth(nextMonth, today) ? today : nextMonth
    onChange(format(targetDate, "yyyy-MM-dd"))
  }

  const selectedCount = counts[selectedDate] ?? 0

  return (
    <div className="w-full max-w-full min-w-0 rounded-[1.5rem] border border-white/80 bg-white/80 p-3 shadow-lg shadow-purple-950/5 backdrop-blur sm:p-4">
      <div className="flex min-w-0 items-center justify-between gap-2 sm:gap-3">
        <div className="flex min-w-0 items-center gap-2 overflow-hidden sm:gap-2.5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-[#f5f3ff] text-[#7c3aed] sm:size-10 sm:rounded-2xl">
            <CalendarDays className="size-4 sm:size-5" />
          </div>
          <div className="min-w-0 flex-1 overflow-hidden">
            <p className="truncate text-xs font-extrabold text-slate-900 sm:text-sm">
              <span className="sm:hidden">
                {selectedDate ? format(parseSelectedDate(selectedDate), "EEE, dd MMM") : "Select date"}
              </span>
              <span className="hidden sm:inline">
                {selectedDate ? format(parseSelectedDate(selectedDate), "EEEE, dd MMMM") : "Select date"}
              </span>
            </p>
            <p className="truncate text-[11px] font-semibold text-slate-500 sm:text-xs">
              {bookingsCountLabel(selectedCount)}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center rounded-2xl border border-slate-100 bg-white p-1 shadow-sm shadow-purple-950/5 sm:p-1.5">
          <button
            type="button"
            aria-label="Previous month"
            onClick={() => changeCurrentMonth(subMonths(currentMonth, 1))}
            className="flex size-7.5 shrink-0 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 sm:size-9"
          >
            <ChevronLeft className="size-3.5 sm:size-4" />
          </button>

          <div className="min-w-0 flex-1">
            <DropdownMenu>
              <DropdownMenuTrigger className="flex min-w-0 items-center justify-center gap-1 rounded-xl px-1.5 py-1.5 outline-none transition-colors hover:bg-slate-50 sm:gap-1.5 sm:px-2 sm:py-2 sm:w-[156px]">
                <span className="truncate text-xs font-bold text-slate-800 sm:text-sm">
                  <span className="sm:hidden">{format(currentMonth, "MMM yyyy")}</span>
                  <span className="hidden sm:inline">{format(currentMonth, "MMMM yyyy")}</span>
                </span>
                <ChevronDown className="size-3 shrink-0 text-slate-400 sm:size-3.5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 rounded-2xl border-slate-100 bg-white p-3 shadow-xl shadow-purple-950/10">
                <div className="mb-3 flex items-center justify-between px-1">
                  <button
                    type="button"
                    aria-label="Previous year"
                    onClick={(e) => {
                      e.preventDefault()
                      setPickerYear((year) => year - 1)
                    }}
                    className="flex size-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
                  >
                    <ChevronLeft className="size-4" />
                  </button>
                  <span className="text-[15px] font-bold text-slate-800">{pickerYear}</span>
                  <button
                    type="button"
                    aria-label="Next year"
                    onClick={(e) => {
                      e.preventDefault()
                      setPickerYear((year) => year + 1)
                    }}
                    className="flex size-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
                  >
                    <ChevronRight className="size-4" />
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {Array.from({ length: 12 }).map((_, index) => (
                    <DropdownMenuItem
                      key={index}
                      onClick={() => changeCurrentMonth(new Date(pickerYear, index, 1))}
                      className={cn(
                        "flex cursor-pointer justify-center rounded-xl py-2 text-xs font-semibold outline-none transition-colors",
                        currentMonth.getMonth() === index && currentMonth.getFullYear() === pickerYear
                          ? "bg-[#7c3aed] text-white focus:bg-[#7c3aed] focus:text-white"
                          : "text-slate-600 focus:bg-purple-50 focus:text-[#7c3aed]",
                      )}
                    >
                      {format(new Date(2024, index, 1), "MMM")}
                    </DropdownMenuItem>
                  ))}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <button
            type="button"
            aria-label="Next month"
            onClick={() => changeCurrentMonth(addMonths(currentMonth, 1))}
            className="flex size-7.5 shrink-0 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 sm:size-9"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      <div className="mt-3 grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-[auto_minmax(0,1fr)_auto]">
        <button
          type="button"
          aria-label="Scroll dates left"
          onClick={() => scrollDates("left")}
          className="hidden size-10 items-center justify-center self-center rounded-2xl border border-slate-100 bg-white text-slate-500 shadow-sm shadow-purple-950/5 transition hover:text-slate-900 sm:flex"
        >
          <ChevronLeft className="size-4" />
        </button>

        <div className="min-w-0 overflow-hidden">
          <div
            ref={scrollRef}
            onMouseDown={handleMouseDown}
            onMouseLeave={() => setIsDragging(false)}
            onMouseUp={() => setIsDragging(false)}
            onMouseMove={handleMouseMove}
            onWheel={handleWheel}
            className={cn(
              "flex w-full min-w-0 snap-x items-stretch gap-2 overflow-x-scroll overscroll-x-contain scroll-smooth px-0.5 pb-2 pt-1 touch-pan-x",
              isDragging ? "cursor-grabbing" : "cursor-grab",
            )}
            style={{ WebkitOverflowScrolling: "touch", scrollbarWidth: "none" }}
          >
            {dates.map((date) => {
              const dateStr = format(date, "yyyy-MM-dd")
              const isSelected = selectedDate === dateStr
              const count = counts[dateStr] || 0
              const isToday = isSameDay(date, today)

              return (
                <button
                  key={dateStr}
                  type="button"
                  data-selected={isSelected}
                  onClick={() => onChange(dateStr)}
                  className={cn(
                    "relative flex h-[60px] min-w-[52px] shrink-0 snap-center select-none flex-col items-center justify-center rounded-md border px-2 transition-all sm:h-16 sm:min-w-[50px]",
                    isSelected
                      ? "border-[#7c3aed] bg-[#7c3aed] text-white shadow-lg shadow-purple-950/20"
                      : "border-slate-100 bg-white text-slate-500 shadow-sm shadow-purple-950/5 hover:border-purple-100 hover:bg-purple-50",
                  )}
                >
                  {count > 0 && (
                    <span
                      className={cn(
                        "absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-md text-[10px] font-bold shadow-sm ring-2 ring-white",
                        isSelected ? "bg-white text-[#7c3aed]" : "bg-[#7c3aed] text-white",
                      )}
                    >
                      {count}
                    </span>
                  )}
                  <span
                    className={cn(
                      "text-[10px] font-bold uppercase",
                      isSelected ? "text-purple-100" : "text-slate-400",
                    )}
                  >
                    {format(date, "EEE")}
                  </span>
                  <span
                    className={cn(
                      "mt-1 text-xl font-black leading-none",
                      isSelected ? "text-white" : "text-slate-900",
                    )}
                  >
                    {format(date, "d")}
                  </span>
                  {/* <span
                    className={cn(
                      "mt-2 h-1 w-5 rounded-full",
                      isToday
                        ? isSelected
                          ? "bg-white"
                          : "bg-[#7c3aed]"
                        : "bg-transparent",
                    )}
                  /> */}
                </button>
              )
            })}
          </div>
        </div>

        <button
          type="button"
          aria-label="Scroll dates right"
          onClick={() => scrollDates("right")}
          className="hidden size-10 items-center justify-center self-center rounded-2xl border border-slate-100 bg-white text-slate-500 shadow-sm shadow-purple-950/5 transition hover:text-slate-900 sm:flex"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
    </div>
  )
}

function parseSelectedDate(value: string) {
  if (!value) return startOfToday()
  const date = new Date(`${value}T00:00:00`)
  return isNaN(date.getTime()) ? startOfToday() : date
}

function bookingsCountLabel(count: number) {
  if (count === 0) return "No bookings"
  if (count === 1) return "1 booking"
  return `${count} bookings`
}
