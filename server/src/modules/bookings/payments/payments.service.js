import { createDbClient } from "#src/integrations/supabase.js"
import { VALID_PAYMENT_METHODS } from "#src/modules/bookings/booking-input.js"
import { bookingBelongsToUser, parseChildId } from "#src/modules/bookings/guards.js"
import { assertWritable } from "#src/shared/subscription/read-only.js"
import { ApiError, badRequest, notFound } from "#src/utils/api-error.js"

const FIELDS = "id, payment_type, payment_method, amount, payment_date, remark, created_at"
const VALID_PAYMENT_TYPES = ["Advance", "Installment", "Final Payment"]
const READ_ONLY_MESSAGE = "Your subscription has expired. Please upgrade to update booking payments."

function validatePayment(body) {
  if (!VALID_PAYMENT_TYPES.includes(body.payment_type)) throw badRequest("Invalid payment type.")
  if (!VALID_PAYMENT_METHODS.includes(body.payment_method)) throw badRequest("Invalid payment method.")
  const amount = Number(body.amount)
  if (!Number.isFinite(amount) || amount <= 0) throw badRequest("Amount must be a positive number.")
  if (!body.payment_date) throw badRequest("Payment date is required.")

  return {
    payment_type: body.payment_type,
    payment_method: body.payment_method,
    amount,
    payment_date: body.payment_date,
    remark: (typeof body.remark === "string" && body.remark.trim()) || null,
  }
}

export async function listPayments(userId, bookingId) {
  const supabase = createDbClient()
  const [owns, { data, error }] = await Promise.all([
    bookingBelongsToUser(supabase, bookingId, userId),
    supabase
      .from("booking_payments")
      .select(FIELDS)
      .eq("booking_id", bookingId)
      .eq("user_id", userId)
      .order("payment_date", { ascending: false }),
  ])
  if (!owns) throw notFound("Booking not found.")
  if (error) throw badRequest(error.message)
  return { payments: data ?? [] }
}

export async function addPayment(userId, bookingId, body) {
  const payment = validatePayment(body)
  const supabase = createDbClient()

  const [owns] = await Promise.all([
    bookingBelongsToUser(supabase, bookingId, userId),
    assertWritable(supabase, userId, READ_ONLY_MESSAGE),
  ])
  if (!owns) throw notFound("Booking not found.")

  const { data, error } = await supabase
    .from("booking_payments")
    .insert({ user_id: userId, booking_id: bookingId, ...payment })
    .select(FIELDS)
    .single()
  if (error) throw badRequest(error.message)
  return { payment: data }
}

export async function updatePayment(userId, bookingId, body) {
  const paymentId = parseChildId(body.paymentId, "payment")
  const payment = validatePayment(body)
  const supabase = createDbClient()
  await assertWritable(supabase, userId, READ_ONLY_MESSAGE)

  const { data, error } = await supabase
    .from("booking_payments")
    .update(payment)
    .eq("id", paymentId)
    .eq("booking_id", bookingId)
    .eq("user_id", userId)
    .select(FIELDS)
    .single()
  if (error) throw badRequest(error.message)
  if (!data) throw notFound("Payment not found.")
  return { payment: data }
}

export async function deletePayment(userId, bookingId, rawPaymentId) {
  // Number(null) is 0, so a missing paymentId deletes nothing and still succeeds (as before).
  const paymentId = parseChildId(rawPaymentId, "payment")
  const supabase = createDbClient()
  await assertWritable(supabase, userId, READ_ONLY_MESSAGE)

  const { error } = await supabase
    .from("booking_payments")
    .delete()
    .eq("id", paymentId)
    .eq("booking_id", bookingId)
    .eq("user_id", userId)
  if (error) throw new ApiError(400, error.message)
  return { success: true }
}
