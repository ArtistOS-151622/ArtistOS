export type Booking = {
  id: number
  user_id: number
  customer_id: number
  booking_address: string
  booking_date: string
  start_time: string
  end_time: string
  status: "pending" | "confirmed" | "completed" | "cancelled"
  additional_request: string | null
  created_at: string
  updated_at: string
  customer?: {
    customer_name: string
    phone: string
    email: string
  }
  services?: {
    id: number
    service_name: string
    price: number
    quantity?: number
  }[]
  discount?: number
  additional_charges?: {
    id: number
    charge_name: string
    quantity: number
    rate: number
  }[]
  advance_payment?: {
    id: number
    amount: number
    payment_method: string
    payment_date: string
  } | null
}

export type BookingFormValues = {
  customer_id: string
  booking_address: string
  booking_date: string
  start_time: string
  end_time: string
  services: string[]
  service_quantities: Record<string, number>
  additional_pricing_enabled: boolean
  additional_charges: BookingFormAdditionalCharge[]
  advance_payment: string
  advance_payment_id?: number
  advance_payment_method: "UPI" | "Cash" | "Check" | "Bank Transfer"
  advance_payment_date: string
  status: "pending" | "confirmed" | "completed" | "cancelled"
  additional_request: string
  reference_images?: File[]
  existing_reference_images?: ExistingReferenceImage[]
  removed_reference_image_ids?: number[]
  initial_customer?: {
    id: number
    customer_name: string
    phone: string
    email?: string | null
    address: string
  } | null
  storage_quota_exceeded?: boolean
}

export type BookingFormAdditionalCharge = {
  charge_name: string
  quantity: number
  rate: number
}

export type ExistingReferenceImage = {
  id: number
  file_name: string
  file_size: number
  public_url: string
  mime_type?: string
}

export const emptyBookingForm: BookingFormValues = {
  customer_id: "",
  booking_address: "",
  booking_date: "",
  start_time: "09:00",
  end_time: "10:00",
  services: [],
  service_quantities: {},
  additional_pricing_enabled: false,
  additional_charges: [],
  advance_payment: "",
  advance_payment_id: undefined,
  advance_payment_method: "UPI",
  advance_payment_date: "",
  status: "pending",
  additional_request: "",
  reference_images: [],
  existing_reference_images: [],
  removed_reference_image_ids: [],
  initial_customer: null,
  storage_quota_exceeded: false,
}
