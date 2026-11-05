const E164_PATTERN = /^\+[1-9]\d{7,14}$/
const LEGACY_INDIAN_MOBILE_PATTERN = /^[6-9]\d{9}$/

/**
 * Normalizes customer phone input for storage.
 * The 10-digit fallback keeps older cached/PWA clients working during rollout.
 */
export function normalizeE164Phone(value: string | null | undefined): string | null {
  const trimmed = value?.trim()
  if (!trimmed) return null

  const compact = trimmed.replace(/[\s().-]/g, "")
  if (E164_PATTERN.test(compact)) return compact
  if (LEGACY_INDIAN_MOBILE_PATTERN.test(compact)) return `+91${compact}`

  return null
}

export function isE164Phone(value: string): boolean {
  return E164_PATTERN.test(value)
}
