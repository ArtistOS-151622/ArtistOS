import { badRequest, notFound } from "#src/utils/api-error.js"

/**
 * Booking id from the route param. Same rule as the Next.js routes: anything
 * Number() can parse passes (ownership checks reject ids that don't exist).
 */
export function parseBookingId(req, message = "Invalid booking ID.") {
  const id = Number(req.params.id)
  if (Number.isNaN(id)) throw badRequest(message)
  return id
}

/** Child-row id (payment/charge/expense/category) from body or query; NaN → 400. */
export function parseChildId(value, label) {
  const id = Number(value)
  if (Number.isNaN(id)) throw badRequest(`Invalid ${label} ID.`)
  return id
}

/** True when the booking exists and belongs to the artist (run alongside other reads). */
export async function bookingBelongsToUser(supabase, bookingId, userId) {
  const { data } = await supabase.from("bookings").select("id").eq("id", bookingId).eq("user_id", userId).maybeSingle()
  return Boolean(data)
}

export async function assertBookingOwned(supabase, bookingId, userId) {
  if (!(await bookingBelongsToUser(supabase, bookingId, userId))) throw notFound("Booking not found.")
}
