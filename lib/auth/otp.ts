import { createHmac, createHash, timingSafeEqual, randomBytes } from "crypto"
import { sendWhatsAppTemplate, formatWhatsAppPhoneNumber, type WhatsAppSendResult } from "../whatsapp/client.ts"
import { createAdminClient } from "../supabase/admin.ts"

const OTP_EXPIRY_MINUTES = 10
const OTP_COOLDOWN_SECONDS = 30
export const MAX_OTP_ATTEMPTS = 3
export const MAX_OTP_SENDS = 2           // Maximum 2 OTP requests per 1-hour window
export const MAX_ATTEMPTS_PER_OTP = 3     // Maximum 3 wrong attempts per OTP code
export const LOCKOUT_DURATION_MS = 60 * 60 * 1000 // 1 hour lockout in milliseconds
export const TEST_USER_OTP = "123456"

export async function isTestUser(phone: string, existingSupabase?: unknown): Promise<boolean> {
  if (!phone) return false
  const clean = phone.replace(/\D/g, "").slice(-10)
  if (clean.length !== 10) return false

  try {
    const supabase = (existingSupabase as ReturnType<typeof createAdminClient>) || createAdminClient()
    const { data: user } = await supabase
      .from("users")
      .select("is_test_user")
      .eq("phone", clean)
      .maybeSingle()

    return Boolean(user?.is_test_user)
  } catch (err) {
    console.error("[OTP] Error checking isTestUser:", err)
    return false
  }
}

function getAuthSecret(): string {
  const secret =
    process.env.JWT_SECRET ||
    process.env.AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    (process.env.NODE_ENV === "production" ? "" : "artistos-local-dev-secret")

  if (!secret) throw new Error("JWT_SECRET is not configured")
  return secret
}

export function generate6DigitOtp(): string {
  const num = (randomBytes(4).readUInt32BE(0) % 900000) + 100000
  return num.toString()
}

export function hashOtp(otp: string): string {
  return createHash("sha256").update(otp.trim()).digest("hex")
}

/**
 * Creates an HMAC-signed token holding state (phone, otpHash, exp)
 * Provides tamper-proof fallback even before DB migrations run.
 */
export function createOtpStateToken(phone: string, otpHash: string, expiresAtMs: number): string {
  const secret = getAuthSecret()
  const payload = JSON.stringify({ phone, otpHash, exp: expiresAtMs })
  const base64Payload = Buffer.from(payload).toString("base64url")
  const signature = createHmac("sha256", secret).update(base64Payload).digest("base64url")
  return `${base64Payload}.${signature}`
}

export function verifyOtpStateToken(token: string, phone: string, otp: string): boolean {
  try {
    const [base64Payload, signature] = token.split(".")
    if (!base64Payload || !signature) return false

    const secret = getAuthSecret()
    const expectedSig = createHmac("sha256", secret).update(base64Payload).digest("base64url")
    if (signature.length !== expectedSig.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
      return false
    }

    const payload = JSON.parse(Buffer.from(base64Payload, "base64url").toString("utf8"))
    if (payload.phone !== phone) return false
    if (Date.now() > payload.exp) return false

    const inputHash = hashOtp(otp)
    return inputHash === payload.otpHash
  } catch {
    return false
  }
}

/**
 * Creates a signed token proving the user successfully verified their phone number
 * Valid for 1 hour to complete studio profile registration.
 */
export function createRegistrationToken(phone: string): string {
  const secret = getAuthSecret()
  const exp = Date.now() + 60 * 60 * 1000 // 1 hour
  const payload = JSON.stringify({ phone, purpose: "register_profile", exp })
  const base64Payload = Buffer.from(payload).toString("base64url")
  const signature = createHmac("sha256", secret).update(base64Payload).digest("base64url")
  return `${base64Payload}.${signature}`
}

export function verifyRegistrationToken(token: string): { phone: string } | null {
  try {
    const [base64Payload, signature] = token.split(".")
    if (!base64Payload || !signature) return null

    const secret = getAuthSecret()
    const expectedSig = createHmac("sha256", secret).update(base64Payload).digest("base64url")
    if (signature.length !== expectedSig.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
      return null
    }

    const payload = JSON.parse(Buffer.from(base64Payload, "base64url").toString("utf8"))
    if (payload.purpose !== "register_profile") return null
    if (Date.now() > payload.exp) return null
    if (!payload.phone || typeof payload.phone !== "string") return null

    return { phone: payload.phone }
  } catch {
    return null
  }
}

/**
 * Sends OTP via WhatsApp using Meta Cloud API with template `artistos_welcome`
 * Dynamic parameter for customer name: "your OTP is: {{otp}}"
 */
