import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto"

import { config } from "#src/config/env.js"
import { createAdminClient } from "#src/integrations/supabase.js"
import { formatWhatsAppPhoneNumber, sendWhatsAppTemplate } from "#src/integrations/whatsapp.js"
import { logger } from "#src/utils/logger.js"

/*
 * WhatsApp OTP for login/signup, and the admin's delete-artist 2FA.
 *
 * State lives entirely in the whatsapp_otps table (one row per phone):
 * - max 2 sends per 1-hour window (initial + 1 resend),
 * - max 3 wrong attempts per code; after the 1st code is exhausted the user must
 *   resend; after the 2nd the phone is locked for 1 hour (locked_until).
 */

export const OTP_EXPIRY_MINUTES = 10
export const OTP_COOLDOWN_SECONDS = 30
export const MAX_OTP_ATTEMPTS = 3
export const MAX_OTP_SENDS = 2
export const MAX_ATTEMPTS_PER_OTP = 3
export const LOCKOUT_DURATION_MS = 60 * 60 * 1000
export const TEST_USER_OTP = "123456"
export const ADMIN_SECURITY_PHONE = "9313202075"

const OTP_TEMPLATE = "artistos_welcome"
const REGISTRATION_TOKEN_TTL_MS = 60 * 60 * 1000
const REGISTRATION_PURPOSE = "register_profile"
const OTP_TABLE = "whatsapp_otps"

const LOCKED_MESSAGE = (minutesLeft) =>
  `This mobile number is locked for 1 hour due to multiple failed attempts. Please contact admin or try after ${minutesLeft} minute(s).`
const BOTH_CODES_EXHAUSTED_MESSAGE =
  "Too many failed attempts (3/3 on both OTPs). This mobile number is locked for 1 hour. Please contact admin or try after 1 hour."

const log = logger.child({ feature: "otp" })

/** Last 10 digits: the form phones are stored in. */
const normalizePhone = (phone) => String(phone).replace(/\D/g, "").slice(-10)

const minutesUntil = (ms) => Math.max(1, Math.ceil((ms - Date.now()) / (60 * 1000)))

const isLocked = (record) => Boolean(record?.locked_until && new Date(record.locked_until).getTime() > Date.now())

export async function isTestUser(phone, existingSupabase) {
  if (!phone) return false
  const clean = normalizePhone(phone)
  if (clean.length !== 10) return false

  try {
    const supabase = existingSupabase || createAdminClient()
    const { data: user } = await supabase.from("users").select("is_test_user").eq("phone", clean).maybeSingle()
    return Boolean(user?.is_test_user)
  } catch (err) {
    log.error({ name: err instanceof Error ? err.name : undefined }, "test-account lookup failed")
    return false
  }
}

export function generate6DigitOtp() {
  return String((randomBytes(4).readUInt32BE(0) % 900000) + 100000)
}

export function hashOtp(otp) {
  return createHash("sha256").update(otp.trim()).digest("hex")
}

// --- Signed state tokens (base64url(payload).base64url(hmac)) ---------------------------

function signState(payload) {
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url")
  const signature = createHmac("sha256", config.jwtSecret).update(encoded).digest("base64url")
  return `${encoded}.${signature}`
}

function readState(token) {
  const [encoded, signature] = String(token).split(".")
  if (!encoded || !signature) return null

  const expected = createHmac("sha256", config.jwtSecret).update(encoded).digest("base64url")
  if (signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    return null
  }
  return JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"))
}

/** HMAC-signed { phone, otpHash, exp }: tamper-proof OTP state without the database. */
export function createOtpStateToken(phone, otpHash, expiresAtMs) {
  return signState({ phone, otpHash, exp: expiresAtMs })
}

export function verifyOtpStateToken(token, phone, otp) {
  try {
    const payload = readState(token)
    if (!payload || payload.phone !== phone || Date.now() > payload.exp) return false
    return hashOtp(otp) === payload.otpHash
  } catch {
    return false
  }
}

/** Proof the phone was verified, valid 1 hour, for completing the studio profile. */
export function createRegistrationToken(phone) {
  return signState({ phone, purpose: REGISTRATION_PURPOSE, exp: Date.now() + REGISTRATION_TOKEN_TTL_MS })
}

export function verifyRegistrationToken(token) {
  try {
    const payload = readState(token)
    if (!payload || payload.purpose !== REGISTRATION_PURPOSE || Date.now() > payload.exp) return null
    if (!payload.phone || typeof payload.phone !== "string") return null
    return { phone: payload.phone }
  } catch {
    return null
  }
}

// --- Sending -------------------------------------------------------------------------------

