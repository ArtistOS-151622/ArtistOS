import "../../helpers/env.js"

import assert from "node:assert/strict"
import { test } from "node:test"

import {
  BOOKING_FORM_ADVANCE_REMARK,
  formatBookingResponse,
  getAdvancePayment,
  validateBookingInput,
} from "#src/modules/bookings/booking-input.js"
import { contentDisposition, quotationFilename } from "#src/modules/bookings/pdf/pdf.service.js"

const valid = {
  customer_id: "7",
  booking_address: "  Rajkot ",
  booking_date: "2026-12-15",
  start_time: "10:00",
  end_time: "12:00",
  status: "pending",
  services: [{ service_id: "3", quantity: "2" }, 4],
  additional_charges: [{ charge_name: " Travel ", quantity: "1", rate: "300" }],
  advance_payment: "500",
  advance_payment_method: "UPI",
  advance_payment_date: "2026-11-17",
  additional_request: "  ",
}

const errorOf = (overrides) => validateBookingInput({ ...valid, ...overrides }).error

test("normalises a valid booking body", () => {
  const { data } = validateBookingInput(valid)
  assert.deepEqual(data.bookingFields, {
    customer_id: 7,
    booking_address: "Rajkot",
    booking_date: "2026-12-15",
    start_time: "10:00",
    end_time: "12:00",
    status: "pending",
    additional_request: null,
  })
  assert.deepEqual(data.services, [{ service_id: 3, quantity: 2 }, { service_id: 4, quantity: 1 }])
  assert.deepEqual(data.additionalCharges, [{ charge_name: "Travel", quantity: 1, rate: 300 }])
  assert.equal(data.advancePayment, 500)
})

test("rejects with the original messages, in the original order", () => {
  assert.equal(errorOf({ customer_id: "" }), "Customer is required.")
  assert.equal(errorOf({ booking_address: " " }), "Booking address is required.")
  assert.equal(errorOf({ status: "done" }), "Invalid booking status.")
  assert.equal(errorOf({ services: [] }), "At least one service is required.")
  assert.equal(errorOf({ services: [{ service_id: 1, quantity: 0 }] }), "Service quantity must be a whole number of at least 1.")
  assert.equal(errorOf({ services: ["x"] }), "One or more selected services are invalid.")
  assert.equal(errorOf({ services: [1, 1] }), "Each service can only be added once. Use quantity instead.")
  assert.match(errorOf({ additional_charges: [{ charge_name: "x", quantity: 1, rate: -1 }] }), /non-negative rate/)
  assert.equal(errorOf({ advance_payment: -1 }), "Advance payment cannot be negative.")
  assert.equal(errorOf({ advance_payment_method: "Card" }), "Select a valid advance payment method.")
  assert.equal(errorOf({ advance_payment_date: "" }), "Advance payment date is required.")
  // No advance → method/date not required.
  assert.equal(errorOf({ advance_payment: 0, advance_payment_method: undefined, advance_payment_date: undefined }), undefined)
})

test("getAdvancePayment prefers the booking-form advance", () => {
  const manual = { id: 1, payment_type: "Advance", remark: "cash" }
  const form = { id: 2, payment_type: "Advance", remark: BOOKING_FORM_ADVANCE_REMARK }
  assert.equal(getAdvancePayment([manual, form]), form)
  assert.equal(getAdvancePayment([manual]), manual)
  assert.equal(getAdvancePayment([{ payment_type: "Installment" }]), null)
  assert.equal(getAdvancePayment(null), null)
})

test("formatBookingResponse matches the joined shape", () => {
  const out = formatBookingResponse({
    booking: { id: 9 },
    customer: { customer_name: "A" },
    serviceRows: [{ service_id: 3, quantity: 2, unit_price: 100 }, { service_id: 99, quantity: 1, unit_price: 5 }],
    serviceMap: new Map([[3, { id: 3, service_name: "Bridal", price: 120 }]]),
    charges: [],
    payments: [],
  })
  assert.deepEqual(out.services, [{ id: 3, service_name: "Bridal", price: 100, quantity: 2 }])
  assert.equal(out.booking_services[1].service, null)
  assert.equal(out.advance_payment, null)
})

test("quotation filename and Content-Disposition", () => {
  const name = quotationFilename("  Asha / Mehndi: Studio ", "Priya Shah", "2026-11-17T10:00:00Z", 42)
  assert.match(name, /^Asha-Mehndi-Studio-Quotation-Priya-\d{6}\.pdf$/)
  assert.equal(name, quotationFilename("  Asha / Mehndi: Studio ", "Priya Shah", "2026-11-17T10:00:00Z", 42))
  assert.match(quotationFilename(null, null, "x", 1), /^Artist-Studio-Quotation-Customer-\d{6}\.pdf$/)
  assert.equal(
    contentDisposition("Stüdio-Quotation-A-123456.pdf"),
    "attachment; filename=\"Stdio-Quotation-A-123456.pdf\"; filename*=UTF-8''St%C3%BCdio-Quotation-A-123456.pdf"
  )
})
