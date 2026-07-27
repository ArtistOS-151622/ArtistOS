import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import type { SupabaseClient } from "@supabase/supabase-js"

import { getR2BucketName, getR2Client } from "@/lib/r2/client"
import { buildPortfolioObjectKey, getExtensionFromFilename } from "@/lib/r2/keys"
import { getPublicUrl } from "@/lib/r2/url"
import {
  ALLOWED_MIME_TYPES,
  HEIC_MIME_TYPES,
  STORAGE_MAX_FILE_SIZE_BYTES,
} from "@/lib/portfolio/config"
import {
  adjustUsage,
  decrementUsage,
  getOrCreateQuota,
  incrementUsage,
  QuotaService,
} from "@/lib/portfolio/quota"
import type { PortfolioFileRow, PortfolioFileWithUrl } from "@/lib/portfolio/types"

export function enrichFile(file: PortfolioFileRow): PortfolioFileWithUrl {
  return {
    ...file,
    public_url: getPublicUrl(file.storage_path, file.updated_at),
  }
}

export async function getNextSortOrder(
  supabase: SupabaseClient,
  folderId: number
): Promise<number> {
  const { data } = await supabase
    .from("portfolio_files")
    .select("sort_order")
    .eq("folder_id", folderId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle()

  return data ? Number((data as { sort_order: number }).sort_order) + 1 : 0
}

export async function listFilesInFolder(
  supabase: SupabaseClient,
  userId: number,
  folderId: number,
  section?: string | null
): Promise<PortfolioFileWithUrl[]> {
  let query = supabase
    .from("portfolio_files")
    .select("*")
    .eq("user_id", userId)
    .eq("folder_id", folderId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })

  if (section) query = query.eq("section", section)

  const { data, error } = await query
  if (error) throw new Error(error.message)

  return ((data ?? []) as PortfolioFileRow[]).map(enrichFile)
}

export function validateUpload(mimeType: string, sizeBytes: number): string | null {
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    return "File type is not allowed"
  }
  if (sizeBytes > STORAGE_MAX_FILE_SIZE_BYTES) {
    return `File exceeds maximum size of ${STORAGE_MAX_FILE_SIZE_BYTES / (1024 * 1024)} MB`
  }
  if (sizeBytes <= 0) return "Invalid file size"
  return null
}

export async function createPresignedUploadUrl(
  storagePath: string,
  mimeType: string,
  _sizeBytes: number
): Promise<string> {
  void _sizeBytes

  const client = getR2Client()
  const command = new PutObjectCommand({
    Bucket: getR2BucketName(),
    Key: storagePath,
    ContentType: mimeType,
  })

  return getSignedUrl(client, command, { 
    expiresIn: 3600,
    signableHeaders: new Set(["content-type"])
  })
}

export async function createPresignedDownloadUrl(storagePath: string): Promise<string> {
  const client = getR2Client()
  const command = new GetObjectCommand({
    Bucket: getR2BucketName(),
    Key: storagePath,
  })

  return getSignedUrl(client, command, { expiresIn: 3600 })
}

export async function deleteFromR2(keys: string[]): Promise<void> {
  if (!keys.length) return
  const client = getR2Client()
  const bucket = getR2BucketName()

  await Promise.all(
    keys.map((Key) => client.send(new DeleteObjectCommand({ Bucket: bucket, Key })))
  )
}

export async function confirmFileUpload(
  supabase: SupabaseClient,
  params: {
    userId: number
    folderId: number
    storagePath: string
    originalName: string
    mimeType: string
    extension: string
    fileSize: number
    section?: string | null
  }
): Promise<PortfolioFileWithUrl> {
  const quotaRow = await getOrCreateQuota(supabase, params.userId)
  const quota = QuotaService.fromRow(quotaRow)
  const check = quota.canUpload(params.fileSize)
  if (!check.allowed) throw new Error(check.reason ?? "Upload not allowed")

  const sortOrder = await getNextSortOrder(supabase, params.folderId)

  const { data, error } = await supabase
    .from("portfolio_files")
    .insert({
      user_id: params.userId,
      folder_id: params.folderId,
      section: params.section ?? null,
      original_name: params.originalName,
      storage_path: params.storagePath,
      mime_type: params.mimeType,
      extension: params.extension,
      file_size: params.fileSize,
      sort_order: sortOrder,
      uploaded_by: params.userId,
    })
    .select("*")
    .single()

  if (error) throw new Error(error.message)

  await incrementUsage(supabase, params.userId, params.fileSize)
  return enrichFile(data as PortfolioFileRow)
}