export async function sendOtpToWhatsApp(phone, otp) {
  const formattedPhone = formatWhatsAppPhoneNumber(phone)
  if (!formattedPhone) return { success: false, error: "Invalid mobile number" }

  return sendWhatsAppTemplate({
    to: formattedPhone,
    templateName: OTP_TEMPLATE,
    languageCode: config.whatsapp.templateLang,
    bodyParameters: [`your OTP is: ${otp}`],
  })
}

/** Admin 2FA for deleting an artist, sent to ADMIN_SECURITY_PHONE. Skipped (success) in dev without a token. */
export async function sendAdminDeleteOtp(otp) {
  const formattedPhone = formatWhatsAppPhoneNumber(ADMIN_SECURITY_PHONE)
  if (!formattedPhone) return { success: false, error: "Invalid admin mobile number" }

  if (!config.whatsapp.accessToken && !config.isProduction) return { success: true }

  return sendWhatsAppTemplate({
    to: formattedPhone,
    templateName: OTP_TEMPLATE,
    languageCode: config.whatsapp.templateLang,
    bodyParameters: [`this is admin otp for delete artist: ${otp}`],
  })
}

// --- Database state ------------------------------------------------------------------------

/** → { isLocked, minutesLeft?, sendCount, canResend } */
export async function checkPhoneLockoutStatus(phone) {
  const clean = normalizePhone(phone)
  try {
    const { data: record, error } = await createAdminClient()
      .from(OTP_TABLE)
      .select("send_count, locked_until, last_sent_at")
      .eq("phone", clean)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error || !record) return { isLocked: false, sendCount: 0, canResend: true }

    if (isLocked(record)) {
      const lockMs = new Date(record.locked_until).getTime()
      return { isLocked: true, minutesLeft: minutesUntil(lockMs), sendCount: record.send_count || 2, canResend: false }
    }

    const lastSentMs = new Date(record.last_sent_at || Date.now()).getTime()
    if (Date.now() - lastSentMs > LOCKOUT_DURATION_MS) return { isLocked: false, sendCount: 0, canResend: true }

    const sendCount = typeof record.send_count === "number" ? record.send_count : 1
    return { isLocked: false, sendCount, canResend: sendCount < MAX_OTP_SENDS }
  } catch {
    return { isLocked: false, sendCount: 0, canResend: true }
  }
}

export async function clearPhoneLockout(phone) {
  try {
    await createAdminClient().from(OTP_TABLE).delete().eq("phone", normalizePhone(phone))
  } catch {
    // Best effort.
  }
}

/**
 * Stores a newly generated OTP (one row per phone; older duplicates are removed),
 * enforcing the lockout and the 2-sends-per-hour limit.
 * → { success, error?, isLocked?, lockedUntil?, sendCount, canResend }
 */
export async function persistOtpInDatabase(phone, otpHash, expiresAt) {
  const clean = normalizePhone(phone)

  try {
    const supabase = createAdminClient()
    const { data: existingRecords, error: queryErr } = await supabase
      .from(OTP_TABLE)
      .select("id, send_count, locked_until, last_sent_at, attempts")
      .eq("phone", clean)
      .order("created_at", { ascending: false })

    if (queryErr) log.warn({ code: queryErr.code }, "OTP lookup failed")

    const baseColumns = { otp_hash: otpHash, expires_at: expiresAt.toISOString(), verified: false, attempts: 0 }

    if (existingRecords && existingRecords.length > 0) {
      const primary = existingRecords[0]

      if (isLocked(primary)) {
        const lockMs = new Date(primary.locked_until).getTime()
        return {
          success: false,
          isLocked: true,
          lockedUntil: new Date(lockMs),
          sendCount: primary.send_count || 2,
          canResend: false,
          error: LOCKED_MESSAGE(minutesUntil(lockMs)),
        }
      }

      const lastSentMs = new Date(primary.last_sent_at || Date.now()).getTime()
      let sendCount = typeof primary.send_count === "number" ? primary.send_count : 0
      if (Date.now() - lastSentMs > LOCKOUT_DURATION_MS) sendCount = 0 // window passed

      if (sendCount >= MAX_OTP_SENDS) {
        return {
          success: false,
          isLocked: false,
          sendCount,
          canResend: false,
          error: "Maximum OTP requests reached (2/2). Please contact admin or try again after 1 hour.",
        }
      }

      const nextSendCount = sendCount + 1
      const { error: updateErr } = await supabase
        .from(OTP_TABLE)
        .update({
          ...baseColumns,
          send_count: nextSendCount,
          locked_until: null,
          last_sent_at: new Date().toISOString(),
        })
        .eq("id", primary.id)

      if (updateErr) {
        // Older schema without send_count/locked_until/last_sent_at.
        log.warn({ code: updateErr.code }, "extended OTP update failed; using base columns")
        await supabase.from(OTP_TABLE).update(baseColumns).eq("id", primary.id)
      }

      if (existingRecords.length > 1) {
        await supabase
          .from(OTP_TABLE)
          .delete()
          .in(
            "id",
            existingRecords.slice(1).map((record) => record.id)
          )
      }

      return { success: true, sendCount: nextSendCount, canResend: nextSendCount < MAX_OTP_SENDS }
    }

    const { error: insertErr } = await supabase.from(OTP_TABLE).insert({
      phone: clean,
      ...baseColumns,
      send_count: 1,
      locked_until: null,
      last_sent_at: new Date().toISOString(),
    })

    if (insertErr) {
      log.warn({ code: insertErr.code }, "extended OTP insert failed; using base columns")
      await supabase.from(OTP_TABLE).insert({ phone: clean, ...baseColumns })
    }

    return { success: true, sendCount: 1, canResend: true }
  } catch (err) {
    log.error({ name: err instanceof Error ? err.name : undefined }, "OTP storage failure")
    return {
      success: false,
      error: "Database error while storing OTP. Please try again.",
      sendCount: 0,
      canResend: false,
    }
  }
}

