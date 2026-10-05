import { type NextRequest } from "next/server"

import { checkIsReadOnly } from "@/lib/auth/subscription"
import { getArtistSession } from "@/lib/auth/session"
import {
  findOrCreateBookingFolder,
  findOrCreateDefaultPortfolioFolder,
} from "@/lib/portfolio/folders"
import {
  confirmFileUpload,
  overwriteFileInR2,
  prepareUploadKey,
  validateUpload,
} from "@/lib/portfolio/files"
import { getOrCreateQuota as fetchQuota, QuotaService } from "@/lib/portfolio/quota"
import { portfolioError, portfolioSuccess } from "@/lib/portfolio/response"
import { sanitizeFilename, validateMagicBytes } from "@/lib/portfolio/security"
import { createClient } from "@/lib/supabase/server"

const VALID_SECTIONS = new Set(["reference", "delivery"])

export async function POST(request: NextRequest) {
  const session = getArtistSession(request)
  if (!session) return portfolioError("Unauthorized", 401)

  const formData = await request.formData()
  const file = formData.get("file")
  const folderIdValue = formData.get("folder_id")
  const bookingIdValue = formData.get("booking_id")
  const rawSection = formData.get("section")
  const setAsAvatar = formData.get("set_as_avatar") === "true"
  const setAsStudioLogo = formData.get("set_as_studio_logo") === "true"

  if (!(file instanceof File)) return portfolioError("File is required", 400)

  // 1. Basic size and MIME type validation
  const mimeType = file.type || "application/octet-stream"
  const validationError = validateUpload(mimeType, file.size)
  if (validationError) return portfolioError(validationError, 400)

  // 2. Section validation
  const section = rawSection ? String(rawSection).toLowerCase().trim() : null
  if (section && !VALID_SECTIONS.has(section)) {
    return portfolioError("Invalid section specified", 400)
  }

  // 3. Reference images must strictly be image files
  if (section === "reference" && !mimeType.startsWith("image/")) {
    return portfolioError("Reference images must be valid image files", 400)
  }

  // 4. Sanitize file name to prevent directory traversal and XSS
  const safeFileName = sanitizeFilename(file.name)

  // 5. Read buffer and validate magic bytes against claimed MIME type
  const buffer = Buffer.from(await file.arrayBuffer())
  if (!validateMagicBytes(buffer, mimeType)) {
    return portfolioError("File content does not match the declared file type", 400)
  }

  const supabase = await createClient()

  // 6. Check subscription status
  if (await checkIsReadOnly(supabase, session.id)) {
    return portfolioError("Your subscription has expired. Please upgrade to upload files.", 403)
  }

  try {
    // 7. Enforce storage quota on server
    const quotaRow = await fetchQuota(supabase, session.id)
    const quota = QuotaService.fromRow(quotaRow)
    const check = quota.canUpload(file.size)
    if (!check.allowed) {
      return portfolioError(check.reason ?? "Storage quota exceeded", 402)
    }

    let folderId = folderIdValue ? Number(folderIdValue) : null
    const bookingId = bookingIdValue ? Number(bookingIdValue) : null

    // 8. Strict booking ownership verification
    if (bookingId) {
      const { data: bookingCheck, error: bookingErr } = await supabase
        .from("bookings")
        .select("id")
        .eq("id", bookingId)
        .eq("user_id", session.id)
        .maybeSingle()

      if (bookingErr || !bookingCheck) {
        return portfolioError("Booking not found or access denied", 403)
      }

      if (!folderId) {
        const folder = await findOrCreateBookingFolder(supabase, session.id, bookingId)
        folderId = folder.id
      }
    }

    if (!folderId) {
      const folder = await findOrCreateDefaultPortfolioFolder(supabase, session.id)
      folderId = folder.id
    }

    // 9. Verify folder belongs to user
    const { data: folderCheck } = await supabase
      .from("portfolio_folders")
      .select("id")
      .eq("id", folderId)
      .eq("user_id", session.id)
      .maybeSingle()

    if (!folderCheck) return portfolioError("Folder not found or access denied", 404)

    // 10. For reference photos in a booking, enforce max 3 items
    if (section === "reference") {
      const { count } = await supabase
        .from("portfolio_files")
        .select("*", { count: "exact", head: true })
        .eq("folder_id", folderId)
        .eq("section", "reference")

      if ((count ?? 0) >= 3) {
        return portfolioError("Maximum of 3 reference images allowed per booking", 400)
      }
    }

    // 11. Secure randomized UUID storage key
    const { key, extension } = prepareUploadKey(session.id, folderId, safeFileName)

    // 12. Upload to Cloudflare R2
    await overwriteFileInR2(key, buffer, mimeType)

    // 13. Confirm upload in database
    const uploaded = await confirmFileUpload(supabase, {
      userId: session.id,
      folderId,
      storagePath: key,
      originalName: safeFileName,
      mimeType,
      extension,
      fileSize: file.size,
      section,
    })

    if (setAsAvatar) {
      await supabase
        .from("users")
        .update({ avatar_file_id: uploaded.id })
        .eq("id", session.id)
    }

    if (setAsStudioLogo) {
      await supabase
        .from("users")
        .update({ studio_logo_file_id: uploaded.id })
        .eq("id", session.id)
    }

    return portfolioSuccess("File uploaded successfully", { file: uploaded }, 201)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed"
    const status = message.includes("quota") || message.includes("expired") ? 402 : 500
    return portfolioError(message, status)
  }
}