export async function deleteFileRecord(
  supabase: SupabaseClient,
  userId: number,
  fileId: number
): Promise<PortfolioFileRow> {
  const { data: file, error: fetchError } = await supabase
    .from("portfolio_files")
    .select("*")
    .eq("id", fileId)
    .eq("user_id", userId)
    .single()

  if (fetchError || !file) throw new Error("File not found")

  const row = file as PortfolioFileRow

  await deleteFromR2([row.storage_path])

  const { error } = await supabase
    .from("portfolio_files")
    .delete()
    .eq("id", fileId)
    .eq("user_id", userId)

  if (error) throw new Error(error.message)

  await decrementUsage(supabase, userId, row.file_size)

  return row
}

export async function deleteFilesBulk(
  supabase: SupabaseClient,
  userId: number,
  fileIds: number[]
): Promise<number> {
  const { data: files, error } = await supabase
    .from("portfolio_files")
    .select("*")
    .eq("user_id", userId)
    .in("id", fileIds)

  if (error) throw new Error(error.message)
  if (!files?.length) return 0

  const rows = files as PortfolioFileRow[]
  await deleteFromR2(rows.map((f) => f.storage_path))

  const totalSize = rows.reduce((s, f) => s + Number(f.file_size), 0)

  await supabase
    .from("portfolio_files")
    .delete()
    .eq("user_id", userId)
    .in("id", fileIds)

  await decrementUsage(supabase, userId, totalSize)
  return rows.length
}

export async function updateFileSortOrder(
  supabase: SupabaseClient,
  userId: number,
  folderId: number,
  orderedIds: number[]
): Promise<void> {
  for (let i = 0; i < orderedIds.length; i++) {
    await supabase
      .from("portfolio_files")
      .update({ sort_order: i })
      .eq("id", orderedIds[i])
      .eq("user_id", userId)
      .eq("folder_id", folderId)
  }
}

export async function renameFile(
  supabase: SupabaseClient,
  userId: number,
  fileId: number,
  originalName: string
): Promise<PortfolioFileWithUrl> {
  const { data, error } = await supabase
    .from("portfolio_files")
    .update({ original_name: originalName })
    .eq("id", fileId)
    .eq("user_id", userId)
    .select("*")
    .single()

  if (error) throw new Error(error.message)
  return enrichFile(data as PortfolioFileRow)
}

export function prepareUploadKey(
  userId: number,
  folderId: number,
  filename: string
): { key: string; uuid: string; extension: string } {
  const extension = getExtensionFromFilename(filename)
  const { key, uuid } = buildPortfolioObjectKey(userId, folderId, extension)
  return { key, uuid, extension }
}

export function requiresServerUpload(mimeType: string): boolean {
  return HEIC_MIME_TYPES.has(mimeType)
}

export async function overwriteFileInR2(
  storagePath: string,
  body: Buffer,
  mimeType: string
): Promise<void> {
  const client = getR2Client()
  await client.send(
    new PutObjectCommand({
      Bucket: getR2BucketName(),
      Key: storagePath,
      Body: body,
      ContentType: mimeType,
    })
  )
}

export async function updateFileSizeAfterOverwrite(
  supabase: SupabaseClient,
  userId: number,
  fileId: number,
  newSize: number,
  mimeType?: string,
  extension?: string
): Promise<PortfolioFileWithUrl> {
  const { data: existing } = await supabase
    .from("portfolio_files")
    .select("*")
    .eq("id", fileId)
    .eq("user_id", userId)
    .single()

  if (!existing) throw new Error("File not found")

  const oldSize = Number((existing as PortfolioFileRow).file_size)
  const delta = newSize - oldSize

  if (delta > 0) {
    const quotaRow = await getOrCreateQuota(supabase, userId)
    const quota = QuotaService.fromRow(quotaRow)
    const check = quota.canUpload(delta)
    if (!check.allowed) throw new Error(check.reason ?? "Not enough storage for this operation")
  }

  const update: Record<string, unknown> = { file_size: newSize }
  if (mimeType) update.mime_type = mimeType
  if (extension) update.extension = extension

  const { data, error } = await supabase
    .from("portfolio_files")
    .update(update)
    .eq("id", fileId)
    .eq("user_id", userId)
    .select("*")
    .single()

  if (error) throw new Error(error.message)

  await adjustUsage(supabase, userId, delta)
  return enrichFile(data as PortfolioFileRow)
}

export { adjustUsage }
