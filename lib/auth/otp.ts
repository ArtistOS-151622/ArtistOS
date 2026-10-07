import { createHmac, createHash, timingSafeEqual, randomBytes } from "crypto"
import { sendWhatsAppTemplate, formatWhatsAppPhoneNumber, type WhatsAppSendResult } from "../whatsapp/client.ts"
import { createAdminClient } from "../supabase/admin.ts"

const OTP_EXPIRY_MINUTES = 10
const OTP_COOLDOWN_SECONDS = 30
const MAX_OTP_ATTEMPTS = 5

export const TEST_USER_OTP = "123456"

export async function isTestUser(phone: string, existingSupabase?: any): Promise<boolean> {
  if (!phone) return false
  const clean = phone.replace(/\D/g, "").slice(-10)
  if (clean.length !== 10) return false

  try {
    const supabase = existingSupabase || createAdminClient()
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
  // Generates a cryptographically strong 6-digit number
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


  // Exact parameter requirement: "your OTP is: {{actual otp}}"
  const customerNameParam = `your OTP is: ${otp}`

  console.log(`[WhatsApp OTP] Dispatching template "artistos_welcome" to ${formattedPhone} with param: "${customerNameParam}"`)

  const result = await sendWhatsAppTemplate({
    to: formattedPhone,
    templateName: "artistos_welcome",
    languageCode: process.env.WHATSAPP_TEMPLATE_LANG?.trim() || "en",
    bodyParameters: [customerNameParam],
  })

  // For testing / local dev visibility, print OTP to server logs
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

  // Exact requested format: "this is admin otp for delete artist: {{otp}}"
  const adminParam = `this is admin otp for delete artist: ${otp}`

  console.log(`[Admin OTP] Dispatching template "artistos_welcome" to ${formattedPhone} with param: "${adminParam}"`)

  if (process.env.NODE_ENV !== "production") {
    console.log(`\n========================================`)
    console.log(`[DEV / ADMIN] WhatsApp Delete OTP for ${ADMIN_SECURITY_PHONE}: ${otp}`)
    console.log(`Param: "${adminParam}"`)
    console.log(`========================================\n`)
  }

  // If token is missing in development, allow dev flow to continue without breaking
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

/**
 * Saves generated OTP to Supabase whatsapp_otps table if available
 */
export async function persistOtpInDatabase(phone: string, otpHash: string, expiresAt: Date): Promise<boolean> {
  try {
    const supabase = createAdminClient()
    const { error } = await supabase.from("whatsapp_otps").insert({
      phone,
      otp_hash: otpHash,
      expires_at: expiresAt.toISOString(),
      verified: false,
      attempts: 0,
    })

    if (error) {
      console.warn("[OTP DB] Failed to insert into whatsapp_otps (falling back to signed token):", error.message)
      return false
    }

    return true
  } catch (err) {
    console.warn("[OTP DB] Error accessing Supabase for whatsapp_otps:", err)
    return false
  }
}

/**
 * Verifies OTP against Supabase whatsapp_otps table
 */
export async function verifyOtpInDatabase(phone: string, otp: string): Promise<{ valid: boolean; reason?: string }> {
  try {
    const supabase = createAdminClient()
    const { data: record, error } = await supabase
      .from("whatsapp_otps")
      .select("*")
      .eq("phone", phone)
      .eq("verified", false)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      console.warn("[OTP DB] Query failed (will check signed token fallback):", error.message)
      return { valid: false, reason: "db_error" }
    }

    if (!record) {
      return { valid: false, reason: "No active OTP found. Please request a new OTP." }
    }

    if (new Date(record.expires_at).getTime() < Date.now()) {
      return { valid: false, reason: "OTP has expired. Please request a new one." }
    }

    if (record.attempts >= MAX_OTP_ATTEMPTS) {
      return { valid: false, reason: "Maximum verification attempts exceeded. Please request a new OTP." }
    }

    const inputHash = hashOtp(otp)
    if (inputHash !== record.otp_hash) {
      await supabase
        .from("whatsapp_otps")
        .update({ attempts: record.attempts + 1 })
        .eq("id", record.id)

      const remaining = MAX_OTP_ATTEMPTS - (record.attempts + 1)
      return {
        valid: false,
        reason: remaining > 0 ? `Incorrect OTP. ${remaining} attempt${remaining > 1 ? "s" : ""} remaining.` : "Incorrect OTP. Maximum attempts exceeded.",
      }
    }

    // Mark as verified
    await supabase.from("whatsapp_otps").update({ verified: true }).eq("id", record.id)
    return { valid: true }
  } catch (err) {
    console.warn("[OTP DB] Exception verifying in DB:", err)
    return { valid: false, reason: "db_error" }
  }
}

export { OTP_COOLDOWN_SECONDS, OTP_EXPIRY_MINUTES }
