import path from "node:path"

const DANGEROUS_EXTENSIONS = new Set([
  "exe", "bat", "cmd", "sh", "bash", "ps1", "vbs", "jar",
  "php", "php3", "php4", "php5", "phtml", "phar",
  "pl", "py", "cgi", "asp", "aspx", "jsp", "jspx",
  "html", "htm", "shtml", "xhtml", "js", "mjs", "cjs",
  "scr", "dll", "so", "dylib", "com",
])
const MAX_FILENAME_LENGTH = 100

/**
 * Upload filename → safe display name: no control characters, path parts or
 * shell/HTML-sensitive characters; executable/script extensions become ".bin";
 * at most 100 characters (extension kept).
 */
export function sanitizeFilename(originalName) {
  // eslint-disable-next-line no-control-regex -- strip control characters
  let clean = String(originalName).replace(/[\x00-\x1F\x7F]/g, "").trim()
  clean = path.basename(clean)
  clean = clean.replace(/[/\\]/g, "_")
  clean = clean.replace(/[<>:"|?*$`]/g, "_")

  const parts = clean.split(".")
  if (parts.length > 1 && DANGEROUS_EXTENSIONS.has(parts[parts.length - 1].toLowerCase())) {
    parts[parts.length - 1] = "bin"
    clean = parts.join(".")
  }

  if (!clean || clean === "." || clean === "..") clean = `file_${Date.now()}`

  if (clean.length > MAX_FILENAME_LENGTH) {
    const ext = path.extname(clean)
    clean = path.basename(clean, ext).slice(0, MAX_FILENAME_LENGTH - ext.length) + ext
  }
  return clean
}

/** True when the file's leading bytes match its claimed MIME type (anti-spoofing; SVGs without scripts). */
export function validateMagicBytes(buffer, mimeType) {
  if (buffer.length < 4) return false
  const mime = mimeType.toLowerCase()
  const ascii = (start, end) => buffer.toString("ascii", start, end)

  switch (mime) {
    case "image/jpeg":
      return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff
    case "image/png":
      return buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47
    case "image/gif":
      return ascii(0, 4) === "GIF8"
    case "image/webp":
      return buffer.length >= 12 && ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP"
    case "application/pdf":
      return ascii(0, 4) === "%PDF"
    case "image/heic":
    case "image/heif":
    case "image/avif":
      return buffer.length >= 12 && ascii(4, 8) === "ftyp"
    case "image/svg+xml": {
      const text = buffer.toString("utf8", 0, Math.min(buffer.length, 4096)).toLowerCase()
      if (["<script", "javascript:", "onerror=", "onload="].some((needle) => text.includes(needle))) return false
      return text.includes("<svg") || text.includes("<?xml")
    }
    default:
      return true
  }
}
