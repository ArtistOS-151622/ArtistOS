import { normalizeE164Phone } from "#src/shared/phone.js"

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const trimmed = (value) => (typeof value === "string" ? value.trim() : undefined)

/**
 * Public inquiry form body. → { data } or { error } (same order and messages as before).
 * data: { customer_name, phone, email, address, alt_phone, booking_date, start_time,
 *         end_time, services: number[], additional_request }
 */
export function validateInquiry(input) {
  const customer_name = trimmed(input.customer_name)
  const phone = normalizeE164Phone(input.phone)
  const alt_phone = normalizeE164Phone(input.alt_phone)
  const email = trimmed(input.email) || null
  const address = trimmed(input.address)
  const booking_date = trimmed(input.booking_date)
  const start_time = trimmed(input.start_time)
  const end_time = trimmed(input.end_time)

  if (!customer_name) return { error: "Customer name is required." }
  if (!trimmed(input.phone)) return { error: "Phone number is required." }
  if (!phone) return { error: "Enter a valid phone number including the country code." }
  if (trimmed(input.alt_phone) && !alt_phone) {
    return { error: "Enter a valid alternative phone number including the country code." }
  }
  if (email && !EMAIL_PATTERN.test(email)) return { error: "Please enter a valid email address." }
  if (!address) return { error: "Address is required." }
  if (!booking_date) return { error: "Booking date is required." }
  if (!start_time) return { error: "Start time is required." }
  if (!end_time) return { error: "End time is required." }

  const services = Array.isArray(input.services) ? input.services.map(Number).filter(Number.isFinite) : []
  if (services.length === 0) return { error: "Please select at least one service." }

  return {
    data: {
      customer_name,
      phone,
      email,
      address,
      alt_phone,
      booking_date,
      start_time,
      end_time,
      services,
      additional_request: trimmed(input.additional_request) || null,
    },
  }
}
