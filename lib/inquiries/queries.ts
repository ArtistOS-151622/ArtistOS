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

/** Loads one inquiry (with customer + services) owned by the artist. */
export async function getInquiryForUser(
  supabase: SupabaseClient,
  inquiryId: number,
  userId: number,
) {
  return supabase
    .from("inquiries")
    .select(INQUIRY_SELECT_FIELDS)
    .eq("id", inquiryId)
    .eq("user_id", userId)
    .maybeSingle()
}

type LoadedInquiry = NonNullable<Awaited<ReturnType<typeof getInquiryForUser>>["data"]>

/**
 * Converts an already-loaded inquiry into a confirmed booking.
 * Sequential steps: insert booking -> (insert services || mark inquiry booked).
 */
export async function convertInquiryToBooking(
  supabase: SupabaseClient,
  inquiry: LoadedInquiry,
  userId: number,
) {
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
      status: "confirmed",
      additional_request: inquiry.additional_request,
    })
    .select("id")
    .single()

  if (bookingError) return { error: bookingError.message }

  const serviceRows = (inquiry.inquiry_services ?? []).flatMap((item: InquiryServiceRow) => {
    const service = Array.isArray(item.service) ? item.service[0] : item.service
    if (!service?.id) return []
    return [{
      booking_id: booking.id,
      service_id: service.id,
      quantity: item.quantity ?? 1,
      unit_price: item.unit_price ?? service.price ?? 0,
    }]
  })

  // Services insert and inquiry update are independent: run them together.
  // The update only applies while the inquiry is still unconverted, so a double
  // click can't link two bookings to one inquiry.
  const [servicesRes, updateRes] = await Promise.all([
    serviceRows.length > 0
      ? supabase.from("booking_services").insert(serviceRows)
      : Promise.resolve({ error: null }),
    supabase
      .from("inquiries")
      .update({ status: "booked", booking_id: booking.id })
      .eq("id", inquiry.id)
      .eq("user_id", userId)
      .neq("status", "cancelled")
      .is("booking_id", null)
      .select("status, booking_id, updated_at")
      .maybeSingle(),
  ])

  const failure =
    servicesRes.error?.message ??
    updateRes.error?.message ??
    (!updateRes.data ? "This inquiry was already converted or cancelled." : null)

  if (failure) {
    // Undo: remove the new booking (its services cascade) and, if the inquiry
    // was already marked booked by this request, put it back.
    await Promise.all([
      supabase.from("bookings").delete().eq("id", booking.id),
      updateRes.data
        ? supabase
            .from("inquiries")
            .update({ status: inquiry.status, booking_id: null })
            .eq("id", inquiry.id)
            .eq("user_id", userId)
        : Promise.resolve({ error: null }),
    ])
    return { error: failure }
  }

  // Build the response from what we already have instead of re-fetching with joins
  return {
    inquiry: formatInquiry({ ...inquiry, ...updateRes.data }),
    booking_id: booking.id,
  }
}
