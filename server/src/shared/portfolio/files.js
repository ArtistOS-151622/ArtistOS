import { randomUUID } from "node:crypto"

import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

import { getR2BucketName, getR2Client } from "#src/integrations/r2/client.js"
import { getPublicUrl } from "#src/integrations/r2/url.js"
import { ALLOWED_MIME_TYPES, STORAGE_MAX_FILE_SIZE_BYTES } from "#src/shared/portfolio/config.js"
import { adjustUsage, decrementUsage, getOrCreateQuota, incrementUsage, QuotaService } from "#src/shared/portfolio/quota.js"

/*
 * portfolio_files row: { id, user_id, folder_id, section, original_name, storage_path,
 *   mime_type, extension, file_size, sort_order, uploaded_by, created_at, updated_at }
 * Files returned to clients also carry `public_url`.
 */

const FILES_TABLE = "portfolio_files"
const DOWNLOAD_URL_TTL_SECONDS = 3600

export function enrichFile(file) {
  return { ...file, public_url: getPublicUrl(file.storage_path, file.updated_at) }
}

/** Public URL of a file row, or null. */
export function fileUrl(file) {
  return file ? enrichFile(file).public_url : null
}

export function getExtensionFromFilename(filename) {
  const parts = filename.split(".")
  if (parts.length < 2) return "bin"
  return parts.pop().toLowerCase()
}

/** R2 key: portfolio/<userId>/<folderId>/<uuid>.<ext> */
export function prepareUploadKey(userId, folderId, filename) {
  const extension = getExtensionFromFilename(filename)
  const uuid = randomUUID()
  return { key: `portfolio/${userId}/${folderId}/${uuid}.${extension.replace(/^\./, "")}`, uuid, extension }
}

export async function getNextSortOrder(supabase, folderId) {
  const { data } = await supabase
    .from(FILES_TABLE)
    .select("sort_order")
    .eq("folder_id", folderId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle()

  return data ? Number(data.sort_order) + 1 : 0
}

/**
 * Files of one folder, sorted. `section` filters to one section; otherwise
 * `includeReference: false` excludes reference images (keeping NULL-section uploads).
 */
export async function listFilesInFolder(supabase, userId, folderId, section, includeReference = true) {
  let query = supabase
    .from(FILES_TABLE)
    .select("*")
    .eq("user_id", userId)
    .eq("folder_id", folderId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })

  if (section) query = query.eq("section", section)
  else if (!includeReference) query = query.or("section.is.null,section.neq.reference")

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data ?? []).map(enrichFile)
}

/** Error message, or null when the type and size are acceptable. */
export function validateUpload(mimeType, sizeBytes) {
  if (!ALLOWED_MIME_TYPES.has(mimeType)) return "File type is not allowed"
  if (sizeBytes > STORAGE_MAX_FILE_SIZE_BYTES) {
    return `File exceeds maximum size of ${STORAGE_MAX_FILE_SIZE_BYTES / (1024 * 1024)} MB`
  }
  if (sizeBytes <= 0) return "Invalid file size"
  return null
}

export async function createPresignedDownloadUrl(storagePath, filename) {
  const command = new GetObjectCommand({
    Bucket: getR2BucketName(),
    Key: storagePath,
    ...(filename
      ? { ResponseContentDisposition: `attachment; filename="${encodeURIComponent(filename.replace(/["\r\n]/g, "_"))}"` }
      : {}),
  })
  return getSignedUrl(getR2Client(), command, { expiresIn: DOWNLOAD_URL_TTL_SECONDS })
}

export async function deleteFromR2(keys) {
  if (!keys.length) return
  const client = getR2Client()
  const bucket = getR2BucketName()
  await Promise.all(keys.map((Key) => client.send(new DeleteObjectCommand({ Bucket: bucket, Key }))))
}

export async function overwriteFileInR2(storagePath, body, mimeType) {
  await getR2Client().send(
    new PutObjectCommand({ Bucket: getR2BucketName(), Key: storagePath, Body: body, ContentType: mimeType })
  )
}

/**
 * Inserts the portfolio_files row only (no quota check, no usage update).
 * params: { userId, folderId, storagePath, originalName, mimeType, extension, fileSize, section?, sortOrder }
 */
