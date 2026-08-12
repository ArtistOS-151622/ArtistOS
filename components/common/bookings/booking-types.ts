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
}

export type BookingFormValues = {
  customer_id: string
  booking_address: string
  booking_date: string
  start_time: string
  end_time: string
  services: string[]
  status: "pending" | "confirmed" | "completed" | "cancelled"
  additional_request: string
  initial_customer?: {
    id: number
    customer_name: string
    phone: string
    email: string
    address: string
  } | null
}

export const emptyBookingForm: BookingFormValues = {
  customer_id: "",
  booking_address: "",
  booking_date: "",
  start_time: "09:00",
  end_time: "10:00",
  services: [],
  status: "pending",
  additional_request: "",
  initial_customer: null,
}