/**
 * Checks a code against the stored hash, counting wrong attempts.
 * → { valid, reason?, isLocked?, needsResend?, attemptsRemaining? }
 */
export async function verifyOtpInDatabase(phone, otp) {
  const clean = normalizePhone(phone)

  try {
    const supabase = createAdminClient()
    const { data: record, error } = await supabase
      .from(OTP_TABLE)
      .select("*")
      .eq("phone", clean)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      log.warn({ code: error.code }, "OTP verification lookup failed")
      return { valid: false, reason: "Database error. Please try again." }
    }
    if (!record) return { valid: false, reason: "No active OTP found. Please request a new OTP." }

    if (isLocked(record)) {
      const lockMs = new Date(record.locked_until).getTime()
      return { valid: false, isLocked: true, reason: LOCKED_MESSAGE(minutesUntil(lockMs)), attemptsRemaining: 0 }
    }

    if (new Date(record.expires_at).getTime() < Date.now()) {
      return { valid: false, reason: "OTP has expired. Please request a new one." }
    }

    const sendCount = typeof record.send_count === "number" ? record.send_count : 1
    const attempts = typeof record.attempts === "number" ? record.attempts : 0
    const lockUntilIso = () => new Date(Date.now() + LOCKOUT_DURATION_MS).toISOString()

    // This code is already out of attempts.
    if (attempts >= MAX_ATTEMPTS_PER_OTP) {
      if (sendCount >= MAX_OTP_SENDS) {
        await supabase.from(OTP_TABLE).update({ locked_until: lockUntilIso() }).eq("id", record.id)
        return { valid: false, isLocked: true, reason: BOTH_CODES_EXHAUSTED_MESSAGE, attemptsRemaining: 0 }
      }
      return {
        valid: false,
        needsResend: true,
        reason: "3 incorrect attempts. This OTP is disabled. Please click 'Resend OTP' to request a new code.",
        attemptsRemaining: 0,
      }
    }

    if (hashOtp(otp) !== record.otp_hash) {
      const newAttempts = attempts + 1

      if (newAttempts < MAX_ATTEMPTS_PER_OTP) {
        await supabase.from(OTP_TABLE).update({ attempts: newAttempts }).eq("id", record.id)
        const remaining = MAX_ATTEMPTS_PER_OTP - newAttempts
        return {
          valid: false,
          attemptsRemaining: remaining,
          reason: `Incorrect OTP. ${remaining} attempt${remaining > 1 ? "s" : ""} remaining.`,
        }
      }

      if (sendCount >= MAX_OTP_SENDS) {
        // Both codes exhausted: lock the number for 1 hour.
        try {
          await supabase
            .from(OTP_TABLE)
            .update({ attempts: newAttempts, locked_until: lockUntilIso() })
            .eq("id", record.id)
        } catch {
          await supabase.from(OTP_TABLE).update({ attempts: newAttempts }).eq("id", record.id)
        }
        return { valid: false, isLocked: true, reason: BOTH_CODES_EXHAUSTED_MESSAGE, attemptsRemaining: 0 }
      }

      // First code exhausted: require a resend.
      await supabase.from(OTP_TABLE).update({ attempts: newAttempts }).eq("id", record.id)
      return {
        valid: false,
        needsResend: true,
        reason:
          "Incorrect OTP. You have exhausted all 3 attempts for this code. Please click 'Resend OTP' to request a new code.",
        attemptsRemaining: 0,
      }
    }

    await supabase.from(OTP_TABLE).update({ verified: true, attempts: 0, locked_until: null }).eq("id", record.id)
    return { valid: true }
  } catch (err) {
    log.warn({ name: err instanceof Error ? err.name : undefined }, "OTP verification failure")
    return { valid: false, reason: "Database error during verification. Please try again." }
  }
}
