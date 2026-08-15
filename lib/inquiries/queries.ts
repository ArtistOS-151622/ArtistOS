import type { SupabaseClient } from "@supabase/supabase-js"

type InquiryServiceRow = {
  quantity: number | null
  unit_price: number | string | null
  service: {
    id: number
    service_name?: string
    price?: number | string | null
  } | {
    id: number
    service_name?: string
    price?: number | string | null
  }[] | null
}

type InquiryRow = {
  id: number
  booking_id: number | null
  status: "new" | "booked" | "cancelled"
  customer_id: number
  booking_address: string
  booking_date: string
  start_time: string
  end_time: string
  additional_request: string | null
  inquiry_services?: InquiryServiceRow[] | null
}

export const INQUIRY_SELECT_FIELDS = `
  id,
  user_id,
  customer_id,
  booking_id,
  booking_address,
  booking_date,
  start_time,
  end_time,
  status,
  additional_request,
  created_at,
  updated_at,
  customer:customers(customer_name, phone, alt_phone, email, address),
  inquiry_services:inquiry_services(
    quantity,
    unit_price,
    service:services(id, service_name, price)
  )
`

export function formatInquiry(row: InquiryRow & Record<string, unknown>) {
  return {
    ...row,
    services: row.inquiry_services?.map((item) => {
      const service = Array.isArray(item.service) ? item.service[0] : item.service
      return {
        ...service,
        quantity: item.quantity ?? 1,
        price: item.unit_price ?? service?.price ?? 0,
      }
    }).filter((service) => service.id) ?? [],
  }
}

export async function convertInquiryToBooking(
  supabase: SupabaseClient,
  inquiryId: number,
  userId: number,
) {
  const { data: inquiry, error: inquiryError } = await supabase
    .from("inquiries")
    .select(INQUIRY_SELECT_FIELDS)
    .eq("id", inquiryId)
    .eq("user_id", userId)
    .single()

  if (inquiryError) return { error: inquiryError.message }
  if (!inquiry) return { error: "Inquiry not found." }
  if (inquiry.status === "cancelled") return { error: "Cancelled inquiries cannot be converted." }
  if (inquiry.status === "booked" && inquiry.booking_id) {
    return { inquiry: formatInquiry(inquiry), booking_id: inquiry.booking_id }
  }

  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .insert({
      user_id: userId,
      customer_id: inquiry.customer_id,
      booking_address: inquiry.booking_address,
      booking_date: inquiry.booking_date,
      start_time: inquiry.start_time,
      end_time: inquiry.end_time,
      status: "pending",
      additional_request: inquiry.additional_request,
    })
    .select("id")
    .single()

  if (bookingError) return { error: bookingError.message }

  const services = (inquiry.inquiry_services ?? []).filter(
    (item: InquiryServiceRow) => {
      const service = Array.isArray(item.service) ? item.service[0] : item.service
      return service?.id
    },
  )
  if (services.length > 0) {
    const { error: servicesError } = await supabase
      .from("booking_services")
      .insert(
        services.map((item: InquiryServiceRow) => ({
          booking_id: booking.id,
          service_id: (Array.isArray(item.service) ? item.service[0] : item.service)!.id,
          quantity: item.quantity ?? 1,
          unit_price: item.unit_price ?? (Array.isArray(item.service) ? item.service[0] : item.service)?.price ?? 0,
        })),
      )

    if (servicesError) {
      await supabase.from("bookings").delete().eq("id", booking.id)
      return { error: servicesError.message }
    }
  }

  const { data: updatedInquiry, error: updateError } = await supabase
    .from("inquiries")
    .update({ status: "booked", booking_id: booking.id })
    .eq("id", inquiryId)
    .eq("user_id", userId)
    .select(INQUIRY_SELECT_FIELDS)
    .single()

  if (updateError) return { error: updateError.message }

  return {
    inquiry: formatInquiry(updatedInquiry),
    booking_id: booking.id,
  }
}
