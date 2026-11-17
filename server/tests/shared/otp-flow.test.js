import "../helpers/env.js"

import assert from "node:assert/strict"
import { mock, test } from "node:test"

/*
 * Exercises the OTP send/verify/lockout rules against an in-memory whatsapp_otps
 * table. createAdminClient() is replaced via module mocking.
 */

let rows = []
let nextId = 1

function query() {
  const filters = []
  let op = { kind: "select" }
  const matches = (row) => filters.every(([col, test]) => test(row[col]))
  const builder = {
    select: () => builder,
    eq: (col, val) => (filters.push([col, (v) => v === val]), builder),
    in: (col, vals) => (filters.push([col, (v) => vals.includes(v)]), builder),
    order: () => builder,
    limit: () => builder,
    update: (patch) => ((op = { kind: "update", patch }), builder),
    delete: () => ((op = { kind: "delete" }), builder),
    insert: async (row) => {
      rows.unshift({ id: nextId++, created_at: new Date().toISOString(), ...row })
      return { error: null }
    },
    maybeSingle: async () => ({ data: rows.filter(matches)[0] ?? null, error: null }),
    then: (resolve, reject) => {
      if (op.kind === "update") rows.filter(matches).forEach((row) => Object.assign(row, op.patch))
      if (op.kind === "delete") rows = rows.filter((row) => !matches(row))
      const data = op.kind === "select" ? rows.filter(matches) : null
      return Promise.resolve({ data, error: null }).then(resolve, reject)
    },
  }
  return builder
}

mock.module("#src/integrations/supabase.js", {
  namedExports: { createAdminClient: () => ({ from: () => query() }) },
})

const otp = await import("#src/shared/otp.js")

const PHONE = "+91 98765 43210"
const inTenMinutes = () => new Date(Date.now() + 10 * 60_000)

async function send(code) {
  return otp.persistOtpInDatabase(PHONE, otp.hashOtp(code), inTenMinutes())
}

test("full flow: 2 codes x 3 wrong attempts locks the number; correct code verifies", async () => {
  rows = []

  const first = await send("111111")
  assert.deepEqual(first, { success: true, sendCount: 1, canResend: true })
  assert.equal(rows.length, 1)
  assert.equal(rows[0].phone, "9876543210")

  assert.equal((await otp.verifyOtpInDatabase(PHONE, "000000")).attemptsRemaining, 2)
  assert.equal((await otp.verifyOtpInDatabase(PHONE, "000000")).attemptsRemaining, 1)
  const thirdWrong = await otp.verifyOtpInDatabase(PHONE, "000000")
  assert.equal(thirdWrong.needsResend, true)
  // Even the right code is refused once this code is exhausted.
  assert.equal((await otp.verifyOtpInDatabase(PHONE, "111111")).needsResend, true)

  const second = await send("222222")
  assert.deepEqual(second, { success: true, sendCount: 2, canResend: false })

  const third = await send("333333")
  assert.equal(third.success, false)
  assert.match(third.error, /Maximum OTP requests reached/)

  await otp.verifyOtpInDatabase(PHONE, "000000")
  await otp.verifyOtpInDatabase(PHONE, "000000")
  const locked = await otp.verifyOtpInDatabase(PHONE, "000000")
  assert.equal(locked.isLocked, true)
  assert.ok(rows[0].locked_until)

  assert.equal((await otp.verifyOtpInDatabase(PHONE, "222222")).isLocked, true)
  const status = await otp.checkPhoneLockoutStatus(PHONE)
  assert.equal(status.isLocked, true)
  assert.equal(status.canResend, false)
  assert.equal((await send("444444")).isLocked, true)
})

test("correct code verifies and resets attempts", async () => {
  rows = []
  await send("123123")
  await otp.verifyOtpInDatabase(PHONE, "000000")
  assert.deepEqual(await otp.verifyOtpInDatabase(PHONE, "123123"), { valid: true })
  assert.equal(rows[0].verified, true)
  assert.equal(rows[0].attempts, 0)
})

test("expired code and missing record are rejected", async () => {
  rows = []
  assert.match((await otp.verifyOtpInDatabase(PHONE, "123123")).reason, /No active OTP/)
  await otp.persistOtpInDatabase(PHONE, otp.hashOtp("123123"), new Date(Date.now() - 1000))
  assert.match((await otp.verifyOtpInDatabase(PHONE, "123123")).reason, /expired/)
})

test("send window resets after an hour; duplicate rows are collapsed", async () => {
  const hourAgo = new Date(Date.now() - 61 * 60_000).toISOString()
  rows = [
    { id: 90, phone: "9876543210", send_count: 2, last_sent_at: hourAgo, attempts: 3, created_at: hourAgo },
    { id: 89, phone: "9876543210", send_count: 1, last_sent_at: hourAgo, attempts: 0, created_at: hourAgo },
  ]
  assert.deepEqual(await otp.checkPhoneLockoutStatus(PHONE), { isLocked: false, sendCount: 0, canResend: true })
  assert.deepEqual(await send("555555"), { success: true, sendCount: 1, canResend: true })
  assert.deepEqual(rows.map((row) => row.id), [90])
})

test("clearPhoneLockout removes the phone's rows", async () => {
  rows = [{ id: 1, phone: "9876543210", locked_until: new Date(Date.now() + 60_000).toISOString() }]
  await otp.clearPhoneLockout(PHONE)
  assert.equal(rows.length, 0)
})

test("sendAdminDeleteOtp succeeds without sending in non-production when WhatsApp is unconfigured", async () => {
  assert.deepEqual(await otp.sendAdminDeleteOtp("123456"), { success: true })
  assert.equal((await otp.sendOtpToWhatsApp("123", "123456")).error, "Invalid mobile number")
})
