"use client"

import { useMemo, useState, useEffect, useCallback } from "react"
import { Calendar as BigCalendar, dateFnsLocalizer, Navigate } from "react-big-calendar"
import type {
  EventProps,
  EventPropGetter,
  SlotInfo,
  ToolbarProps,
  View,
} from "react-big-calendar"
import { differenceInMinutes, format, getDay, parse, startOfWeek, startOfMonth, endOfMonth, subDays, addDays } from "date-fns"
import { enUS } from "date-fns/locale/en-US"
import { ChevronLeft, ChevronRight, Loader2, User, Phone, Clock, MapPin, FileText } from "lucide-react"

import type { Booking } from "@/components/common/bookings/booking-types"
import { BookingCard } from "@/components/common/bookings/booking-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales: { "en-US": enUS },
})

type CalendarEvent = {
  id: number
  title: string
  client: string
  service: string
  status: Booking["status"]
  start: Date
  end: Date
  original: Booking
}

const statusClass: Record<Booking["status"], string> = {
  confirmed: "bg-primary text-white",
  pending: "bg-amber-100 text-amber-700",
  completed: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-rose-100 text-rose-700",
}

export function ArtistCalendar() {
  const [date, setDate] = useState(new Date())
  const [view, setView] = useState<View>("month")

  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)

  const fetchEvents = useCallback(async (currentDate: Date) => {
    try {
      setLoading(true)
      // Fetch a generous window around the current date (e.g. previous month to next month)
      const start = format(subDays(startOfMonth(currentDate), 14), "yyyy-MM-dd")
      const end = format(addDays(endOfMonth(currentDate), 14), "yyyy-MM-dd")

      const res = await fetch(`/api/bookings?start_date=${start}&end_date=${end}`)
      if (!res.ok) throw new Error("Failed to fetch bookings")
      const data = await res.json()

      const mapped: CalendarEvent[] = data.bookings.map((b: Booking) => {
        // Parse date and time to create start and end Date objects
        const startDateStr = `${b.booking_date}T${b.start_time}`
        const endDateStr = `${b.booking_date}T${b.end_time}`

        return {
          id: b.id,
          title: `${b.customer?.customer_name} - ${b.services?.[0]?.service_name ?? "Booking"}`,
          client: b.customer?.customer_name ?? "Unknown",
          service: b.services?.map(s => s.service_name).join(", ") || "No service specified",
          status: b.status,
          start: new Date(startDateStr),
          end: new Date(endDateStr),
          original: b
        }
      })

      setEvents(mapped)
    } catch (error) {
      console.error("Error fetching calendar events:", error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchEvents(date)
    // We intentionally don't re-fetch on every single date change if it's within the same month,
    // but for simplicity, we trigger fetch when date significantly changes, 
    // or just fetch every time (it's fast since we fetch a wide range). 
    // In a real app, we'd check if the new date is outside the currently fetched range.
  }, [fetchEvents, date.getMonth(), date.getFullYear()])

  const visibleEvents = useMemo(
    () =>
      events.filter(
        (event) =>
          event.start.getFullYear() === date.getFullYear() &&
          event.start.getMonth() === date.getMonth() &&
          event.start.getDate() === date.getDate()
      ),
    [date, events]
  )

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
      <Card className="rounded-[1.75rem] border-slate-100 bg-white/90 shadow-md shadow-purple-950/5">
        <CardContent className="p-3 sm:p-5 relative overflow-hidden">
          {loading && (
            <div className="absolute inset-0 z-10 flex flex-col p-3 sm:p-5 bg-white/70 backdrop-blur-[2px] rounded-[1.75rem] gap-4">
              {/* Toolbar Skeleton */}
              <div className="flex justify-between items-center px-1">
                 <Skeleton className="h-10 w-28 sm:w-32 rounded-xl" />
                 <Skeleton className="h-8 w-32 sm:w-48 rounded-lg" />
                 <Skeleton className="h-10 w-40 rounded-xl hidden md:block" />
              </div>
              
              {/* Grid Skeleton */}
              <div className="flex-1 border border-slate-100 rounded-2xl overflow-hidden flex flex-col bg-white/50">
                {/* Days header */}
                <div className="grid grid-cols-7 border-b border-slate-100 h-10 bg-slate-50/50">
                   {Array.from({ length: 7 }).map((_, i) => (
                     <div key={i} className="flex justify-center items-center">
                        <Skeleton className="h-3 w-8" />
                     </div>
                   ))}
                </div>
                {/* 5-Week Grid */}
                <div className="flex-1 grid grid-rows-5">
                   {Array.from({ length: 5 }).map((_, w) => (
                     <div key={w} className="grid grid-cols-7 border-b border-slate-100 last:border-b-0">
                        {Array.from({ length: 7 }).map((_, d) => (
                          <div key={d} className="border-r border-slate-100 last:border-r-0 p-1 sm:p-2 flex flex-col gap-1 sm:gap-2">
                             <Skeleton className="h-3 w-4 self-end opacity-50" />
                             {/* Random mock events */}
                             {(w + d) % 4 === 0 && (
                               <Skeleton className="h-4 w-full rounded opacity-40" />
                             )}
                             {(w + d) % 7 === 0 && (
                               <Skeleton className="h-4 w-3/4 rounded opacity-40" />
                             )}
                          </div>
                        ))}
                     </div>
                   ))}
                </div>
              </div>
            </div>
          )}
          <div className="artistos-calendar w-full overflow-x-auto">
            <div className="min-w-full md:min-w-[800px] h-[450px] md:h-full border rounded-2xl">
              <BigCalendar<CalendarEvent>
                localizer={localizer}
                events={events}
                startAccessor="start"
              endAccessor="end"
              date={date}
              view={view}
              onNavigate={(nextDate: Date, nextView: View) => {
                setDate(nextDate)
                setView(nextView)
              }}
              onView={setView}
              selectable
              onSelectEvent={(event) => setDate(event.start)}
              onSelectSlot={(slot: SlotInfo) => setDate(slot.start)}
              onDrillDown={(nextDate, nextView) => {
                setDate(nextDate)
                setView(nextView)
              }}
              dayPropGetter={(day) => ({
                className:
                  day.toDateString() === date.toDateString() ? "artistos-selected-day" : "",
              })}
              views={["month", "week", "day", "agenda"]}
              step={30}
              timeslots={2}
              popup
              components={{ toolbar: CalendarToolbar, event: CalendarEventComponent }}
              eventPropGetter={eventStyle}
            />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="flex flex-col p-4 rounded-[1.75rem] border-slate-100 bg-white/90 shadow-md shadow-purple-950/5 h-[450px] md:h-[720px]">
        <CardHeader className="shrink-0 border-b pb-3 mb-3 gap-1">
          <CardTitle className="text-lg font-semibold">Selected day schedule</CardTitle>
          <p className="text-sm text-muted-foreground">{format(date, "MMMM d, yyyy")}</p>
        </CardHeader>
        <CardContent className="flex-1 space-y-3 overflow-y-auto custom-scrollbar pb-4 pr-1">
          {visibleEvents.length ? visibleEvents.map((event) => {
            const booking = event.original

            return (
              <BookingCard
                key={event.id}
                booking={booking}
                onEdit={() => {}}
                onDelete={() => {}}
              />
            )
          }) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white/70 p-5 text-sm text-muted-foreground text-center">
              No bookings scheduled for {format(date, "MMM d")}.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function CalendarToolbar({ label, view, onNavigate, onView }: ToolbarProps<CalendarEvent>) {
  const views: View[] = ["month", "week", "day", "agenda"]

  return (
    <div className="p-3 md:p-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div className="flex items-center justify-between w-full md:w-auto gap-2">
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <Button size="icon" variant="outline" className="size-9 sm:size-10 rounded-xl sm:rounded-2xl" onClick={() => onNavigate(Navigate.PREVIOUS)}>
            <ChevronLeft className="size-4" />
          </Button>
          <Button variant="outline" className="h-9 sm:h-10 rounded-xl sm:rounded-2xl px-3 sm:px-4 text-xs sm:text-sm font-semibold text-primary" onClick={() => onNavigate(Navigate.TODAY)}>
            Today
          </Button>
          <Button size="icon" variant="outline" className="size-9 sm:size-10 rounded-xl sm:rounded-2xl" onClick={() => onNavigate(Navigate.NEXT)}>
            <ChevronRight className="size-4" />
          </Button>
        </div>
        <h2 className="text-sm sm:text-base font-bold md:hidden text-right leading-tight">{label}</h2>
      </div>
      
      <h2 className="hidden md:block text-xl font-bold text-center absolute left-1/2 -translate-x-1/2">{label}</h2>

      <div className="hidden md:flex rounded-2xl bg-secondary p-1 shrink-0 z-10">
        {views.map((item) => (
          <Button
            key={item}
            size="sm"
            variant={view === item ? "default" : "ghost"}
            className="rounded-xl capitalize"
            onClick={() => onView(item)}
          >
            {item.replace("_", " ")}
          </Button>
        ))}
      </div>
    </div>
  )
}

function CalendarEventComponent({ event }: EventProps<CalendarEvent>) {
  return (
    <div className="flex w-full items-center justify-between gap-1 h-full overflow-hidden text-inherit">
      <span className="truncate text-[11px] font-bold leading-none text-inherit">
        {event.client}
      </span>
      <span className="shrink-0 text-[10px] font-medium opacity-90 leading-none text-inherit">
        {format(event.start, "h:mm a")}
      </span>
    </div>
  )
}

const eventStyle: EventPropGetter<CalendarEvent> = (event) => {
  const colors: Record<string, { bg: string; border: string; text: string }> = {
    confirmed: { bg: "#f5f3ff", border: "#7c3aed", text: "#6d28d9" },
    completed: { bg: "#f0fdf4", border: "#10b981", text: "#047857" },
    cancelled: { bg: "#fff1f2", border: "#f43f5e", text: "#be123c" },
    pending: { bg: "#fff7ed", border: "#f97316", text: "#c2410c" },
  }
  
  const c = colors[event.status] || colors.confirmed

  return {
    className: "artistos-calendar-event transition-all hover:brightness-95",
    style: {
      backgroundColor: c.bg,
      color: c.text,
      border: `1.5px solid ${c.border}`,
      borderRadius: "6px",
      fontWeight: 700,
      padding: "4px 6px",
      boxShadow: "none",
    },
  }
}
