export type PublicInquiryInput = {
  customer_name?: string
  phone?: string
  alt_phone?: string | null
  email?: string | null
  address?: string
  booking_date?: string
  start_time?: string
  end_time?: string
  services?: (string | number)[]
  additional_request?: string | null
}

export type ValidatedInquiryData = {
  customer_name: string
  phone: string
  email: string | null
  address: string
  alt_phone: string | null
  booking_date: string
  start_time: string
  end_time: string
  services: number[]
  additional_request: string | null
}

export type ValidationResult =
  | { data: ValidatedInquiryData }
  | { error: string }

export function validateInquiry(input: PublicInquiryInput): ValidationResult {
  const customer_name = input.customer_name?.trim()
  const phone = input.phone?.trim()
  const email = input.email?.trim() || null
  const address = input.address?.trim()
  const booking_date = input.booking_date?.trim()
  const start_time = input.start_time?.trim()
  const end_time = input.end_time?.trim()

  if (!customer_name) return { error: "Customer name is required." }
  if (!phone) return { error: "Phone number is required." }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Please enter a valid email address." }
  }
  if (!address) return { error: "Address is required." }
  if (!booking_date) return { error: "Booking date is required." }
  if (!start_time) return { error: "Start time is required." }
  if (!end_time) return { error: "End time is required." }

  const services = input.services?.map(Number).filter(Number.isFinite) ?? []
  if (services.length === 0) {
    return { error: "Please select at least one service." }
  }

  return {
    data: {
      customer_name,
      phone,
      email,
      address,
      alt_phone: input.alt_phone?.trim() || null,
      booking_date,
      start_time,
      end_time,
      services,
      additional_request: input.additional_request?.trim() || null,
    },
  }
}
