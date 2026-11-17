import { createHash, randomBytes } from "node:crypto"

import { createAdminClient, createDbClient } from "#src/integrations/supabase.js"
import {
  createRegistrationToken,
  generate6DigitOtp,
  hashOtp,
  isTestUser,
  OTP_COOLDOWN_SECONDS,
  OTP_EXPIRY_MINUTES,
  persistOtpInDatabase,
  sendOtpToWhatsApp,
  TEST_USER_OTP,
  verifyOtpInDatabase,
  createOtpStateToken,
  verifyRegistrationToken,
} from "#src/shared/otp.js"
import { DEFAULT_PORTFOLIO_FOLDER_NAME, STORAGE_FREE_TIER_BYTES } from "#src/shared/portfolio/config.js"
import { confirmFileUpload, getFileUrlsById, overwriteFileInR2, prepareUploadKey } from "#src/shared/portfolio/files.js"
import { ApiError, badRequest, unauthorized } from "#src/utils/api-error.js"
import { logger } from "#src/utils/logger.js"
import { createArtistToken } from "#src/utils/session-token.js"

const log = logger.child({ module: "auth" })

const UNDEFINED_TABLE = "42P01"
const DATA_URL_PATTERN = /^data:([a-zA-Z0-9-+/]+);base64,(.+)$/

/** The session payload stored in the token (and returned to the client). */
export const toSession = (user) => ({
  id: user.id,
  phone: user.phone,
  artist_name: user.artist_name,
  studio_name: user.studio_name,
})

/**
 * Sends a WhatsApp OTP (test accounts get the fixed test code and no message).
 * → { success, message, stateToken, cooldownSeconds, sendCount, canResend }
 */
export async function sendOtp(phone) {
  const testUser = await isTestUser(phone)
  const otp = testUser ? TEST_USER_OTP : generate6DigitOtp()
  const otpHash = hashOtp(otp)
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000)

  const persisted = await persistOtpInDatabase(phone, otpHash, expiresAt)
  if (!persisted.success) {
    throw new ApiError(persisted.isLocked ? 429 : 400, persisted.error || "Unable to send OTP at this time.", {
      extra: { isLocked: persisted.isLocked, canResend: persisted.canResend, sendCount: persisted.sendCount },
    })
  }

  if (testUser) {
    log.info("test account: OTP dispatch skipped")
  } else {
    const sent = await sendOtpToWhatsApp(phone, otp)
    if (!sent.success) {
      log.error("WhatsApp OTP delivery failed")
      throw new ApiError(
        500,
        sent.error ||
          "Failed to send OTP via WhatsApp. Please ensure your WhatsApp number is active and try again."
      )
    }
  }

  return {
    success: true,
    message: testUser
      ? "Test account detected. Please enter your test OTP."
      : "OTP sent successfully to your WhatsApp.",
    stateToken: createOtpStateToken(phone, otpHash, expiresAt.getTime()),
    cooldownSeconds: OTP_COOLDOWN_SECONDS,
    sendCount: persisted.sendCount,
    canResend: persisted.canResend,
  }
}

/**
 * Checks the OTP. Existing artists with a complete profile get a session
 * ({ token, body }); new users get a registration token to finish their profile.
 *
 * Note: the Next.js route also had a "fall back to the signed stateToken when the
 * database errors" branch, but it compared against a reason string the database
 * layer never returns, so it never ran. Not ported (see the plan's porting notes).
 */
export async function verifyOtp(phone, otp) {
  const supabase = createAdminClient()
  const { data: user, error: userError } = await supabase.from("users").select("*").eq("phone", phone).maybeSingle()

  if (userError && userError.code !== UNDEFINED_TABLE) {
    log.error({ code: userError.code }, "user lookup failed")
    throw new ApiError(500, "Failed to verify account records. Please try again.")
  }

  if (user?.is_test_user) {
    if (otp !== TEST_USER_OTP) {
      throw new ApiError(400, "Invalid OTP for test account.", {
        extra: { isLocked: false, needsResend: false, attemptsRemaining: undefined },
      })
    }
  } else {
    const result = await verifyOtpInDatabase(phone, otp)
    if (!result.valid) {
      const isLocked = Boolean(result.isLocked)
      throw new ApiError(
        isLocked ? 429 : 400,
        result.reason || "Invalid or expired OTP. Please check the code and try again.",
        { extra: { isLocked, needsResend: Boolean(result.needsResend), attemptsRemaining: result.attemptsRemaining } }
      )
    }
  }

  if (user && user.artist_name && user.studio_name) {
    const session = toSession(user)
    const token = createArtistToken(session)
    return { token, body: { success: true, isNewUser: false, redirectUrl: "/dashboard", user: session, token } }
  }

  return {
    token: null,
    body: { success: true, isNewUser: true, registrationToken: createRegistrationToken(phone), phone },
  }
}

