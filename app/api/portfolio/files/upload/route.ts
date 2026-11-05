import { type NextRequest } from "next/server"

import { checkIsReadOnly } from "@/lib/auth/subscription"
import { getArtistSession } from "@/lib/auth/session"
import {
  findOrCreateBookingFolder,
  findOrCreateCourseFolder,
  findOrCreateDefaultPortfolioFolder,
} from "@/lib/portfolio/folders"
import {
  deleteFromR2,
  getNextSortOrder,
  insertFileRecord,
  overwriteFileInR2,
  prepareUploadKey,
  validateUpload,
} from "@/lib/portfolio/files"
import { getOrCreateQuota as fetchQuota, incrementUsage, QuotaService } from "@/lib/portfolio/quota"
import { portfolioError, portfolioSuccess } from "@/lib/portfolio/response"
import { sanitizeFilename, validateMagicBytes } from "@/lib/portfolio/security"
import { createClient } from "@/lib/supabase/server"

const VALID_SECTIONS = new Set(["reference", "delivery", "course"])

export async function POST(request: NextRequest) {
  const session = getArtistSession(request)
  if (!session) return portfolioError("Unauthorized", 401)

  const formData = await request.formData()
  const file = formData.get("file")
  const folderIdValue = formData.get("folder_id")
  const bookingIdValue = formData.get("booking_id")
  const courseIdValue = formData.get("course_id")
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
  if ((section === "reference" || section === "course") && !mimeType.startsWith("image/")) {
    return portfolioError("Reference and course files must be valid image files", 400)
  }

  // 4. Sanitize file name to prevent directory traversal and XSS
  const safeFileName = sanitizeFilename(file.name)

  // 5. Read buffer and validate magic bytes against claimed MIME type
  const buffer = Buffer.from(await file.arrayBuffer())
  if (!validateMagicBytes(buffer, mimeType)) {
    return portfolioError("File content does not match the declared file type", 400)
  }

  const supabase = await createClient()

  let folderId = folderIdValue ? Number(folderIdValue) : null
  const bookingId = bookingIdValue ? Number(bookingIdValue) : null
  const courseId = courseIdValue ? Number(courseIdValue) : null

  // 6. Independent checks in ONE parallel round (they used to run one after another):
  //    subscription, storage quota, booking / course / folder ownership.
  //    Results are still evaluated in the original order below.
  const [isReadOnly, quotaResult, bookingRes, courseRes, providedFolderRes] = await Promise.all([
    checkIsReadOnly(supabase, session.id),
    // Captured instead of thrown so a quota error can't hide the subscription check
    fetchQuota(supabase, session.id).then(
      (row) => ({ row, error: null as unknown }),
      (error: unknown) => ({ row: null, error }),
    ),
    bookingId
      ? supabase.from("bookings").select("id").eq("id", bookingId).eq("user_id", session.id).maybeSingle()
      : null,
    courseId
      ? supabase.from("courses").select("id, name").eq("id", courseId).eq("user_id", session.id).maybeSingle()
      : null,
    folderId
      ? supabase.from("portfolio_folders").select("id").eq("id", folderId).eq("user_id", session.id).maybeSingle()
      : null,
  ])

  if (isReadOnly) {
    return portfolioError("Your subscription has expired. Please upgrade to upload files.", 403)
  }

  try {
    // 7. Enforce storage quota on server
    if (quotaResult.error || !quotaResult.row) throw quotaResult.error ?? new Error("Upload failed")
    const quota = QuotaService.fromRow(quotaResult.row)
    const check = quota.canUpload(file.size)
    if (!check.allowed) {
      return portfolioError(check.reason ?? "Storage quota exceeded", 402)
    }

    // 8. Strict booking ownership verification
    if (bookingId && (!bookingRes || bookingRes.error || !bookingRes.data)) {
      return portfolioError("Booking not found or access denied", 403)
    }

    // 9. Strict course ownership verification
    if (courseId && (!courseRes || courseRes.error || !courseRes.data)) {
      return portfolioError("Course not found or access denied", 403)
    }

    // 10. Verify a client-supplied folder belongs to the user
    if (folderId && !providedFolderRes?.data) {
      return portfolioError("Folder not found or access denied", 404)
    }

    // 11. Resolve the target folder when none was given (booking > course > default).
    //     These helpers only find or create folders owned by this user, so no
    //     separate ownership check is needed for the folder they return.
    if (!folderId) {
      if (bookingId) {
        folderId = (await findOrCreateBookingFolder(supabase, session.id, bookingId)).id
      } else if (courseId && courseRes?.data) {
        folderId = (await findOrCreateCourseFolder(supabase, session.id, courseId, courseRes.data.name)).id
      } else {
        folderId = (await findOrCreateDefaultPortfolioFolder(supabase, session.id)).id
      }
    }
    const targetFolderId = folderId

    // 12. In parallel: the "max 3 reference/course images" count and the next sort position
    const limitSection = section === "reference" || section === "course"
    const [sectionCountRes, sortOrder] = await Promise.all([
      limitSection
        ? supabase
            .from("portfolio_files")
            .select("*", { count: "exact", head: true })
            .eq("folder_id", targetFolderId)
            .eq("section", section)
        : null,
      getNextSortOrder(supabase, targetFolderId),
    ])

    if (limitSection && (sectionCountRes?.count ?? 0) >= 3) {
      return portfolioError(`Maximum of 3 ${section} images allowed`, 400)
    }

    // 13. Secure randomized UUID storage key
    const { key, extension } = prepareUploadKey(session.id, targetFolderId, safeFileName)

    // 14. Upload to Cloudflare R2 and, at the same time, re-check the quota with fresh
    //     numbers (other uploads may have finished meanwhile). This is the same re-check
    //     confirmFileUpload does after the upload, just overlapped with it.
    const [, freshQuotaRow] = await Promise.all([
      overwriteFileInR2(key, buffer, mimeType),
      fetchQuota(supabase, session.id),
    ])
    const freshCheck = QuotaService.fromRow(freshQuotaRow).canUpload(file.size)
    if (!freshCheck.allowed) {
      // Don't leave the uploaded object behind when the upload is rejected
      await deleteFromR2([key]).catch(() => {})
      throw new Error(freshCheck.reason ?? "Upload not allowed")
    }

    // 15. Record the file, then add its size to used storage
    const uploaded = await insertFileRecord(supabase, {
      userId: session.id,
      folderId: targetFolderId,
      storagePath: key,
      originalName: safeFileName,
      mimeType,
      extension,
      fileSize: file.size,
      section,
      sortOrder,
    })
    await incrementUsage(supabase, session.id, file.size)

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
