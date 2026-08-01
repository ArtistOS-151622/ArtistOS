import type { SupabaseClient } from "@supabase/supabase-js"

import { enqueueEvent } from "@/lib/notifications/events"
import { APP_TIMEZONE, formatTimeLabel, toWallClock, wallClockKey } from "@/lib/notifications/time"
import { BOOKING_REMINDER_MINUTES_BEFORE } from "@/lib/push/config"

export const BOOKING_REMINDER_EVENT_TYPE = "booking_reminder"

const REMINDER_SELECT = `
  id,
  user_id,
  booking_date,
  start_time,
  status,
  customer:customers(customer_name),
  booking_services:booking_services(service:services(service_name))
`

type ReminderBookingRow = {
  id: number
  user_id: number
  booking_date: string
  start_time: string
  status: string
  customer: { customer_name: string } | { customer_name: string }[] | null
  booking_services: { service: { service_name: string } | { service_name: string }[] | null }[]
}

function first<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? (value[0] ?? null) : value
}

function buildReminderCopy(booking: ReminderBookingRow) {
  const customerName = first(booking.customer)?.customer_name ?? "your client"
  const timeLabel = formatTimeLabel(booking.start_time)

  const serviceNames = booking.booking_services
    .map((entry) => first(entry.service)?.service_name)
    .filter((name): name is string => Boolean(name))

  const body = serviceNames.length
    ? `${customerName} at ${timeLabel} — ${serviceNames.join(", ")}`
    : `${customerName} at ${timeLabel}`

  return { title: "Upcoming booking", body }
}

/**
 * Enqueue reminders for bookings whose reminder moment has arrived.
 *
 * Eligibility is "starts after now, and no more than BOOKING_REMINDER_MINUTES_BEFORE
 * from now" -- i.e. the reminder time has passed but the booking has not started.
 * Expressed this way the window stays open for the full reminder period (60 min by
 * default), which is far wider than the scan interval, so a missed cron run makes a
 * reminder late rather than silently losing it.
 *
 * Nothing is enqueued ahead of time: a row in notification_events means "send now".
 * That also means reschedules and cancellations need no sweep -- a booking that moves
 * simply becomes eligible later, and one that is cancelled is never scanned.
 */
export async function scanBookingReminders(
  supabase: SupabaseClient
): Promise<{ enqueued: number; skipped: number }> {
  const now = new Date()
  const windowEnd = new Date(now.getTime() + BOOKING_REMINDER_MINUTES_BEFORE * 60_000)

  const nowLocal = toWallClock(now, APP_TIMEZONE)
  const endLocal = toWallClock(windowEnd, APP_TIMEZONE)

  const nowKey = wallClockKey(nowLocal.date, nowLocal.time)
  const endKey = wallClockKey(endLocal.date, endLocal.time)

  // The window can straddle midnight, so accept both local dates and narrow in JS.
  const { data, error } = await supabase
    .from("bookings")
    .select(REMINDER_SELECT)
    .in("status", ["pending", "confirmed"])
    .gte("booking_date", nowLocal.date)
    .lte("booking_date", endLocal.date)

  if (error) throw new Error(error.message)

  const bookings = (data as unknown as ReminderBookingRow[]) ?? []

  let enqueued = 0
  let skipped = 0

  for (const booking of bookings) {
    const startKey = wallClockKey(booking.booking_date, booking.start_time)
    if (startKey <= nowKey || startKey > endKey) continue

    const { title, body } = buildReminderCopy(booking)

    const event = await enqueueEvent(supabase, {
      userId: booking.user_id,
      eventType: BOOKING_REMINDER_EVENT_TYPE,
      entityType: "booking",
      entityId: booking.id,
      title,
      body,
      url: `/bookings/${booking.id}`,
    })

    if (event) enqueued += 1
    else skipped += 1
  }

  return { enqueued, skipped }
}
