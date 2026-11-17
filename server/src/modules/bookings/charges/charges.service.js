import { createDbClient } from "#src/integrations/supabase.js"
import { bookingBelongsToUser, parseChildId } from "#src/modules/bookings/guards.js"
import { assertWritable } from "#src/shared/subscription/read-only.js"
import { badRequest, notFound } from "#src/utils/api-error.js"

const FIELDS = "id, charge_name, quantity, rate"
const READ_ONLY_MESSAGE = "Your subscription has expired. Please upgrade to update booking charges."

function validateCharge(body) {
  const name = typeof body.charge_name === "string" ? body.charge_name.trim() : ""
  if (!name) throw badRequest("Charge name is required.")
  if (!Number.isInteger(Number(body.quantity)) || Number(body.quantity) < 1) {
    throw badRequest("Quantity must be a whole number of at least 1.")
  }
  if (!Number.isFinite(Number(body.rate)) || Number(body.rate) < 0) throw badRequest("Rate cannot be negative.")
  return { charge_name: name, quantity: Number(body.quantity), rate: Number(body.rate) }
}

export async function addCharge(userId, bookingId, body) {
  const charge = validateCharge(body)
  const supabase = createDbClient()

  const [owns] = await Promise.all([
    bookingBelongsToUser(supabase, bookingId, userId),
    assertWritable(supabase, userId, READ_ONLY_MESSAGE),
  ])
  if (!owns) throw notFound("Booking not found.")

  const { data, error } = await supabase
    .from("booking_additional_charges")
    .insert({ user_id: userId, booking_id: bookingId, ...charge })
    .select(FIELDS)
    .single()
  if (error) throw badRequest(error.message)
  return { charge: data }
}

export async function updateCharge(userId, bookingId, body) {
  const chargeId = parseChildId(body.chargeId, "charge")
  const charge = validateCharge(body)
  const supabase = createDbClient()
  await assertWritable(supabase, userId, READ_ONLY_MESSAGE)

  const { data, error } = await supabase
    .from("booking_additional_charges")
    .update(charge)
    .eq("id", chargeId)
    .eq("booking_id", bookingId)
    .eq("user_id", userId)
    .select(FIELDS)
    .single()
  if (error) throw badRequest(error.message)
  if (!data) throw notFound("Charge not found.")
  return { charge: data }
}

export async function deleteCharge(userId, bookingId, rawChargeId) {
  const chargeId = parseChildId(rawChargeId, "charge")
  const supabase = createDbClient()
  await assertWritable(supabase, userId, READ_ONLY_MESSAGE)

  const { error } = await supabase
    .from("booking_additional_charges")
    .delete()
    .eq("id", chargeId)
    .eq("booking_id", bookingId)
    .eq("user_id", userId)
  if (error) throw badRequest(error.message)
  return { success: true }
}