export async function sendOtpToWhatsApp(phone: string, otp: string): Promise<WhatsAppSendResult> {
  const formattedPhone = formatWhatsAppPhoneNumber(phone)
  if (!formattedPhone) {
    return { success: false, error: "Invalid mobile number" }
  }

  const customerNameParam = `your OTP is: ${otp}`

  console.log(`[WhatsApp OTP] Dispatching template "artistos_welcome" to ${formattedPhone} with param: "${customerNameParam}"`)

  const result = await sendWhatsAppTemplate({
    to: formattedPhone,
    templateName: "artistos_welcome",
    languageCode: process.env.WHATSAPP_TEMPLATE_LANG?.trim() || "en",
    bodyParameters: [customerNameParam],
  })

  if (process.env.NODE_ENV !== "production") {
    console.log(`\n========================================`)
    console.log(`[DEV ONLY] WhatsApp OTP for ${phone}: ${otp}`)
    console.log(`========================================\n`)
  }

  return result
}

export const ADMIN_SECURITY_PHONE = "9313202075"

/**
 * Sends Admin 2FA verification OTP to 9313202075 for deleting an artist.
 * Uses template `artistos_welcome` with body parameter:
 * "this is admin otp for delete artist: {{otp}}"
 */
export async function sendAdminDeleteOtp(otp: string): Promise<WhatsAppSendResult> {
  const formattedPhone = formatWhatsAppPhoneNumber(ADMIN_SECURITY_PHONE)
  if (!formattedPhone) {
    return { success: false, error: "Invalid admin mobile number" }
  }

  const adminParam = `this is admin otp for delete artist: ${otp}`

  console.log(`[Admin OTP] Dispatching template "artistos_welcome" to ${formattedPhone} with param: "${adminParam}"`)

  if (process.env.NODE_ENV !== "production") {
    console.log(`\n========================================`)
    console.log(`[DEV / ADMIN] WhatsApp Delete OTP for ${ADMIN_SECURITY_PHONE}: ${otp}`)
    console.log(`Param: "${adminParam}"`)
    console.log(`========================================\n`)
  }

  if (!process.env.WHATSAPP_ACCESS_TOKEN && process.env.NODE_ENV !== "production") {
    return { success: true }
  }

  const result = await sendWhatsAppTemplate({
    to: formattedPhone,
    templateName: "artistos_welcome",
    languageCode: process.env.WHATSAPP_TEMPLATE_LANG?.trim() || "en",
    bodyParameters: [adminParam],
  })

  return result
}

export interface PersistOtpResult {
  success: boolean
  error?: string
  isLocked?: boolean
  lockedUntil?: Date
  sendCount: number
  canResend: boolean
}

export interface VerifyOtpResult {
  valid: boolean
  reason?: string
  isLocked?: boolean
  needsResend?: boolean
  attemptsRemaining?: number
}

interface MemoryLockoutRecord {
  sendCount: number
  lockedUntil: number | null
  lastSentAt: number
  attempts: number
}

// In-memory fallback tracking so limits work reliably across requests
const memoryLockoutStore = new Map<string, MemoryLockoutRecord>()

function getMemoryLockout(phone: string): MemoryLockoutRecord {
  const existing = memoryLockoutStore.get(phone)
  if (existing) {
    // If 1 hour passed since last session, reset window
    if (Date.now() - existing.lastSentAt > LOCKOUT_DURATION_MS) {
      const resetRecord: MemoryLockoutRecord = {
        sendCount: 0,
        lockedUntil: null,
        lastSentAt: Date.now(),
        attempts: 0,
      }
      memoryLockoutStore.set(phone, resetRecord)
      return resetRecord
    }
    return existing
  }
  const fresh: MemoryLockoutRecord = {
    sendCount: 0,
    lockedUntil: null,
    lastSentAt: Date.now(),
    attempts: 0,
  }
  memoryLockoutStore.set(phone, fresh)
  return fresh
}

/**
 * Checks if a phone number is locked or has reached maximum sends
 */
