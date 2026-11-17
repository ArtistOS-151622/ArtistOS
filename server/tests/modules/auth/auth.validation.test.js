import "../../helpers/env.js"

import assert from "node:assert/strict"
import { test } from "node:test"

import { registerProfileSchema, sendOtpSchema, verifyOtpSchema } from "#src/modules/auth/auth.validation.js"
import { updateProfileSchema } from "#src/modules/profile/profile.validation.js"

const messageOf = (schema, input) => {
  const result = schema.safeParse(input)
  return result.success ? null : result.error.issues[0].message
}

test("optional fields may be missing (regression: zod 4 'expected nonoptional')", () => {
  assert.equal(registerProfileSchema.body.safeParse({}).success, true)
  assert.deepEqual(verifyOtpSchema.body.parse({ phone: "9876543210", otp: "123456" }), {
    phone: "9876543210",
    otp: "123456",
  })
  const parsed = registerProfileSchema.body.parse({ artistName: 5, studioName: "S" })
  assert.equal(parsed.artistName, undefined)
  assert.equal(parsed.studioName, "S")
})

test("phone is normalised to its last 10 digits, with the original messages", () => {
  assert.deepEqual(sendOtpSchema.body.parse({ phone: "+91 98765-43210" }), { phone: "9876543210" })
  assert.equal(messageOf(sendOtpSchema.body, { phone: "12345" }), "Please enter a valid 10-digit mobile number.")
  assert.equal(messageOf(sendOtpSchema.body, {}), "Please enter a valid 10-digit mobile number.")
  assert.equal(messageOf(verifyOtpSchema.body, { phone: "1", otp: "123456" }), "Please provide a valid 10-digit mobile number.")
})

test("otp must be exactly 6 digits", () => {
  const msg = "Please enter the complete 6-digit OTP received on WhatsApp."
  assert.equal(messageOf(verifyOtpSchema.body, { phone: "9876543210", otp: "12" }), msg)
  assert.equal(messageOf(verifyOtpSchema.body, { phone: "9876543210", otp: "12345a" }), msg)
  assert.equal(verifyOtpSchema.body.parse({ phone: "9876543210", otp: " 123456 " }).otp, "123456")
})

test("profile update: required fields, maps URL check, email untouched when absent", () => {
  const base = { artist_name: "A", studio_name: "S", address: "Rajkot" }
  assert.deepEqual(updateProfileSchema.body.parse(base), { ...base, google_maps_url: null })
  assert.equal(
    updateProfileSchema.body.parse({ ...base, google_maps_url: "  https://maps.app.goo.gl/x  " }).google_maps_url,
    "https://maps.app.goo.gl/x"
  )
  assert.equal(messageOf(updateProfileSchema.body, { ...base, address: "" }), "Artist name, studio name, and address are required")
  assert.equal(messageOf(updateProfileSchema.body, { ...base, google_maps_url: "http://maps.google.com" }), "Enter a valid HTTPS Google Maps link.")
  assert.equal("phone" in updateProfileSchema.body.parse({ ...base, phone: "1" }), false)
})
