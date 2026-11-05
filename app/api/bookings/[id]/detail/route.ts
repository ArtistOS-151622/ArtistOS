import { NextResponse, type NextRequest } from "next/server"

import { getArtistSession } from "@/lib/auth/session"
import { createClient } from "@/lib/supabase/server"

const SELECT_FIELDS = `
  id,
  user_id,
  customer_id,
  booking_address,
  booking_date,
  start_time,
  end_time,
  status,
  additional_request,
  created_at,
  discount,
  customer:customers(customer_name, phone, email),
  booking_services:booking_services(
    quantity,
    unit_price,
    service:services(id, service_name, price)
  ),
  booking_additional_charges(id, charge_name, quantity, rate)
`

type BookingServiceRow = {
  quantity: number | null
  unit_price: number | null
  service: { id: number; service_name: string; price: number } | null
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = getArtistSession(request)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const id = Number((await params).id)
  if (Number.isNaN(id)) return NextResponse.json({ error: "Invalid booking ID." }, { status: 400 })

  const supabase = await createClient()

  // The booking and its per-artist number (#n) are independent: load them together
  const [{ data, error }, { count: userBookingCount }] = await Promise.all([
    supabase
      .from("bookings")
      .select(SELECT_FIELDS)
      .eq("id", id)
      .eq("user_id", session.id)
      .maybeSingle(),
    supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("user_id", session.id)
      .lte("id", id),
  ])

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  if (!data) return NextResponse.json({ error: "Booking not found." }, { status: 404 })

  const formatted = {
    ...data,
    user_booking_index: userBookingCount ?? id,
    services: ((data.booking_services ?? []) as unknown as BookingServiceRow[])
      .filter((bs) => bs.service?.id)
      .map((bs) => ({
        ...bs.service,
        quantity: bs.quantity ?? 1,
        price: bs.unit_price ?? bs.service?.price ?? 0,
      })),
    additional_charges: data.booking_additional_charges ?? [],
  }

  return NextResponse.json({ booking: formatted })
}