export async function checkPhoneLockoutStatus(phone: string): Promise<{
  isLocked: boolean
  minutesLeft?: number
  sendCount: number
  canResend: boolean
}> {
  const clean = phone.replace(/\D/g, "").slice(-10)
  const mem = getMemoryLockout(clean)

  if (mem.lockedUntil && mem.lockedUntil > Date.now()) {
    const minutesLeft = Math.max(1, Math.ceil((mem.lockedUntil - Date.now()) / (60 * 1000)))
    return { isLocked: true, minutesLeft, sendCount: mem.sendCount, canResend: false }
  }

  try {
    const supabase = createAdminClient()
    const { data: record } = await supabase
      .from("whatsapp_otps")
      .select("*")
      .eq("phone", clean)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (record) {
      if (record.locked_until && new Date(record.locked_until).getTime() > Date.now()) {
        const lockMs = new Date(record.locked_until).getTime()
        mem.lockedUntil = lockMs
        const minutesLeft = Math.max(1, Math.ceil((lockMs - Date.now()) / (60 * 1000)))
        return { isLocked: true, minutesLeft, sendCount: record.send_count || 2, canResend: false }
      }

      const lastSentMs = new Date(record.last_sent_at || record.created_at).getTime()
      if (Date.now() - lastSentMs > LOCKOUT_DURATION_MS) {
        mem.sendCount = 0
        mem.lockedUntil = null
        return { isLocked: false, sendCount: 0, canResend: true }
      }

      const sendCount = typeof record.send_count === "number" ? record.send_count : mem.sendCount
      return {
        isLocked: false,
        sendCount,
        canResend: sendCount < MAX_OTP_SENDS,
      }
    }
  } catch (err) {
    console.warn("[OTP DB] Error checking lockout status in DB:", err)
  }

  return {
    isLocked: false,
    sendCount: mem.sendCount,
    canResend: mem.sendCount < MAX_OTP_SENDS,
  }
}

/**
 * Saves/updates generated OTP in Supabase whatsapp_otps table using UPDATE / UPSERT.
 * Enforces:
 * 1. 1-hour lockout if locked.
 * 2. Max 2 OTP sends per 1-hour window.
 * 3. Updates single record per phone number.
 */
