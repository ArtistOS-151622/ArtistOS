import { ZipArchive } from "archiver"
import sharp from "sharp"

import { createDbClient } from "#src/integrations/supabase.js"
import { sanitizeFilename, validateMagicBytes } from "#src/modules/portfolio/security.js"
import {
  createPresignedDownloadUrl,
  deleteFileRecord,
  deleteFilesBulk,
  deleteFromR2,
  getNextSortOrder,
  getObjectBuffer,
  getObjectStream,
  insertFileRecord,
  overwriteFileInR2,
  prepareUploadKey,
  renameFile,
  updateFileSizeAfterOverwrite,
  validateUpload,
} from "#src/shared/portfolio/files.js"
import {
  findOrCreateBookingFolder,
  findOrCreateCourseFolder,
  findOrCreateDefaultPortfolioFolder,
} from "#src/shared/portfolio/folders.js"
import { getOrCreateQuota, incrementUsage, QuotaService } from "#src/shared/portfolio/quota.js"
import { portfolioError } from "#src/shared/portfolio/response.js"
import { checkIsReadOnly } from "#src/shared/subscription/read-only.js"

const VALID_SECTIONS = new Set(["reference", "delivery", "course"])
const LIMITED_SECTIONS = new Set(["reference", "course"])
const MAX_IMAGES_PER_LIMITED_SECTION = 3
const ZIP_COMPRESSION_LEVEL = 5
const CROP_JPEG_QUALITY = 90
const DEFAULT_COMPRESS_QUALITY = 80

async function assertWritable(supabase, userId, message) {
  if (await checkIsReadOnly(supabase, userId)) throw portfolioError(message, 403)
}

/** Unexpected failures keep their message (500), as the Next.js routes did. */
async function orFail(fallback, work, statusFor = () => 500) {
  try {
    return await work()
  } catch (err) {
    if (err?.envelope) throw err
    const message = err instanceof Error ? err.message : fallback
    throw portfolioError(message, statusFor(message))
  }
}

async function findOwnFile(supabase, userId, id) {
  const { data: file, error } = await supabase.from("portfolio_files").select("*").eq("id", id).eq("user_id", userId).single()
  if (error || !file) throw portfolioError("File not found", 404)
  return file
}

/**
 * Uploads one file. `upload`: { buffer, originalName, mimeType, size } (null when missing);
 * `fields`: folder_id, booking_id, course_id, section, set_as_avatar, set_as_studio_logo.
 * Target folder: given folder > booking folder > course folder > "My Portfolio".
 * Reference/course sections: images only, at most 3 per folder.
 */
