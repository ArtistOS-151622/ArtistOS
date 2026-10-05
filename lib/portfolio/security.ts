import path from "path"

const DANGEROUS_EXTENSIONS = new Set([
  "exe", "bat", "cmd", "sh", "bash", "ps1", "vbs", "jar",
  "php", "php3", "php4", "php5", "phtml", "phar",
  "pl", "py", "cgi", "asp", "aspx", "jsp", "jspx",
  "html", "htm", "shtml", "xhtml", "js", "mjs", "cjs",
  "scr", "dll", "so", "dylib", "com"
])

/**
 * Sanitizes a filename:
 * - Removes path traversals (../, ./)
 * - Removes null bytes and control characters
 * - Strips dangerous executable/script extensions
 * - Truncates to safe length preserving extension
 */
export function sanitizeFilename(originalName: string): string {
  // Strip null bytes and control characters
  let clean = originalName.replace(/[\x00-\x1F\x7F]/g, "").trim()

  // Use basename to prevent path traversal
  clean = path.basename(clean)

  // Remove any remaining path separators
  clean = clean.replace(/[/\\]/g, "_")

  // Remove shell or injection sensitive characters
  clean = clean.replace(/[<>:"|?*$`]/g, "_")

  // Check extension against dangerous list
  const parts = clean.split(".")
  if (parts.length > 1) {
    const ext = parts[parts.length - 1].toLowerCase()
    if (DANGEROUS_EXTENSIONS.has(ext)) {
      parts[parts.length - 1] = "bin"
      clean = parts.join(".")
    }
  }

  // Fallback if empty
  if (!clean || clean === "." || clean === "..") {
    clean = `file_${Date.now()}`
  }

  // Truncate to 100 characters max preserving extension
  if (clean.length > 100) {
    const ext = path.extname(clean)
    const base = path.basename(clean, ext)
    clean = base.slice(0, 100 - ext.length) + ext
  }

  return clean
}

/**
 * Validates file magic bytes against the claimed MIME type to prevent MIME spoofing.
 */
export function validateMagicBytes(buffer: Buffer, mimeType: string): boolean {
  if (buffer.length < 4) return false

  const lowerMime = mimeType.toLowerCase()

  // JPEG / JPG
  if (lowerMime === "image/jpeg") {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff
  }

  // PNG
  if (lowerMime === "image/png") {
    return (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47
    )
  }

  // GIF
  if (lowerMime === "image/gif") {
    const header = buffer.toString("ascii", 0, 4)
    return header === "GIF8"
  }

  // WebP: RIFF....WEBP
  if (lowerMime === "image/webp") {
    if (buffer.length < 12) return false
    const riff = buffer.toString("ascii", 0, 4)
    const webp = buffer.toString("ascii", 8, 12)
    return riff === "RIFF" && webp === "WEBP"
  }

  // PDF
  if (lowerMime === "application/pdf") {
    return buffer.toString("ascii", 0, 4) === "%PDF"
  }

  // HEIC / HEIF / AVIF: ....ftyp
  if (
    lowerMime === "image/heic" ||
    lowerMime === "image/heif" ||
    lowerMime === "image/avif"
  ) {
    if (buffer.length < 12) return false
    const ftyp = buffer.toString("ascii", 4, 8)
    return ftyp === "ftyp"
  }

  // SVG: Must be valid XML/SVG text, no script or inline event handlers (XSS prevention)
  if (lowerMime === "image/svg+xml") {
    const text = buffer.toString("utf8", 0, Math.min(buffer.length, 4096)).toLowerCase()
    if (
      text.includes("<script") ||
      text.includes("javascript:") ||
      text.includes("onerror=") ||
      text.includes("onload=")
    ) {
      return false
    }
    return text.includes("<svg") || text.includes("<?xml")
  }

  return true
}