export async function persistOtpInDatabase(
  phone: string,
  otpHash: string,
  expiresAt: Date
): Promise<PersistOtpResult> {
  const clean = phone.replace(/\D/g, "").slice(-10)
  const mem = getMemoryLockout(clean)

  // 1. Check if currently locked for 1 hour
  if (mem.lockedUntil && mem.lockedUntil > Date.now()) {
    const minutesLeft = Math.max(1, Math.ceil((mem.lockedUntil - Date.now()) / (60 * 1000)))
    return {
      success: false,
      isLocked: true,
      lockedUntil: new Date(mem.lockedUntil),
      sendCount: mem.sendCount,
      canResend: false,
      error: `This mobile number is locked for 1 hour due to multiple failed attempts. Please contact admin or try after ${minutesLeft} minute(s).`,
    }
  }

  // 2. Check 1-hour send window reset
  if (Date.now() - mem.lastSentAt > LOCKOUT_DURATION_MS) {
    mem.sendCount = 0
    mem.lockedUntil = null
    mem.attempts = 0
  }

  // 3. Enforce maximum 2 OTP sends
  if (mem.sendCount >= MAX_OTP_SENDS) {
    return {
      success: false,
      isLocked: false,
      sendCount: mem.sendCount,
      canResend: false,
      error: "Maximum OTP requests reached (2/2). Please contact admin or try again after 1 hour.",
    }
  }

  const nextSendCount = mem.sendCount + 1
  const canResendNext = nextSendCount < MAX_OTP_SENDS

  try {
    const supabase = createAdminClient()

    // Find any existing records for this phone number
    const { data: existingRecords } = await supabase
      .from("whatsapp_otps")
      .select("id, send_count, locked_until, last_sent_at, attempts")
      .eq("phone", clean)
      .order("created_at", { ascending: false })

    if (existingRecords && existingRecords.length > 0) {
      const primaryRecord = existingRecords[0]

      // Check DB-level lockout
      if (primaryRecord.locked_until && new Date(primaryRecord.locked_until).getTime() > Date.now()) {
        const lockMs = new Date(primaryRecord.locked_until).getTime()
        mem.lockedUntil = lockMs
        const minutesLeft = Math.max(1, Math.ceil((lockMs - Date.now()) / (60 * 1000)))
        return {
          success: false,
          isLocked: true,
          lockedUntil: new Date(lockMs),
          sendCount: primaryRecord.send_count || 2,
          canResend: false,
          error: `This mobile number is locked for 1 hour due to multiple failed attempts. Please contact admin or try after ${minutesLeft} minute(s).`,
        }
      }

      // Check DB-level send count window
      const lastSentMs = new Date(primaryRecord.last_sent_at || Date.now()).getTime()
      let dbSendCount = primaryRecord.send_count ?? mem.sendCount
      if (Date.now() - lastSentMs > LOCKOUT_DURATION_MS) {
        dbSendCount = 0
      }

      if (dbSendCount >= MAX_OTP_SENDS) {
        return {
          success: false,
          isLocked: false,
          sendCount: dbSendCount,
          canResend: false,
          error: "Maximum OTP requests reached (2/2). Please contact admin or try again after 1 hour.",
        }
      }

      const finalSendCount = Math.max(nextSendCount, dbSendCount + 1)

      // Try updating existing record with all columns
      const fullUpdate = {
        otp_hash: otpHash,
        expires_at: expiresAt.toISOString(),
        verified: false,
        attempts: 0,
        send_count: finalSendCount,
        locked_until: null,
        last_sent_at: new Date().toISOString(),
      }

      const { error: updateErr } = await supabase
        .from("whatsapp_otps")
        .update(fullUpdate)
        .eq("id", primaryRecord.id)

      if (updateErr) {
        // Fallback for when migrations haven't added send_count / locked_until columns yet
        console.warn("[OTP DB] Update with extended columns failed, falling back to base columns:", updateErr.message)
        await supabase
          .from("whatsapp_otps")
          .update({
            otp_hash: otpHash,
            expires_at: expiresAt.toISOString(),
            verified: false,
            attempts: 0,
          })
          .eq("id", primaryRecord.id)
      }

      // Clean up any older duplicate rows for this phone to maintain single row per phone
      if (existingRecords.length > 1) {
        const duplicateIds = existingRecords.slice(1).map((r) => r.id)
        await supabase.from("whatsapp_otps").delete().in("id", duplicateIds)
      }

      // Sync memory state
      mem.sendCount = finalSendCount
      mem.lastSentAt = Date.now()
      mem.lockedUntil = null
      mem.attempts = 0

      return {
        success: true,
        sendCount: finalSendCount,
        canResend: finalSendCount < MAX_OTP_SENDS,
      }
    } else {
      // First time insert for this phone
      const fullInsert = {
        phone: clean,
        otp_hash: otpHash,
        expires_at: expiresAt.toISOString(),
        verified: false,
        attempts: 0,
        send_count: nextSendCount,
        locked_until: null,
        last_sent_at: new Date().toISOString(),
      }

      const { error: insertErr } = await supabase.from("whatsapp_otps").insert(fullInsert)

      if (insertErr) {
        // Fallback to base columns if migration columns not added yet
        console.warn("[OTP DB] Insert with extended columns failed, falling back to base columns:", insertErr.message)
        await supabase.from("whatsapp_otps").insert({
          phone: clean,
          otp_hash: otpHash,
          expires_at: expiresAt.toISOString(),
          verified: false,
          attempts: 0,
        })
      }

      mem.sendCount = nextSendCount
      mem.lastSentAt = Date.now()
      mem.lockedUntil = null
      mem.attempts = 0

      return {
        success: true,
        sendCount: nextSendCount,
        canResend: canResendNext,
      }
    }
  } catch (err: unknown) {
    console.warn("[OTP DB] Error accessing Supabase for whatsapp_otps:", err)
    // Memory store still recorded the send
    mem.sendCount = nextSendCount
    mem.lastSentAt = Date.now()
    mem.lockedUntil = null
    mem.attempts = 0

    return {
      success: true,
      sendCount: nextSendCount,
      canResend: canResendNext,
    }
  }
}

/**
 * Verifies OTP against Supabase whatsapp_otps table.
 * Enforces:
 * 1. 1-hour lockout check.
 * 2. Max 3 attempts per OTP code.
 * 3. If OTP #1 fails 3 times -> disables OTP and requires Resend.
 * 4. If OTP #2 fails 3 times -> locks phone number for 1 hour.
 */
