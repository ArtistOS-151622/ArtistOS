import { normalizeE164Phone } from "#src/shared/phone.js"

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
