/**
 * Bookings store booking_date (date) and start_time (time) as naive wall-clock
 * values in the artist's local timezone -- no offset is persisted. Cron runs in
 * UTC, so comparing those columns against a UTC instant would be off by the
 * zone's offset (5h30m for IST).
 *
 * Rather than converting every booking to an instant, we convert "now" into the
 * artist's wall clock once and compare zero-padded "YYYY-MM-DD HH:MM" strings,
 * which sort lexicographically.
 */

export const APP_TIMEZONE = process.env.APP_TIMEZONE?.trim() || "Asia/Kolkata"

export type WallClock = { date: string; time: string }

export function toWallClock(instant: Date, timeZone: string = APP_TIMEZONE): WallClock {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(instant)

  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "00"
  // Intl can emit "24" for midnight in hourCycle h23/h24 edge cases.
  const hour = get("hour") === "24" ? "00" : get("hour")

  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    time: `${hour}:${get("minute")}`,
  }
}

/** Sortable "YYYY-MM-DD HH:MM" key for comparing a wall clock against booking columns. */
export function wallClockKey(date: string, time: string): string {
  return `${date} ${time.slice(0, 5)}`
}

/** Format a "HH:MM[:SS]" time column for display, e.g. "3:00 PM". */
export function formatTimeLabel(time: string): string {
  const [rawHour, rawMinute] = time.split(":")
  const hour = Number(rawHour)
  const suffix = hour >= 12 ? "PM" : "AM"
  const displayHour = hour % 12 === 0 ? 12 : hour % 12

  return `${displayHour}:${rawMinute ?? "00"} ${suffix}`
}
