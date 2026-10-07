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


/**
 * Checks if a phone number is locked or has reached maximum sends directly from database.
 */
export async function checkPhoneLockoutStatus(phone: string): Promise<{
  isLocked: boolean
  minutesLeft?: number
  sendCount: number
  canResend: boolean
}> {
  const clean = phone.replace(/\D/g, "").slice(-10)

  try {
    const supabase = createAdminClient()
    const { data: record, error } = await supabase
      .from("whatsapp_otps")
      .select("send_count, locked_until, last_sent_at")
      .eq("phone", clean)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error || !record) {
      return { isLocked: false, sendCount: 0, canResend: true }
    }

    if (record.locked_until && new Date(record.locked_until).getTime() > Date.now()) {
      const lockMs = new Date(record.locked_until).getTime()
      const minutesLeft = Math.max(1, Math.ceil((lockMs - Date.now()) / (60 * 1000)))
      return { isLocked: true, minutesLeft, sendCount: record.send_count || 2, canResend: false }
    }

    const lastSentMs = new Date(record.last_sent_at || Date.now()).getTime()
    if (Date.now() - lastSentMs > LOCKOUT_DURATION_MS) {
      return { isLocked: false, sendCount: 0, canResend: true }
    }

    const sendCount = typeof record.send_count === "number" ? record.send_count : 1
    return {
      isLocked: false,
      sendCount,
      canResend: sendCount < MAX_OTP_SENDS,
    }
  } catch {
    return { isLocked: false, sendCount: 0, canResend: true }
  }
}

export async function clearPhoneLockout(phone: string): Promise<void> {
  const clean = phone.replace(/\D/g, "").slice(-10)
  try {
    const supabase = createAdminClient()
    await supabase.from("whatsapp_otps").delete().eq("phone", clean)
  } catch {}
}

/**
 * Saves/updates generated OTP in Supabase whatsapp_otps table using UPDATE / UPSERT.
 * 100% Database-driven. Zero in-memory state.
 * Enforces:
 * 1. Database is the SOLE source of truth (clearing or deleting DB row immediately resets status).
 * 2. 1-hour lockout if locked_until > now().
 * 3. Max 2 OTP sends per 1-hour window (1 initial send + 1 resend).
 * 4. Single row per phone number (updates existing record, clears duplicates if any).
 */
