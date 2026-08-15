export type InquiryStatus = "new" | "booked" | "cancelled"

export type Inquiry = {
  id: number
  user_id: number
  customer_id: number
  booking_id: number | null
  booking_address: string
  booking_date: string
  start_time: string
  end_time: string
  status: InquiryStatus
  additional_request: string | null
  created_at: string
  updated_at: string
  customer?: {
    customer_name: string
    phone: string
    alt_phone?: string | null
    email: string
    address: string
  }
  services?: {
    id: number
    service_name: string
    price: number
    quantity?: number
  }[]
}

export type PublicInquiryFormValues = {
  customer_name: string
  phone: string
  alt_phone: string
  email: string
  address: string
  booking_date: string
  start_time: string
  end_time: string
  services: string[]
  additional_request: string
}

export const emptyPublicInquiryForm: PublicInquiryFormValues = {
  customer_name: "",
  phone: "",
  alt_phone: "",
  email: "",
  address: "",
  booking_date: "",
  start_time: "09:00",
  end_time: "10:00",
  services: [],
  additional_request: "",
}
