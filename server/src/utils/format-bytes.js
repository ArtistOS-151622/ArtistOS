const UNITS = ["B", "KB", "MB", "GB", "TB"]

/** 1536 → "1.5 KB". */
export function formatBytes(bytes) {
  if (bytes === 0) return "0 B"
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  const value = bytes / Math.pow(1024, i)
  return `${value.toFixed(i === 0 ? 0 : 1)} ${UNITS[i]}`
}