export async function uploadFile(userId, upload, fields) {
  if (!upload) throw portfolioError("File is required", 400)

  const mimeType = upload.mimeType || "application/octet-stream"
  const validationError = validateUpload(mimeType, upload.size)
  if (validationError) throw portfolioError(validationError, 400)

  const section = fields.section ? String(fields.section).toLowerCase().trim() : null
  if (section && !VALID_SECTIONS.has(section)) throw portfolioError("Invalid section specified", 400)
  if (LIMITED_SECTIONS.has(section) && !mimeType.startsWith("image/")) {
    throw portfolioError("Reference and course files must be valid image files", 400)
  }

  const safeFileName = sanitizeFilename(upload.originalName)
  if (!validateMagicBytes(upload.buffer, mimeType)) {
    throw portfolioError("File content does not match the declared file type", 400)
  }

  const supabase = createDbClient()
  let folderId = fields.folder_id ? Number(fields.folder_id) : null
  const bookingId = fields.booking_id ? Number(fields.booking_id) : null
  const courseId = fields.course_id ? Number(fields.course_id) : null

  // Independent checks in one round; evaluated below in the original order.
  const [isReadOnly, quotaResult, bookingRes, courseRes, providedFolderRes] = await Promise.all([
    checkIsReadOnly(supabase, userId),
    getOrCreateQuota(supabase, userId).then(
      (row) => ({ row, error: null }),
      (error) => ({ row: null, error })
    ),
    bookingId ? supabase.from("bookings").select("id").eq("id", bookingId).eq("user_id", userId).maybeSingle() : null,
    courseId ? supabase.from("courses").select("id, name").eq("id", courseId).eq("user_id", userId).maybeSingle() : null,
    folderId ? supabase.from("portfolio_folders").select("id").eq("id", folderId).eq("user_id", userId).maybeSingle() : null,
  ])

  if (isReadOnly) throw portfolioError("Your subscription has expired. Please upgrade to upload files.", 403)

  // Quota/expiry problems are 402 (Payment Required), everything else 500.
  const statusFor = (message) => (message.includes("quota") || message.includes("expired") ? 402 : 500)

  return orFail(
    "Upload failed",
    async () => {
      if (quotaResult.error || !quotaResult.row) throw quotaResult.error ?? new Error("Upload failed")
      const check = QuotaService.fromRow(quotaResult.row).canUpload(upload.size)
      if (!check.allowed) throw portfolioError(check.reason ?? "Storage quota exceeded", 402)

      if (bookingId && (!bookingRes || bookingRes.error || !bookingRes.data)) {
        throw portfolioError("Booking not found or access denied", 403)
      }
      if (courseId && (!courseRes || courseRes.error || !courseRes.data)) {
        throw portfolioError("Course not found or access denied", 403)
      }
      if (folderId && !providedFolderRes?.data) throw portfolioError("Folder not found or access denied", 404)

      if (!folderId) {
        if (bookingId) folderId = (await findOrCreateBookingFolder(supabase, userId, bookingId)).id
        else if (courseId && courseRes?.data) {
          folderId = (await findOrCreateCourseFolder(supabase, userId, courseId, courseRes.data.name)).id
        } else folderId = (await findOrCreateDefaultPortfolioFolder(supabase, userId)).id
      }

      const limited = LIMITED_SECTIONS.has(section)
      const [sectionCountRes, sortOrder] = await Promise.all([
        limited
          ? supabase
              .from("portfolio_files")
              .select("*", { count: "exact", head: true })
              .eq("folder_id", folderId)
              .eq("section", section)
          : null,
        getNextSortOrder(supabase, folderId),
      ])
      if (limited && (sectionCountRes?.count ?? 0) >= MAX_IMAGES_PER_LIMITED_SECTION) {
        throw portfolioError(`Maximum of ${MAX_IMAGES_PER_LIMITED_SECTION} ${section} images allowed`, 400)
      }

      const { key, extension } = prepareUploadKey(userId, folderId, safeFileName)

      // Upload while re-reading the quota (other uploads may have finished meanwhile).
      const [, freshQuotaRow] = await Promise.all([
        overwriteFileInR2(key, upload.buffer, mimeType),
        getOrCreateQuota(supabase, userId),
      ])
      const freshCheck = QuotaService.fromRow(freshQuotaRow).canUpload(upload.size)
      if (!freshCheck.allowed) {
        await deleteFromR2([key]).catch(() => {})
        throw new Error(freshCheck.reason ?? "Upload not allowed")
      }

      const uploaded = await insertFileRecord(supabase, {
        userId,
        folderId,
        storagePath: key,
        originalName: safeFileName,
        mimeType,
        extension,
        fileSize: upload.size,
        section,
        sortOrder,
      })
      await incrementUsage(supabase, userId, upload.size)

      if (fields.set_as_avatar === "true") {
        await supabase.from("users").update({ avatar_file_id: uploaded.id }).eq("id", userId)
      }
      if (fields.set_as_studio_logo === "true") {
        await supabase.from("users").update({ studio_logo_file_id: uploaded.id }).eq("id", userId)
      }
      return { file: uploaded }
    },
    statusFor
  )
}

export async function deleteFile(userId, id) {
  const supabase = createDbClient()
  await assertWritable(supabase, userId, "Your subscription has expired. Please upgrade to delete files.")
  return orFail("Delete failed", async () => {
    await deleteFileRecord(supabase, userId, id)
    return { id }
  })
}

