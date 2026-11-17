import { config } from "#src/config/env.js"

export const STORAGE_FREE_TIER_BYTES = config.storage.freeTierBytes
export const STORAGE_DEFAULT_SHARE_EXPIRY_DAYS = config.storage.defaultShareExpiryDays
export const STORAGE_GRACE_PERIOD_DAYS = config.storage.gracePeriodDays
export const STORAGE_GST_RATE = config.storage.gstRate
export const STORAGE_MAX_FILE_SIZE_BYTES = config.storage.maxFileSizeBytes

export const FREE_USER_STORAGE_BYTES = 500 * 1024 * 1024
export const DEFAULT_PORTFOLIO_FOLDER_NAME = "My Portfolio"

export const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "image/heic",
  "image/heif",
  "image/avif",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/html",
  "text/csv",
  "application/zip",
  "application/x-rar-compressed",
  "application/x-7z-compressed",
  "application/octet-stream",
  "video/mp4",
  "video/quicktime",
  "video/x-msvideo",
  "video/x-matroska",
  "video/webm",
  "audio/mpeg",
  "audio/wav",
  "audio/ogg",
  "audio/mp4",
  "audio/x-m4a",
  "audio/aac",
  "audio/midi",
  "audio/x-midi",
  "audio/webm",
  "audio/flac",
])

export const HEIC_MIME_TYPES = new Set(["image/heic", "image/heif"])
