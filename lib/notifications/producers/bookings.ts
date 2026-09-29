import type { SupabaseClient } from "@supabase/supabase-js"

import { enqueueEvent } from "../events.ts"
import { APP_TIMEZONE, formatTimeLabel, toWallClock } from "../time.ts"
import {
  BOOKING_REMINDER_2H_MINUTES,
  BOOKING_REMINDER_10M_MINUTES,
} from "../../push/config.ts"

export const BOOKING_REMINDER_2H_EVENT_TYPE = "booking_reminder_2h"
export const BOOKING_REMINDER_10M_EVENT_TYPE = "booking_reminder_10m"
export const BOOKING_REMINDER_EVENT_TYPE = BOOKING_REMINDER_2H_EVENT_TYPE

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

function buildReminderCopy(booking: ReminderBookingRow, type: "2h" | "10m") {
  const customerName = first(booking.customer)?.customer_name ?? "your client"
  const timeLabel = formatTimeLabel(booking.start_time)

  const serviceNames = booking.booking_services
    .map((entry) => first(entry.service)?.service_name)
    .filter((name): name is string => Boolean(name))

  const title =
    type === "2h"
      ? "Upcoming booking in 2 hours"
      : "Upcoming booking in 10 minutes"

  const body = serviceNames.length
    ? `${customerName} at ${timeLabel} — ${serviceNames.join(", ")}`
    : `${customerName} at ${timeLabel}`

  return { title, body }
}

/**
 * Calculates wall-clock difference in minutes between booking start time
 * and current local time in the specified timezone.
 */
export function getMinutesUntilBooking(
  bookingDate: string,
  startTime: string,
  nowLocalDate: string,
  nowLocalTime: string
): number {
  const bMs = Date.parse(`${bookingDate}T${startTime.slice(0, 5)}:00Z`)
  const nMs = Date.parse(`${nowLocalDate}T${nowLocalTime}:00Z`)
  return Math.round((bMs - nMs) / 60_000)
}

/**
 * Enqueue reminders for bookings due within 2 hours and within 10 minutes.
 *
 * Each booking receives two distinct reminder events:
 * 1. 2 hours before start (event_type: "booking_reminder_2h")
 * 2. 10 minutes before start (event_type: "booking_reminder_10m")
 *
 * The notification_events dedupe index (user_id, event_type, entity_type, entity_id)
 * ensures each reminder fires at most once per booking, and late cron runs stay safe.
 */
export async function scanBookingReminders(
  supabase: SupabaseClient
): Promise<{ enqueued: number; skipped: number; enqueued2h: number; enqueued10m: number }> {
  const now = new Date()
  const maxMinutes = Math.max(BOOKING_REMINDER_2H_MINUTES, BOOKING_REMINDER_10M_MINUTES, 120)
  const windowEnd = new Date(now.getTime() + maxMinutes * 60_000)

  const nowLocal = toWallClock(now, APP_TIMEZONE)
  const endLocal = toWallClock(windowEnd, APP_TIMEZONE)

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
  let enqueued2h = 0
  let enqueued10m = 0

  for (const booking of bookings) {
    const diffMinutes = getMinutesUntilBooking(
      booking.booking_date,
      booking.start_time,
      nowLocal.date,
      nowLocal.time
    )

    // Booking has already started or passed
    if (diffMinutes <= 0) continue

    // Booking is too far in the future
    if (diffMinutes > BOOKING_REMINDER_2H_MINUTES) continue

    // Within 10m -> 10m reminder. Between 10m and 2h -> 2h reminder.
    const is10m = diffMinutes <= BOOKING_REMINDER_10M_MINUTES
    const eventType = is10m ? BOOKING_REMINDER_10M_EVENT_TYPE : BOOKING_REMINDER_2H_EVENT_TYPE
    const reminderType = is10m ? "10m" : "2h"

    const { title, body } = buildReminderCopy(booking, reminderType)

    const event = await enqueueEvent(supabase, {
      userId: booking.user_id,
      eventType,
      entityType: "booking",
      entityId: booking.id,
      title,
      body,
      url: `/bookings/${booking.id}`,
    })

    if (event) {
      enqueued += 1
      if (reminderType === "2h") enqueued2h += 1
      else enqueued10m += 1
    } else {
      skipped += 1
    }
  }

  return { enqueued, skipped, enqueued2h, enqueued10m }
}
