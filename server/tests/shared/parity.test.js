import { TEST_JWT_SECRET } from "../helpers/env.js"

import assert from "node:assert/strict"
import { test } from "node:test"

import * as jsWhatsApp from "#src/integrations/whatsapp.js"
import * as jsTime from "#src/shared/notifications/time.js"
import * as jsOtp from "#src/shared/otp.js"

// The TypeScript originals (still used by the Next.js routes until cutover).
const tsWhatsApp = await import("../../../lib/whatsapp/client.ts")
const tsTime = await import("../../../lib/notifications/time.ts")
const tsOtp = await import("../../../lib/auth/otp.ts")

const PHONES = [
  "9876543210", "09876543210", "919876543210", "+91 98765-43210", "(987) 654-3210",
  "447911123456", "12345", "", null, undefined, "1234567890123456",
]

const PARAMS = [
  "plain", "  padded  ", "line1\nline2", "a\r\nb\tc", "too     many    spaces", "a,\n,\nb", "", null, undefined, 1500, "x\n\n\ny",
]

test("formatWhatsAppPhoneNumber matches the TypeScript version", () => {
  for (const phone of PHONES) {
    assert.equal(jsWhatsApp.formatWhatsAppPhoneNumber(phone), tsWhatsApp.formatWhatsAppPhoneNumber(phone), `phone=${phone}`)
  }
})

test("sanitizeWhatsAppParam matches the TypeScript version (both modes)", () => {
  for (const value of PARAMS) {
    assert.equal(jsWhatsApp.sanitizeWhatsAppParam(value), tsWhatsApp.sanitizeWhatsAppParam(value), `value=${value}`)
    assert.equal(
      jsWhatsApp.sanitizeWhatsAppParam(value, "Fallback", { preserveNewlines: true }),
      tsWhatsApp.sanitizeWhatsAppParam(value, "Fallback", { preserveNewlines: true }),
      `value=${value} (preserveNewlines)`
    )
  }
})

test("time helpers match the TypeScript version", () => {
  const instants = [
    new Date("2026-11-17T18:29:00Z"), new Date("2026-11-17T18:30:00Z"), new Date("2026-12-31T23:59:00Z"), new Date("2026-03-01T00:00:00Z"),
  ]
  for (const instant of instants) {
    assert.deepEqual(jsTime.toWallClock(instant), tsTime.toWallClock(instant))
    assert.deepEqual(jsTime.toWallClock(instant, "UTC"), tsTime.toWallClock(instant, "UTC"))
  }
  for (const time of ["00:00", "09:05:00", "12:00", "12:30:00", "23:59"]) {
    assert.equal(jsTime.formatTimeLabel(time), tsTime.formatTimeLabel(time))
  }
  assert.equal(jsTime.wallClockKey("2026-11-17", "09:05:00"), tsTime.wallClockKey("2026-11-17", "09:05:00"))
  assert.equal(
    jsTime.getMinutesUntilBooking("2026-09-30", "01:00:00", "2026-09-29", "23:30"),
    tsTime.getMinutesUntilBooking("2026-09-30", "01:00:00", "2026-09-29", "23:30")
  )
  assert.equal(jsTime.getMinutesUntilBooking("2026-09-30", "", "2026-09-30", "08:00"), 60) // default 09:00
})

test("OTP hashing, state tokens and registration tokens interoperate with the TypeScript version", () => {
  assert.equal(process.env.JWT_SECRET, TEST_JWT_SECRET)
  assert.equal(jsOtp.hashOtp(" 123456 "), tsOtp.hashOtp(" 123456 "))

  const expires = Date.now() + 60_000
  const hash = jsOtp.hashOtp("482913")
  assert.equal(jsOtp.createOtpStateToken("9876543210", hash, expires), tsOtp.createOtpStateToken("9876543210", hash, expires))
  assert.equal(tsOtp.verifyOtpStateToken(jsOtp.createOtpStateToken("9876543210", hash, expires), "9876543210", "482913"), true)
  assert.equal(jsOtp.verifyOtpStateToken(tsOtp.createOtpStateToken("9876543210", hash, expires), "9876543210", "482913"), true)
  assert.equal(jsOtp.verifyOtpStateToken(jsOtp.createOtpStateToken("9876543210", hash, expires), "9876543210", "000000"), false)
  assert.equal(jsOtp.verifyOtpStateToken(jsOtp.createOtpStateToken("9876543210", hash, expires), "1111111111", "482913"), false)
  assert.equal(jsOtp.verifyOtpStateToken(jsOtp.createOtpStateToken("9876543210", hash, Date.now() - 1), "9876543210", "482913"), false)
  assert.equal(jsOtp.verifyOtpStateToken("garbage", "9876543210", "482913"), false)

  assert.deepEqual(tsOtp.verifyRegistrationToken(jsOtp.createRegistrationToken("9876543210")), { phone: "9876543210" })
  assert.deepEqual(jsOtp.verifyRegistrationToken(tsOtp.createRegistrationToken("9876543210")), { phone: "9876543210" })
  assert.equal(jsOtp.verifyRegistrationToken(jsOtp.createOtpStateToken("9876543210", hash, expires)), null)
  assert.equal(jsOtp.verifyRegistrationToken("a.b"), null)
})

test("generate6DigitOtp always returns 6 digits", () => {
  for (let i = 0; i < 500; i += 1) assert.match(jsOtp.generate6DigitOtp(), /^[1-9]\d{5}$/)
})