async function uploadStudioLogo(supabase, userId, folderId, dataUrl) {
  const match = dataUrl.match(DATA_URL_PATTERN)
  if (!match) return

  const mimeType = match[1]
  const buffer = Buffer.from(match[2], "base64")
  const filename = `studio-logo.${mimeType.split("/")[1] || "jpeg"}`

  try {
    const { key, extension } = prepareUploadKey(userId, folderId, filename)
    await overwriteFileInR2(key, buffer, mimeType)
    const uploaded = await confirmFileUpload(supabase, {
      userId,
      folderId,
      storagePath: key,
      originalName: filename,
      mimeType,
      extension,
      fileSize: buffer.length,
    })
    await supabase.from("users").update({ studio_logo_file_id: uploaded.id }).eq("id", userId)
  } catch (err) {
    // The profile is saved either way; a failed logo upload is not fatal.
    log.error({ err, userId }, "failed to upload studio logo")
  }
}

/**
 * Completes signup after OTP: creates (or updates) the artist, their storage quota,
 * the default portfolio folder, and optionally the studio logo. → { token, body }
 */
export async function registerProfile({ registrationToken, artistName, studioName, address, email, studioLogo }) {
  if (!registrationToken) {
    throw unauthorized("Verification token missing. Please verify your mobile number with OTP first.")
  }
  const tokenData = verifyRegistrationToken(registrationToken)
  if (!tokenData) throw unauthorized("Verification session has expired. Please verify your mobile number again.")

  if (!artistName?.trim() || !studioName?.trim() || !address?.trim()) {
    throw badRequest("Artist name, studio name, and address are required.")
  }

  const { phone } = tokenData
  const supabase = createAdminClient()
  const profile = {
    artist_name: artistName.trim(),
    studio_name: studioName.trim(),
    address: address.trim(),
    email: email?.trim() || null,
  }

  const { data: existingUser } = await supabase.from("users").select("id").eq("phone", phone).maybeSingle()

  let user
  if (existingUser) {
    const { data, error } = await supabase.from("users").update(profile).eq("id", existingUser.id).select().single()
    if (error) throw badRequest(error.message)
    user = data
  } else {
    // users.password is varchar(64) NOT NULL; OTP accounts get an unusable random hash.
    const passwordHash = createHash("sha256").update(randomBytes(32).toString("hex")).digest("hex")
    const { data, error } = await supabase
      .from("users")
      .insert({ phone, password: passwordHash, ...profile })
      .select()
      .single()
    if (error) throw badRequest(error.message)
    user = data
  }

  await supabase
    .from("portfolio_storage_quotas")
    .upsert({ user_id: user.id, free_storage_bytes: STORAGE_FREE_TIER_BYTES })
    .select()

  const { data: existingFolder } = await supabase
    .from("portfolio_folders")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle()

  let defaultFolder = existingFolder
  if (!defaultFolder) {
    const { data: newFolder } = await supabase
      .from("portfolio_folders")
      .insert({ user_id: user.id, name: DEFAULT_PORTFOLIO_FOLDER_NAME, created_by: user.id })
      .select()
      .single()
    defaultFolder = newFolder
  }

  if (studioLogo && defaultFolder) await uploadStudioLogo(supabase, user.id, defaultFolder.id, studioLogo)

  const session = toSession(user)
  const token = createArtistToken(session)
  return { token, body: { success: true, user: session, token, redirectUrl: "/dashboard" } }
}

/** Session plus avatar/logo URLs; falls back to the bare session if the lookup fails. */
export async function getCurrentUser(session) {
  try {
    const supabase = createDbClient()
    const { data: user } = await supabase
      .from("users")
      .select("avatar_file_id, studio_logo_file_id")
      .eq("id", session.id)
      .maybeSingle()

    const urls = await getFileUrlsById(supabase, [user?.avatar_file_id, user?.studio_logo_file_id])
    return {
      user: {
        ...session,
        avatar_url: (user?.avatar_file_id && urls.get(user.avatar_file_id)) ?? null,
        studio_logo_url: (user?.studio_logo_file_id && urls.get(user.studio_logo_file_id)) ?? null,
      },
    }
  } catch (err) {
    log.warn({ err }, "failed to load avatar/logo; returning bare session")
    return { user: session }
  }
}