export async function verifyOtpInDatabase(
  phone: string,
  otp: string
): Promise<VerifyOtpResult> {
  const clean = phone.replace(/\D/g, "").slice(-10)
  const mem = getMemoryLockout(clean)

  // 1. Check in-memory 1-hour lockout
  if (mem.lockedUntil && mem.lockedUntil > Date.now()) {
    const minutesLeft = Math.max(1, Math.ceil((mem.lockedUntil - Date.now()) / (60 * 1000)))
    return {
      valid: false,
      isLocked: true,
      reason: `This mobile number is locked for 1 hour due to multiple failed attempts. Please contact admin or try after ${minutesLeft} minute(s).`,
      attemptsRemaining: 0,
    }
  }

  try {
    const supabase = createAdminClient()
    const { data: record, error } = await supabase
      .from("whatsapp_otps")
      .select("*")
      .eq("phone", clean)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      console.warn("[OTP DB] Query failed:", error.message)
      return { valid: false, reason: "db_error" }
    }

    if (!record) {
      return { valid: false, reason: "No active OTP found. Please request a new OTP." }
    }

    // Check DB-level lockout
    if (record.locked_until && new Date(record.locked_until).getTime() > Date.now()) {
      const lockMs = new Date(record.locked_until).getTime()
      mem.lockedUntil = lockMs
      const minutesLeft = Math.max(1, Math.ceil((lockMs - Date.now()) / (60 * 1000)))
      return {
        valid: false,
        isLocked: true,
        reason: `This mobile number is locked for 1 hour due to multiple failed attempts. Please contact admin or try after ${minutesLeft} minute(s).`,
        attemptsRemaining: 0,
      }
    }

    // Check expiry
    if (new Date(record.expires_at).getTime() < Date.now()) {
      return { valid: false, reason: "OTP has expired. Please request a new one." }
    }

    const currentSendCount = typeof record.send_count === "number" ? record.send_count : Math.max(1, mem.sendCount)
    const currentAttempts = typeof record.attempts === "number" ? record.attempts : mem.attempts

    // Check if attempts already reached limit on this OTP
    if (currentAttempts >= MAX_ATTEMPTS_PER_OTP) {
      if (currentSendCount >= MAX_OTP_SENDS) {
        // Already exhausted 2nd OTP -> 1 hour lockout
        const lockUntilMs = Date.now() + LOCKOUT_DURATION_MS
        mem.lockedUntil = lockUntilMs
        return {
          valid: false,
          isLocked: true,
          reason: "Too many failed attempts (3/3 on both OTPs). This mobile number is locked for 1 hour. Please contact admin or try after 1 hour.",
          attemptsRemaining: 0,
        }
      } else {
        // 1st OTP exhausted -> Prompt to resend
        return {
          valid: false,
          needsResend: true,
          reason: "3 incorrect attempts. This OTP is disabled. Please click 'Resend OTP' to request a new code.",
          attemptsRemaining: 0,
        }
      }
    }

    const inputHash = hashOtp(otp)

    // Compare Hash
    if (inputHash !== record.otp_hash) {
      const newAttempts = currentAttempts + 1
      mem.attempts = newAttempts

      if (newAttempts >= MAX_ATTEMPTS_PER_OTP) {
        if (currentSendCount >= MAX_OTP_SENDS) {
          // BOTH OTPs exhausted all 3 attempts! LOCK NUMBER FOR 1 HOUR!
          const lockUntil = new Date(Date.now() + LOCKOUT_DURATION_MS)
          mem.lockedUntil = lockUntil.getTime()

          // Update DB with lock
          try {
            await supabase
              .from("whatsapp_otps")
              .update({
                attempts: newAttempts,
                locked_until: lockUntil.toISOString(),
              })
              .eq("id", record.id)
          } catch {
            await supabase
              .from("whatsapp_otps")
              .update({ attempts: newAttempts })
              .eq("id", record.id)
          }

          return {
            valid: false,
            isLocked: true,
            reason: "Too many failed attempts (3/3 on both OTPs). This mobile number is locked for 1 hour. Please contact admin or try after 1 hour.",
            attemptsRemaining: 0,
          }
        } else {
          // 1st OTP exhausted all 3 attempts -> disable OTP and prompt Resend
          await supabase
            .from("whatsapp_otps")
            .update({ attempts: newAttempts })
            .eq("id", record.id)

          return {
            valid: false,
            needsResend: true,
            reason: "Incorrect OTP. You have exhausted all 3 attempts for this code. Please click 'Resend OTP' to request a new code.",
            attemptsRemaining: 0,
          }
        }
      } else {
        // 1 or 2 attempts failed
        await supabase
          .from("whatsapp_otps")
          .update({ attempts: newAttempts })
          .eq("id", record.id)

        const remaining = MAX_ATTEMPTS_PER_OTP - newAttempts
        return {
          valid: false,
          attemptsRemaining: remaining,
          reason: `Incorrect OTP. ${remaining} attempt${remaining > 1 ? "s" : ""} remaining.`,
        }
      }
    }

    // Correct OTP verified!
    mem.attempts = 0
    mem.lockedUntil = null
    await supabase
      .from("whatsapp_otps")
      .update({
        verified: true,
        attempts: 0,
      })
      .eq("id", record.id)

    return { valid: true }
  } catch (err) {
    console.warn("[OTP DB] Exception verifying in DB:", err)
    return { valid: false, reason: "db_error" }
  }
}

export { OTP_COOLDOWN_SECONDS, OTP_EXPIRY_MINUTES }

