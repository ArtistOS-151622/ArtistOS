export const STORAGE_FREE_TIER_BYTES = Number(
  process.env.STORAGE_FREE_TIER_BYTES ?? 10_000_000
)
export const STORAGE_DEFAULT_SHARE_EXPIRY_DAYS = Number(
  process.env.STORAGE_DEFAULT_SHARE_EXPIRY_DAYS ?? 30
)
export const STORAGE_GRACE_PERIOD_DAYS = Number(
  process.env.STORAGE_GRACE_PERIOD_DAYS ?? 30
)
export const STORAGE_GST_RATE = Number(process.env.STORAGE_GST_RATE ?? 0.18)
export const STORAGE_MAX_FILE_SIZE_BYTES = Number(
  process.env.STORAGE_MAX_FILE_SIZE_MB ?? 100
) * 1024 * 1024

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
