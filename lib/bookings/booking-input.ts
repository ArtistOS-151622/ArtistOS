/**
 * Shared input validation and response shaping for the create (POST /api/bookings)
 * and edit (PATCH /api/bookings/[id]) booking routes.
 */

export type BookingInput = {
  customer_id?: string | number
  booking_address?: string
  booking_date?: string
  start_time?: string
  end_time?: string
  status?: string
  services?: (string | number | { service_id: string | number; quantity?: number })[]
  additional_charges?: { charge_name: string; quantity: number; rate: number }[]
  advance_payment?: number | string
  advance_payment_id?: number | string
  advance_payment_method?: string
  advance_payment_date?: string
  additional_request?: string
}

export const VALID_BOOKING_STATUSES = ["pending", "confirmed", "completed", "cancelled"]
export const VALID_PAYMENT_METHODS = ["UPI", "Cash", "Check", "Bank Transfer"]
export const BOOKING_FORM_ADVANCE_REMARK = "Advance payment added during booking"

/** Columns of the bookings row itself (no joins). */
export const BOOKING_ROW_FIELDS =
  "id, user_id, customer_id, booking_address, booking_date, start_time, end_time, status, additional_request, created_at, discount"
export const PAYMENT_FIELDS = "id, payment_type, payment_method, amount, payment_date, remark"
export const CHARGE_FIELDS = "id, charge_name, quantity, rate"

export type PaymentRow = {
  id: number
  payment_type: string
  payment_method: string
  amount: number
  payment_date: string
  remark: string | null
}

export type ChargeRow = { id: number; charge_name: string; quantity: number; rate: number }
export type ServiceRow = { id: number; service_name: string; price: number }
export type CustomerRow = { customer_name: string; phone: string; email: string | null }

export type NormalizedBookingInput = {
  bookingFields: {
    customer_id: number
    booking_address: string
    booking_date: string
    start_time: string
    end_time: string
    status: string
    additional_request: string | null
  }
  services: { service_id: number; quantity: number }[]
  serviceIds: number[]
  additionalCharges: { charge_name: string; quantity: number; rate: number }[]
  advancePayment: number
  advancePaymentMethod: string | undefined
  advancePaymentDate: string | undefined
}

/** Validates a booking create/edit body without touching the database. */
export function validateBookingInput(
  body: BookingInput,
): { error: string } | { data: NormalizedBookingInput } {
  const customerId = Number(body.customer_id)
  if (!body.customer_id || !Number.isInteger(customerId)) return { error: "Customer is required." }
  if (!body.booking_address?.trim()) return { error: "Booking address is required." }
  if (!body.booking_date) return { error: "Booking date is required." }
  if (!body.start_time) return { error: "Start time is required." }
  if (!body.end_time) return { error: "End time is required." }
  if (!body.status) return { error: "Status is required." }
  if (!VALID_BOOKING_STATUSES.includes(body.status)) return { error: "Invalid booking status." }
  if (!body.services || body.services.length === 0) return { error: "At least one service is required." }
  if (body.services.some((service) => typeof service === "object" && (!Number.isInteger(Number(service.quantity)) || Number(service.quantity) < 1))) {
    return { error: "Service quantity must be a whole number of at least 1." }
  }

  const services = body.services.map((service) =>
    typeof service === "object"
      ? { service_id: Number(service.service_id), quantity: Math.max(1, Math.floor(Number(service.quantity) || 1)) }
      : { service_id: Number(service), quantity: 1 },
  )
  const serviceIds = services.map((service) => service.service_id)
  if (serviceIds.some((sid) => !Number.isInteger(sid))) return { error: "One or more selected services are invalid." }
  // booking_services has PRIMARY KEY (booking_id, service_id), so duplicates would fail in the database
  if (new Set(serviceIds).size !== serviceIds.length) return { error: "Each service can only be added once. Use quantity instead." }

  const charges = body.additional_charges ?? []
  if (charges.some((charge) => !charge.charge_name?.trim() || !Number.isInteger(Number(charge.quantity)) || Number(charge.quantity) < 1 || !Number.isFinite(Number(charge.rate)) || Number(charge.rate) < 0)) {
    return { error: "Each additional charge requires a name, quantity of at least 1, and a non-negative rate." }
  }

  const advancePayment = Number(body.advance_payment ?? 0)
  if (!Number.isFinite(advancePayment) || advancePayment < 0) return { error: "Advance payment cannot be negative." }
  if (advancePayment > 0 && (!body.advance_payment_method || !VALID_PAYMENT_METHODS.includes(body.advance_payment_method))) {
    return { error: "Select a valid advance payment method." }
  }
  if (advancePayment > 0 && !body.advance_payment_date) return { error: "Advance payment date is required." }

  return {
    data: {
      bookingFields: {
        customer_id: customerId,
        booking_address: body.booking_address.trim(),
        booking_date: body.booking_date,
        start_time: body.start_time,
        end_time: body.end_time,
        status: body.status,
        additional_request: body.additional_request?.trim() || null,
      },
      services,
      serviceIds,
      additionalCharges: charges.map((charge) => ({
        charge_name: charge.charge_name.trim(),
        quantity: Number(charge.quantity),
        rate: Number(charge.rate),
      })),
      advancePayment,
      advancePaymentMethod: body.advance_payment_method,
      advancePaymentDate: body.advance_payment_date,
    },
  }
}

/** Prefers the advance created by the booking form, falling back to any advance payment. */
export function getAdvancePayment<T extends { payment_type: string; remark: string | null }>(
  payments: T[] | null | undefined,
): T | null {
  return payments?.find((payment) =>
    payment.payment_type === "Advance" && payment.remark === BOOKING_FORM_ADVANCE_REMARK,
  ) ?? payments?.find((payment) => payment.payment_type === "Advance") ?? null
}

/**
 * Builds the booking response in the same shape as a re-fetch with joins would return,
 * from data the route already has in memory.
 */
export function formatBookingResponse<B extends object>({
  booking,
  customer,
  serviceRows,
  serviceMap,
  charges,
  payments,
}: {
  booking: B
  customer: CustomerRow
  serviceRows: { service_id: number; quantity: number; unit_price: number }[]
  serviceMap: Map<number, ServiceRow>
  charges: ChargeRow[]
  payments: PaymentRow[]
}) {
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
