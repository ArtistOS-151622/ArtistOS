import assert from "node:assert/strict"
import test from "node:test"
import { validateInquiry } from "../lib/inquiries/validation.ts"

test("validateInquiry requires at least one service to be selected", () => {
  const baseInput = {
    customer_name: "Priyank Sharma",
    phone: "9876543210",
    email: "priyank@example.com",
    address: "123 Main St, Mumbai",
    booking_date: "2026-11-20",
    start_time: "10:00",
    end_time: "12:00",
  }

  // Without services
  const resultWithoutServices = validateInquiry({
    ...baseInput,
    services: [],
  })
  assert.equal("error" in resultWithoutServices, true)
  if ("error" in resultWithoutServices) {
    assert.equal(resultWithoutServices.error, "Please select at least one service.")
  }

  // With undefined services
  const resultWithUndefinedServices = validateInquiry({
    ...baseInput,
  })
  assert.equal("error" in resultWithUndefinedServices, true)
  if ("error" in resultWithUndefinedServices) {
    assert.equal(resultWithUndefinedServices.error, "Please select at least one service.")
  }

  // With valid services
  const resultWithServices = validateInquiry({
    ...baseInput,
    services: ["101", 102],
  })
  assert.equal("data" in resultWithServices, true)
  if ("data" in resultWithServices) {
    assert.deepEqual(resultWithServices.data.services, [101, 102])
    assert.equal(resultWithServices.data.phone, "+919876543210")
  }
})

test("validateInquiry accepts and preserves international E.164 numbers", () => {
  const result = validateInquiry({
    customer_name: "Alex Morgan",
    phone: "+14155552671",
    alt_phone: "+447700900123",
    address: "1 Market Street",
    booking_date: "2026-11-20",
    start_time: "10:00",
    end_time: "12:00",
    services: [101],
  })

  assert.equal("data" in result, true)
  if ("data" in result) {
    assert.equal(result.data.phone, "+14155552671")
    assert.equal(result.data.alt_phone, "+447700900123")
  }
})

test("validateInquiry rejects malformed international numbers", () => {
  const result = validateInquiry({
    customer_name: "Alex Morgan",
    phone: "+01234",
    address: "1 Market Street",
    booking_date: "2026-11-20",
    start_time: "10:00",
    end_time: "12:00",
    services: [101],
  })

  assert.deepEqual(result, { error: "Enter a valid phone number including the country code." })
})
