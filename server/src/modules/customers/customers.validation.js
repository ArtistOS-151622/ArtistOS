const E164_PATTERN = /^\+[1-9]\d{7,14}$/
const LEGACY_INDIAN_MOBILE_PATTERN = /^[6-9]\d{9}$/

/**
 * Phone input → E.164 for storage, or null. A bare 10-digit Indian mobile becomes
 * +91…, which keeps older cached/PWA clients working.
 */
export function normalizeE164Phone(value) {
  const trimmed = typeof value === "string" ? value.trim() : ""
  if (!trimmed) return null

  const compact = trimmed.replace(/[\s().-]/g, "")
  if (E164_PATTERN.test(compact)) return compact
  if (LEGACY_INDIAN_MOBILE_PATTERN.test(compact)) return `+91${compact}`
  return null
}

const trimmedOrUndefined = (value) => (typeof value === "string" ? value.trim() : undefined)

/** → { data } or { error } (first failing rule, same order and messages as before). */
export function validateCustomer(input) {
  const customer_name = trimmedOrUndefined(input.customer_name)
  const phone = normalizeE164Phone(input.phone)
  const alt_phone = normalizeE164Phone(input.alt_phone)
  const address = trimmedOrUndefined(input.address)

  if (!customer_name) return { error: "Customer name is required." }
  if (!trimmedOrUndefined(input.phone)) return { error: "Phone number is required." }
  if (!phone) return { error: "Enter a valid phone number including the country code." }
  if (trimmedOrUndefined(input.alt_phone) && !alt_phone) {
    return { error: "Enter a valid alternative phone number including the country code." }
  }
  if (!address) return { error: "Customer address is required." }

  return {
    data: {
      customer_name,
      phone,
      email: trimmedOrUndefined(input.email) || null,
      address,
      alt_phone,
      reference_by: trimmedOrUndefined(input.reference_by) || null,
    },
  }
}

export function isE164Phone(value) {
  return E164_PATTERN.test(value)
}