export async function rename(userId, id, originalName) {
  const name = typeof originalName === "string" ? originalName.trim() : ""
  if (!name) throw portfolioError("original_name is required", 400)

  const supabase = createDbClient()
  await assertWritable(supabase, userId, "Your subscription has expired. Please upgrade to rename files.")
  return orFail("Rename failed", async () => ({ file: await renameFile(supabase, userId, id, name) }))
}

/** A 1-hour presigned R2 URL that downloads with the original filename. */
export async function getDownloadUrl(userId, id) {
  const supabase = createDbClient()
  const file = await findOwnFile(supabase, userId, id)
  return orFail("Download failed", async () => ({
    download_url: await createPresignedDownloadUrl(file.storage_path, file.original_name),
    file,
  }))
}

export async function bulkDelete(userId, ids) {
  if (!Array.isArray(ids) || ids.length === 0) throw portfolioError("ids array is required", 400)

  const supabase = createDbClient()
  await assertWritable(supabase, userId, "Your subscription has expired. Please upgrade to delete files.")
  return orFail("Bulk delete failed", async () => {
    const count = await deleteFilesBulk(supabase, userId, ids.map(Number))
    return [`${count} file(s) deleted`, { count }]
  })
}

/**
 * The selected files as one zip, streamed: each R2 object is piped into the archive
 * and the archive straight to the response, so memory stays at about one chunk
 * instead of every file plus the whole zip.
 * → { files, pipeTo(res) }
 */
export async function prepareBulkDownload(userId, ids) {
  if (!Array.isArray(ids) || ids.length === 0) throw portfolioError("ids array is required", 400)

  const { data: files, error } = await createDbClient()
    .from("portfolio_files")
    .select("*")
    .eq("user_id", userId)
    .in("id", ids)
  if (error || !files?.length) throw portfolioError("Files not found", 404)

  return {
    files,
    async pipeTo(destination) {
      const archive = new ZipArchive({ zlib: { level: ZIP_COMPRESSION_LEVEL } })
      const done = new Promise((resolve, reject) => {
        archive.on("error", reject)
        destination.on("close", resolve)
        destination.on("finish", resolve)
      })
      archive.pipe(destination)
      for (const file of files) {
        const body = await getObjectStream(file.storage_path)
        if (body) archive.append(body, { name: file.original_name })
      }
      await archive.finalize()
      await done
    },
  }
}

async function replaceImage(supabase, userId, id, file, output) {
  await overwriteFileInR2(file.storage_path, output, "image/jpeg")
  return { file: await updateFileSizeAfterOverwrite(supabase, userId, id, output.length, "image/jpeg", "jpeg") }
}

/** Re-encodes an image as mozjpeg at `quality` (1–100, default 80), in place. */
export async function compressImage(userId, id, rawQuality) {
  const quality = Math.min(100, Math.max(1, Number(rawQuality ?? DEFAULT_COMPRESS_QUALITY)))
  const supabase = createDbClient()
  await assertWritable(supabase, userId, "Your subscription has expired. Please upgrade to edit files.")

  const file = await findOwnFile(supabase, userId, id)
  if (!file.mime_type.startsWith("image/")) throw portfolioError("Only images can be compressed", 400)

  return orFail("Compress failed", async () => {
    const output = await sharp(await getObjectBuffer(file.storage_path))
      .jpeg({ quality, mozjpeg: true })
      .toBuffer()
    return replaceImage(supabase, userId, id, file, output)
  })
}

/** Replaces an image with the client-cropped one (re-encoded as JPEG 90). `image`: Buffer or null. */
export async function cropImage(userId, id, image) {
  if (!image) throw portfolioError("image file is required", 400)

  const supabase = createDbClient()
  await assertWritable(supabase, userId, "Your subscription has expired. Please upgrade to edit files.")
  const file = await findOwnFile(supabase, userId, id)

  return orFail("Crop failed", async () => {
    const output = await sharp(image).jpeg({ quality: CROP_JPEG_QUALITY }).toBuffer()
    return replaceImage(supabase, userId, id, file, output)
  })
}
