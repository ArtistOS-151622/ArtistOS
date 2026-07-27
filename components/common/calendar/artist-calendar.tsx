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
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
  canceled: "bg-rose-100 text-rose-700",
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
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/50 backdrop-blur-sm rounded-[1.75rem]">
              <Loader2 className="size-8 animate-spin text-primary" />
            </div>
          )}
          <div className="artistos-calendar w-full overflow-x-hidden">
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
        </CardContent>
      </Card>

      <Card className="rounded-[1.75rem] border-slate-100 bg-white/90 shadow-md shadow-purple-950/5">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Selected day schedule</CardTitle>
          <p className="text-sm text-muted-foreground">{format(date, "MMMM d, yyyy")}</p>
        </CardHeader>
        <CardContent className="space-y-3">
          {visibleEvents.length ? visibleEvents.map((event) => {
            const booking = event.original
            const services = booking.services ?? []
            const totalPrice = services.reduce((sum, s) => sum + Number(s.price), 0)

            return (
              <div key={event.id} className="rounded-2xl border border-slate-100 bg-[#faf8ff] p-4 space-y-4">
                {/* Header: Customer and Status */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-xl bg-purple-100 text-[#7c3aed]">
                      <User className="size-4" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-800 text-sm leading-tight">
                        {event.client}
                      </h3>
                      <div className="flex items-center gap-1 text-slate-400 text-xs mt-0.5">
                        <Phone className="size-3" />
                        <span>{booking.customer?.phone ?? "No phone"}</span>
                      </div>
                    </div>
                  </div>
                  <Badge className={cn("rounded-xl capitalize shadow-sm", statusClass[event.status])}>
                    {event.status}
                  </Badge>
                </div>

                {/* Time Details */}
                <div className="flex items-center gap-2 rounded-xl bg-white/60 p-2.5 text-xs text-slate-600 border border-slate-100">
                  <Clock className="size-4 text-[#7c3aed]" />
                  <span className="font-semibold">
                    {format(event.start, "h:mm a")} - {format(event.end, "h:mm a")}
                  </span>
                </div>

                {/* Services List */}
                {services.length > 0 ? (
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Services</p>
                    <div className="flex flex-wrap gap-1.5">
                      {services.map((service) => (
                        <span
                          key={service.id}
                          className="inline-flex items-center rounded-xl bg-purple-50/50 border border-purple-100 px-2 py-0.5 text-[11px] font-medium text-[#7c3aed]"
                        >
                          {service.service_name}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}

                {/* Booking Address */}
                {booking.booking_address && (
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Location</p>
                    <div className="flex items-start gap-1.5 text-xs text-slate-600">
                      <MapPin className="size-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <p className="leading-relaxed line-clamp-2">{booking.booking_address}</p>
                    </div>
                  </div>
                )}

                {/* Additional Requests if present */}
                {booking.additional_request ? (
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Note</p>
                    <div className="flex items-start gap-1.5 text-xs text-slate-500 italic">
                      <FileText className="size-3.5 text-slate-300 shrink-0 mt-0.5" />
                      <p className="leading-relaxed line-clamp-2">{booking.additional_request}</p>
                    </div>
                  </div>
                ) : null}

                {/* Divider & Total Price */}
                <div className="h-px bg-slate-200/60 w-full" />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground font-medium">Booking #{event.id}</span>
                  {totalPrice > 0 && (
                    <span className="font-bold text-slate-800">
                      ₹{totalPrice.toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
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
    <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-2">
        <Button size="icon" variant="outline" className="size-10 rounded-2xl" onClick={() => onNavigate(Navigate.PREVIOUS)}>
          <ChevronLeft className="size-4" />
        </Button>
        <Button variant="outline" className="h-10 rounded-2xl px-4" onClick={() => onNavigate(Navigate.TODAY)}>
          Today
        </Button>
        <Button size="icon" variant="outline" className="size-10 rounded-2xl" onClick={() => onNavigate(Navigate.NEXT)}>
          <ChevronRight className="size-4" />
        </Button>
        <h2 className="ml-2 text-xl font-semibold">{label}</h2>
      </div>

      <div className="flex rounded-2xl bg-secondary p-1">
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
    <div className="flex h-full flex-col justify-start leading-tight text-inherit pt-0.5">
      <p className="truncate text-[11px] font-bold text-inherit leading-tight">{event.client}</p>
      {/* <p className="truncate text-[10px] font-medium text-inherit opacity-90 leading-tight">
        {event.service}
      </p> */}
    </div>
  )
}

const eventStyle: EventPropGetter<CalendarEvent> = (event) => ({
  className: "artistos-calendar-event",
  style: {
    backgroundColor:
      event.status === "confirmed" ? "#7c3aed" : event.status === "completed" ? "#10b981" : event.status === "canceled" ? "#f43f5e" : "#f59e0b",
    border: 0,
    borderRadius: "12px",
    color: event.status === "pending" ? "#451a03" : "#ffffff",
    fontWeight: 700,
    padding: "4px 8px",
    boxShadow: "0 10px 22px rgba(76, 29, 149, 0.16)",
  },
})
