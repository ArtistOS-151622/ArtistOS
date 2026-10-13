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
  }
})
