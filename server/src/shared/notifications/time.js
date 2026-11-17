import { config } from "#src/config/env.js"

/*
 * Bookings store booking_date (date) and start_time (time) as naive wall-clock
 * values in the artist's timezone, with no offset. Cron runs in UTC, so instead
 * of converting every booking to an instant we convert "now" to the artist's
 * wall clock once and compare zero-padded "YYYY-MM-DD HH:MM" strings, which
 * sort lexicographically.
 */

export const APP_TIMEZONE = config.appTimezone

/** `{ date: "YYYY-MM-DD", time: "HH:MM" }` for `instant` in `timeZone`. */
export function toWallClock(instant, timeZone = APP_TIMEZONE) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(instant)

  const get = (type) => parts.find((part) => part.type === type)?.value ?? "00"
  // Intl can emit "24" for midnight in some hour-cycle edge cases.
  const hour = get("hour") === "24" ? "00" : get("hour")

  return { date: `${get("year")}-${get("month")}-${get("day")}`, time: `${hour}:${get("minute")}` }
}

/** Sortable "YYYY-MM-DD HH:MM" key. */
export function wallClockKey(date, time) {
  return `${date} ${time.slice(0, 5)}`
}

/** "15:00[:00]" → "3:00 PM". */
export function formatTimeLabel(time) {
  const [rawHour, rawMinute] = time.split(":")
  const hour = Number(rawHour)
  const suffix = hour >= 12 ? "PM" : "AM"
  const displayHour = hour % 12 === 0 ? 12 : hour % 12
  return `${displayHour}:${rawMinute ?? "00"} ${suffix}`
}

/** Wall-clock minutes from the local "now" to a booking's start (negative once started). */
export function getMinutesUntilBooking(bookingDate, startTime, nowLocalDate, nowLocalTime) {
  const timePart = (startTime || "09:00").slice(0, 5)
  const bookingMs = Date.parse(`${bookingDate}T${timePart}:00Z`)
  const nowMs = Date.parse(`${nowLocalDate}T${nowLocalTime.slice(0, 5)}:00Z`)
  return Math.round((bookingMs - nowMs) / 60_000)
}

/** "2026-09-30" → "30 Sept 2026" (en-IN). */
export function formatDisplayDate(dateStr) {
  try {
    const [year, month, day] = dateStr.split("-").map(Number)
    return new Date(year, month - 1, day).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
  } catch {
    return dateStr
  }
}

/** "17:30[:00]" → "05:30 pm" (en-IN, 12-hour). */
export function formatDisplayTime(timeStr) {
  try {
    const [hours, minutes] = timeStr.split(":")
    const date = new Date()
    date.setHours(Number(hours), Number(minutes || 0), 0, 0)
    return date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })
  } catch {
    return timeStr
  }
}
