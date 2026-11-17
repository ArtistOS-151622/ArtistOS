import { config } from "#src/config/env.js"
import { enqueueEvent } from "#src/shared/notifications/events.js"
import {
  APP_TIMEZONE,
  formatTimeLabel,
  getMinutesUntilBooking,
  toWallClock,
} from "#src/shared/notifications/time.js"

export const BOOKING_REMINDER_2H_EVENT_TYPE = "booking_reminder_2h"
export const BOOKING_REMINDER_10M_EVENT_TYPE = "booking_reminder_10m"
export const BOOKING_REMINDER_EVENT_TYPE = BOOKING_REMINDER_2H_EVENT_TYPE

const MIN_SCAN_WINDOW_MINUTES = 120

const REMINDER_SELECT = `
  id,
  user_id,
  booking_date,
  start_time,
  status,
  customer:customers(customer_name),
  booking_services:booking_services(service:services(service_name))
`

const first = (value) => (!value ? null : Array.isArray(value) ? (value[0] ?? null) : value)

function buildReminderCopy(booking, type) {
  const customerName = first(booking.customer)?.customer_name ?? "your client"
  const timeLabel = formatTimeLabel(booking.start_time)
  const serviceNames = booking.booking_services
    .map((entry) => first(entry.service)?.service_name)
    .filter(Boolean)

  const title = type === "2h" ? "Upcoming booking in 2 hours" : "Upcoming booking in 10 minutes"
  const body = serviceNames.length
    ? `${customerName} at ${timeLabel} — ${serviceNames.join(", ")}`
    : `${customerName} at ${timeLabel}`

  return { title, body }
}

/**
 * Enqueues push reminders: "booking_reminder_2h" for bookings starting within 2 hours
 * (down to 10 minutes) and "booking_reminder_10m" within 10 minutes. The
 * notification_events dedupe index makes each fire at most once per booking.
 */
export async function scanBookingReminders(supabase) {
  const { bookingReminder2hMinutes, bookingReminder10mMinutes } = config.notifications
  const now = new Date()
  const maxMinutes = Math.max(bookingReminder2hMinutes, bookingReminder10mMinutes, MIN_SCAN_WINDOW_MINUTES)
  const windowEnd = new Date(now.getTime() + maxMinutes * 60_000)

  const nowLocal = toWallClock(now, APP_TIMEZONE)
  const endLocal = toWallClock(windowEnd, APP_TIMEZONE)

  // The window can straddle midnight: fetch both local dates, narrow below.
  const { data, error } = await supabase
    .from("bookings")
    .select(REMINDER_SELECT)
    .in("status", ["pending", "confirmed"])
    .gte("booking_date", nowLocal.date)
    .lte("booking_date", endLocal.date)

  if (error) throw new Error(error.message)

  const counts = { enqueued: 0, skipped: 0, enqueued2h: 0, enqueued10m: 0 }

  for (const booking of data ?? []) {
    const diffMinutes = getMinutesUntilBooking(booking.booking_date, booking.start_time, nowLocal.date, nowLocal.time)
    if (diffMinutes <= 0 || diffMinutes > bookingReminder2hMinutes) continue

    const reminderType = diffMinutes <= bookingReminder10mMinutes ? "10m" : "2h"
    const { title, body } = buildReminderCopy(booking, reminderType)

    const event = await enqueueEvent(supabase, {
      userId: booking.user_id,
      eventType: reminderType === "10m" ? BOOKING_REMINDER_10M_EVENT_TYPE : BOOKING_REMINDER_2H_EVENT_TYPE,
      entityType: "booking",
      entityId: booking.id,
      title,
      body,
      url: `/bookings/${booking.id}`,
    })

    if (!event) {
      counts.skipped += 1
      continue
    }
    counts.enqueued += 1
    if (reminderType === "2h") counts.enqueued2h += 1
    else counts.enqueued10m += 1
  }

  return counts
}

export { getMinutesUntilBooking } from "#src/shared/notifications/time.js"
