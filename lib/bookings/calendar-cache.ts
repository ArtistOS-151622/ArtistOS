import { mutate } from "swr"

/**
 * The calendar caches each month window under a key starting with this prefix
 * (the bookings list page uses /api/bookings?search=..., so it never matches).
 * Kept apart from the calendar component so callers don't pull in
 * react-big-calendar just to invalidate it.
 */
export const CALENDAR_BOOKINGS_PREFIX = "/api/bookings?start_date="

export function calendarBookingsKey(startDate: string, endDate: string) {
  return `${CALENDAR_BOOKINGS_PREFIX}${startDate}&end_date=${endDate}`
}

/**
 * Mark every cached calendar month stale after a booking is created, edited,
 * deleted or converted. No request is sent unless a calendar is on screen;
 * otherwise the next calendar visit refetches instead of using the cache.
 */
export function invalidateCalendarBookings() {
  void mutate((key) => typeof key === "string" && key.startsWith(CALENDAR_BOOKINGS_PREFIX))
}
