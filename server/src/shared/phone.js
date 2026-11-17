const E164_PATTERN = /^\+[1-9]\d{7,14}$/
const LEGACY_INDIAN_MOBILE_PATTERN = /^[6-9]\d{9}$/

/**
 * Phone input → E.164 for storage, or null. A bare 10-digit Indian mobile becomes
 * +91…, which keeps older cached/PWA clients working. Used by customers and inquiries.
 */
export function normalizeE164Phone(value) {
  const trimmed = typeof value === "string" ? value.trim() : ""
  if (!trimmed) return null

  const compact = trimmed.replace(/[\s().-]/g, "")
  if (E164_PATTERN.test(compact)) return compact
  if (LEGACY_INDIAN_MOBILE_PATTERN.test(compact)) return `+91${compact}`
  return null
}

export function isE164Phone(value) {
  return E164_PATTERN.test(value)
}
