import assert from "node:assert/strict"
import test from "node:test"

import { isE164Phone, normalizeE164Phone } from "../lib/phone/e164.ts"

test("keeps valid international E.164 customer numbers", () => {
  assert.equal(normalizeE164Phone("+14155552671"), "+14155552671")
  assert.equal(normalizeE164Phone("+44 7700 900123"), "+447700900123")
})

test("upgrades legacy Indian customer numbers during rollout", () => {
  assert.equal(normalizeE164Phone("9876543210"), "+919876543210")
  assert.equal(normalizeE164Phone("98765 43210"), "+919876543210")
})

test("rejects missing, malformed, and oversized numbers", () => {
  assert.equal(normalizeE164Phone(""), null)
  assert.equal(normalizeE164Phone("12345"), null)
  assert.equal(normalizeE164Phone("+0123456789"), null)
  assert.equal(normalizeE164Phone("+1234567890123456"), null)
  assert.equal(isE164Phone("+919876543210"), true)
  assert.equal(isE164Phone("9876543210"), false)
})
