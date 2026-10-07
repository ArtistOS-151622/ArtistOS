import assert from "node:assert/strict"
import test from "node:test"
import {
  isTestPhoneNumber,
  TEST_PHONE_NUMBERS,
  TEST_OTP_CODE,
  sendOtpToWhatsApp,
} from "../lib/auth/otp.ts"

test("isTestPhoneNumber correctly detects 9999999999 and 6354870709 in all formats", () => {
  assert.equal(isTestPhoneNumber("9999999999"), true)
  assert.equal(isTestPhoneNumber("6354870709"), true)
  assert.equal(isTestPhoneNumber("+919999999999"), true)
  assert.equal(isTestPhoneNumber("+91 6354870709"), true)
  assert.equal(isTestPhoneNumber("06354870709"), true)
  assert.equal(isTestPhoneNumber("919999999999"), true)

  // Non-test numbers should return false
  assert.equal(isTestPhoneNumber("9876543210"), false)
  assert.equal(isTestPhoneNumber("+919876543210"), false)
  assert.equal(isTestPhoneNumber("1234567890"), false)
  assert.equal(isTestPhoneNumber(""), false)
})

test("TEST_OTP_CODE is 123456", () => {
  assert.equal(TEST_OTP_CODE, "123456")
  assert.deepEqual(Array.from(TEST_PHONE_NUMBERS), ["9999999999", "6354870709"])
})

test("sendOtpToWhatsApp bypasses dispatch for test numbers", async () => {
  // Test number 9999999999
  const res1 = await sendOtpToWhatsApp("9999999999", "123456")
  assert.equal(res1.success, true)

  // Test number 6354870709
  const res2 = await sendOtpToWhatsApp("6354870709", "123456")
  assert.equal(res2.success, true)
})