export async function insertFileRecord(supabase, params) {
  const { data, error } = await supabase
    .from(FILES_TABLE)
    .insert({
      user_id: params.userId,
      folder_id: params.folderId,
      section: params.section ?? null,
      original_name: params.originalName,
      storage_path: params.storagePath,
      mime_type: params.mimeType,
      extension: params.extension,
      file_size: params.fileSize,
      sort_order: params.sortOrder,
      uploaded_by: params.userId,
    })
    .select("*")
    .single()

  if (error) throw new Error(error.message)
  return enrichFile(data)
}

/** For files already in R2: re-checks quota, inserts the row and adds its size to used storage. */
export async function confirmFileUpload(supabase, params) {
  const check = QuotaService.fromRow(await getOrCreateQuota(supabase, params.userId)).canUpload(params.fileSize)
  if (!check.allowed) throw new Error(check.reason ?? "Upload not allowed")

  const sortOrder = await getNextSortOrder(supabase, params.folderId)
  const file = await insertFileRecord(supabase, { ...params, sortOrder })
  await incrementUsage(supabase, params.userId, params.fileSize)
  return file
}

export async function deleteFileRecord(supabase, userId, fileId) {
  const { data: file, error: fetchError } = await supabase
    .from(FILES_TABLE)
    .select("*")
    .eq("id", fileId)
    .eq("user_id", userId)
    .single()

  if (fetchError || !file) throw new Error("File not found")

  await deleteFromR2([file.storage_path])

  const { error } = await supabase.from(FILES_TABLE).delete().eq("id", fileId).eq("user_id", userId)
  if (error) throw new Error(error.message)

  await decrementUsage(supabase, userId, file.file_size)
  return file
}

/** Deletes the user's files with these ids (R2 + rows + usage). Returns how many were deleted. */
export async function deleteFilesBulk(supabase, userId, fileIds) {
  const { data: files, error } = await supabase.from(FILES_TABLE).select("*").eq("user_id", userId).in("id", fileIds)

  if (error) throw new Error(error.message)
  if (!files?.length) return 0

  await deleteFromR2(files.map((f) => f.storage_path))
  const totalSize = files.reduce((sum, f) => sum + Number(f.file_size), 0)

  await supabase.from(FILES_TABLE).delete().eq("user_id", userId).in("id", fileIds)
  await decrementUsage(supabase, userId, totalSize)
  return files.length
}

export async function renameFile(supabase, userId, fileId, originalName) {
  const { data, error } = await supabase
    .from(FILES_TABLE)
    .update({ original_name: originalName })
    .eq("id", fileId)
    .eq("user_id", userId)
    .select("*")
    .single()

  if (error) throw new Error(error.message)
  return enrichFile(data)
}

/** After replacing a file's bytes in R2 (crop/compress): checks quota for growth, updates size/type and usage. */
export async function updateFileSizeAfterOverwrite(supabase, userId, fileId, newSize, mimeType, extension) {
  const { data: existing } = await supabase
    .from(FILES_TABLE)
    .select("*")
    .eq("id", fileId)
    .eq("user_id", userId)
    .single()

  if (!existing) throw new Error("File not found")

  const delta = newSize - Number(existing.file_size)
  if (delta > 0) {
    const check = QuotaService.fromRow(await getOrCreateQuota(supabase, userId)).canUpload(delta)
    if (!check.allowed) throw new Error(check.reason ?? "Not enough storage for this operation")
  }

  const update = { file_size: newSize }
  if (mimeType) update.mime_type = mimeType
  if (extension) update.extension = extension

  const { data, error } = await supabase
    .from(FILES_TABLE)
    .update(update)
    .eq("id", fileId)
    .eq("user_id", userId)
    .select("*")
    .single()

  if (error) throw new Error(error.message)

  await adjustUsage(supabase, userId, delta)
  return enrichFile(data)
}

export { adjustUsage }

/** id → public URL for the given file ids (missing ids are absent). One query. */
export async function getFileUrlsById(supabase, fileIds) {
  const ids = [...new Set(fileIds.filter(Boolean))]
  if (ids.length === 0) return new Map()

  const { data, error } = await supabase.from(FILES_TABLE).select("*").in("id", ids)
  if (error) throw new Error(error.message)
  return new Map((data ?? []).map((file) => [file.id, fileUrl(file)]))
}
