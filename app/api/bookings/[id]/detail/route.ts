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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = getArtistSession(request)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const id = Number((await params).id)
  if (Number.isNaN(id)) return NextResponse.json({ error: "Invalid booking ID." }, { status: 400 })

  const supabase = await createClient()

  const { data, error } = await supabase
    .from("bookings")
    .select(SELECT_FIELDS)
    .eq("id", id)
    .eq("user_id", session.id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  if (!data) return NextResponse.json({ error: "Booking not found." }, { status: 404 })

  const { count: userBookingCount } = await supabase
    .from("bookings")
    .select("*", { count: "exact", head: true })
    .eq("user_id", session.id)
    .lte("id", id)

  const formatted = {
    ...data,
    user_booking_index: userBookingCount ?? id,
    services: data.booking_services?.map((bs: any) => ({
      ...bs.service,
      quantity: bs.quantity ?? 1,
      price: bs.unit_price ?? bs.service?.price ?? 0,
    })).filter((s: any) => s.id) ?? [],
    additional_charges: data.booking_additional_charges ?? [],
  }

  return NextResponse.json({ booking: formatted })
}
