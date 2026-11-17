/*
 * Input validation and response shaping shared by booking create (POST /api/bookings)
 * and edit (PATCH /api/bookings/:id).
 */

export const VALID_BOOKING_STATUSES = ["pending", "confirmed", "completed", "cancelled"]
export const VALID_PAYMENT_METHODS = ["UPI", "Cash", "Check", "Bank Transfer"]
export const BOOKING_FORM_ADVANCE_REMARK = "Advance payment added during booking"

/** Columns of the bookings row itself (no joins). */
export const BOOKING_ROW_FIELDS =
  "id, user_id, customer_id, booking_address, booking_date, start_time, end_time, status, additional_request, created_at, discount"
export const PAYMENT_FIELDS = "id, payment_type, payment_method, amount, payment_date, remark"
export const CHARGE_FIELDS = "id, charge_name, quantity, rate"

const trimmed = (value) => (typeof value === "string" ? value.trim() : undefined)

/**
 * Validates a create/edit body without touching the database.
 * → { error } or { data: { bookingFields, services, serviceIds, additionalCharges,
 *     advancePayment, advancePaymentMethod, advancePaymentDate } }
 */
export function validateBookingInput(body) {
  const customerId = Number(body.customer_id)
  if (!body.customer_id || !Number.isInteger(customerId)) return { error: "Customer is required." }
  if (!trimmed(body.booking_address)) return { error: "Booking address is required." }
  if (!body.booking_date) return { error: "Booking date is required." }
  if (!body.start_time) return { error: "Start time is required." }
  if (!body.end_time) return { error: "End time is required." }
  if (!body.status) return { error: "Status is required." }
  if (!VALID_BOOKING_STATUSES.includes(body.status)) return { error: "Invalid booking status." }
  if (!Array.isArray(body.services) || body.services.length === 0) {
    return { error: "At least one service is required." }
  }
  if (
    body.services.some(
      (s) => typeof s === "object" && s !== null && (!Number.isInteger(Number(s.quantity)) || Number(s.quantity) < 1)
    )
  ) {
    return { error: "Service quantity must be a whole number of at least 1." }
  }

  const services = body.services.map((s) =>
    typeof s === "object" && s !== null
      ? { service_id: Number(s.service_id), quantity: Math.max(1, Math.floor(Number(s.quantity) || 1)) }
      : { service_id: Number(s), quantity: 1 }
  )
  const serviceIds = services.map((s) => s.service_id)
  if (serviceIds.some((sid) => !Number.isInteger(sid))) return { error: "One or more selected services are invalid." }
  // booking_services has PRIMARY KEY (booking_id, service_id): duplicates would fail in the database.
  if (new Set(serviceIds).size !== serviceIds.length) {
    return { error: "Each service can only be added once. Use quantity instead." }
  }

  const charges = Array.isArray(body.additional_charges) ? body.additional_charges : []
  if (
    charges.some(
      (c) =>
        !trimmed(c?.charge_name) ||
        !Number.isInteger(Number(c.quantity)) ||
        Number(c.quantity) < 1 ||
        !Number.isFinite(Number(c.rate)) ||
        Number(c.rate) < 0
    )
  ) {
    return { error: "Each additional charge requires a name, quantity of at least 1, and a non-negative rate." }
  }

  const advancePayment = Number(body.advance_payment ?? 0)
  if (!Number.isFinite(advancePayment) || advancePayment < 0) return { error: "Advance payment cannot be negative." }
  if (advancePayment > 0 && !VALID_PAYMENT_METHODS.includes(body.advance_payment_method)) {
    return { error: "Select a valid advance payment method." }
  }
  if (advancePayment > 0 && !body.advance_payment_date) return { error: "Advance payment date is required." }

  return {
    data: {
      bookingFields: {
        customer_id: customerId,
        booking_address: trimmed(body.booking_address),
        booking_date: body.booking_date,
        start_time: body.start_time,
        end_time: body.end_time,
        status: body.status,
        additional_request: trimmed(body.additional_request) || null,
      },
      services,
      serviceIds,
      additionalCharges: charges.map((c) => ({
        charge_name: c.charge_name.trim(),
        quantity: Number(c.quantity),
        rate: Number(c.rate),
      })),
      advancePayment,
      advancePaymentMethod: body.advance_payment_method,
      advancePaymentDate: body.advance_payment_date,
    },
  }
}

/** The advance created by the booking form, else any advance payment, else null. */
export function getAdvancePayment(payments) {
  return (
    payments?.find((p) => p.payment_type === "Advance" && p.remark === BOOKING_FORM_ADVANCE_REMARK) ??
    payments?.find((p) => p.payment_type === "Advance") ??
    null
  )
}

/**
 * The booking response in the same shape a re-fetch with joins would return,
 * built from data already in memory.
 */
export function formatBookingResponse({ booking, customer, serviceRows, serviceMap, charges, payments }) {
  const bookingServices = serviceRows.map((row) => {
    const service = serviceMap.get(row.service_id)
    return {
      quantity: row.quantity,
      unit_price: row.unit_price,
      service: service ? { id: service.id, service_name: service.service_name, price: service.price } : null,
    }
  })

  return {
    ...booking,
    customer,
    booking_services: bookingServices,
    booking_additional_charges: charges,
    booking_payments: payments,
    services: bookingServices
      .filter((bs) => bs.service)
      .map((bs) => ({ ...bs.service, quantity: bs.quantity, price: bs.unit_price })),
    additional_charges: charges,
    advance_payment: getAdvancePayment(payments),
  }
}