export async function persistOtpInDatabase(
  phone: string,
  otpHash: string,
  expiresAt: Date
): Promise<PersistOtpResult> {
  const clean = phone.replace(/\D/g, "").slice(-10)

  try {
    const supabase = createAdminClient()

    // Query Supabase directly (DB is the sole source of truth)
    const { data: existingRecords, error: queryErr } = await supabase
      .from("whatsapp_otps")
      .select("id, send_count, locked_until, last_sent_at, attempts")
      .eq("phone", clean)
      .order("created_at", { ascending: false })

    if (queryErr) {
      console.warn("[OTP DB] Error querying whatsapp_otps:", queryErr.message)
    }

    if (existingRecords && existingRecords.length > 0) {
      const primaryRecord = existingRecords[0]

      // 1. Check DB-level lockout
      if (primaryRecord.locked_until && new Date(primaryRecord.locked_until).getTime() > Date.now()) {
        const lockMs = new Date(primaryRecord.locked_until).getTime()
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

      // 2. Check 1-hour window for send_count
      const lastSentMs = new Date(primaryRecord.last_sent_at || Date.now()).getTime()
      let dbSendCount = typeof primaryRecord.send_count === "number" ? primaryRecord.send_count : 0
      if (Date.now() - lastSentMs > LOCKOUT_DURATION_MS) {
        dbSendCount = 0 // 1 hour has passed, reset counter
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

      const finalSendCount = dbSendCount + 1

      // 3. Update existing record
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

      return {
        success: true,
        sendCount: finalSendCount,
        canResend: finalSendCount < MAX_OTP_SENDS,
      }
    } else {
      // First time insert for this phone
      const nextSendCount = 1
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
        console.warn("[OTP DB] Insert with extended columns failed, falling back to base columns:", insertErr.message)
        await supabase.from("whatsapp_otps").insert({
          phone: clean,
          otp_hash: otpHash,
          expires_at: expiresAt.toISOString(),
          verified: false,
          attempts: 0,
        })
      }

      return {
        success: true,
        sendCount: nextSendCount,
        canResend: true,
      }
    }
  } catch (err: unknown) {
    console.error("[OTP DB] Error accessing Supabase for whatsapp_otps:", err)
    return {
      success: false,
      error: "Database error while storing OTP. Please try again.",
      sendCount: 0,
      canResend: false,
    }
  }
}

/**
 * Verifies OTP strictly against Supabase whatsapp_otps table.
 * 100% Database-driven. Zero in-memory state.
 * Enforces:
 * 1. 1-hour lockout check from DB locked_until.
 * 2. Max 3 attempts per OTP code.
 * 3. If OTP #1 fails 3 times -> disables OTP and requires Resend.
 * 4. If OTP #2 fails 3 times -> locks phone number for 1 hour in DB.
 */
export async function verifyOtpInDatabase(
  phone: string,
  otp: string
): Promise<VerifyOtpResult> {
  const clean = phone.replace(/\D/g, "").slice(-10)

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
      return { valid: false, reason: "Database error. Please try again." }
    }

    if (!record) {
      return { valid: false, reason: "No active OTP found. Please request a new OTP." }
    }

    // 1. Check DB-level lockout
    if (record.locked_until && new Date(record.locked_until).getTime() > Date.now()) {
      const lockMs = new Date(record.locked_until).getTime()
      const minutesLeft = Math.max(1, Math.ceil((lockMs - Date.now()) / (60 * 1000)))
      return {
        valid: false,
        isLocked: true,
        reason: `This mobile number is locked for 1 hour due to multiple failed attempts. Please contact admin or try after ${minutesLeft} minute(s).`,
        attemptsRemaining: 0,
      }
    }

    // 2. Check expiry
    if (new Date(record.expires_at).getTime() < Date.now()) {
      return { valid: false, reason: "OTP has expired. Please request a new one." }
    }

    const currentSendCount = typeof record.send_count === "number" ? record.send_count : 1
    const currentAttempts = typeof record.attempts === "number" ? record.attempts : 0

    // 3. Check if attempts already reached limit on this OTP
    if (currentAttempts >= MAX_ATTEMPTS_PER_OTP) {
      if (currentSendCount >= MAX_OTP_SENDS) {
        // Already exhausted 2nd OTP -> 1 hour lockout in DB
        const lockUntil = new Date(Date.now() + LOCKOUT_DURATION_MS)
        await supabase
          .from("whatsapp_otps")
          .update({ locked_until: lockUntil.toISOString() })
          .eq("id", record.id)

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

    // 4. Compare Hash
    if (inputHash !== record.otp_hash) {
      const newAttempts = currentAttempts + 1

      if (newAttempts >= MAX_ATTEMPTS_PER_OTP) {
        if (currentSendCount >= MAX_OTP_SENDS) {
          // BOTH OTPs exhausted all 3 attempts! LOCK NUMBER FOR 1 HOUR IN DB!
          const lockUntil = new Date(Date.now() + LOCKOUT_DURATION_MS)

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

    // 5. Correct OTP verified!
    await supabase
      .from("whatsapp_otps")
      .update({
        verified: true,
        attempts: 0,
        locked_until: null,
      })
      .eq("id", record.id)

    return { valid: true }
  } catch (err) {
    console.warn("[OTP DB] Exception verifying in DB:", err)
    return { valid: false, reason: "Database error during verification. Please try again." }
  }
}

export { OTP_COOLDOWN_SECONDS, OTP_EXPIRY_MINUTES }

