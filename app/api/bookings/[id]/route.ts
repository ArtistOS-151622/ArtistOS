import { NextResponse, type NextRequest } from "next/server"

import { getArtistSession } from "@/lib/auth/session"
import { createClient } from "@/lib/supabase/server"

type BookingInput = {
  customer_id?: string | number
  booking_address?: string
  booking_date?: string
  start_time?: string
  end_time?: string
  status?: string
  services?: (string | number)[]
  additional_request?: string
}

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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = getArtistSession(request)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const id = Number((await params).id)
  if (Number.isNaN(id)) return NextResponse.json({ error: "Invalid booking ID." }, { status: 400 })

  const body = (await request.json()) as BookingInput

  if (!body.customer_id) return NextResponse.json({ error: "Customer is required." }, { status: 400 })
  if (!body.booking_address?.trim()) return NextResponse.json({ error: "Booking address is required." }, { status: 400 })
  if (!body.booking_date) return NextResponse.json({ error: "Booking date is required." }, { status: 400 })
  if (!body.start_time) return NextResponse.json({ error: "Start time is required." }, { status: 400 })
  if (!body.end_time) return NextResponse.json({ error: "End time is required." }, { status: 400 })
  if (!body.status) return NextResponse.json({ error: "Status is required." }, { status: 400 })

  const supabase = await createClient()

  // Verify ownership before updating
  const { data: checkOwn, error: ownError } = await supabase
    .from("bookings")
    .select("id")
    .eq("id", id)
    .eq("user_id", session.id)
    .maybeSingle()

  if (ownError) return NextResponse.json({ error: ownError.message }, { status: 400 })
  if (!checkOwn) return NextResponse.json({ error: "Booking not found." }, { status: 404 })

  // Update booking details
  const { error: updateError } = await supabase
    .from("bookings")
    .update({
      customer_id: Number(body.customer_id),
      booking_address: body.booking_address.trim(),
      booking_date: body.booking_date,
      start_time: body.start_time,
      end_time: body.end_time,
      status: body.status,
      additional_request: body.additional_request?.trim() || null,
    })
    .eq("id", id)

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 400 })

  // Fetch existing booking services to retain their prices and quantities
  const { data: existingServices } = await supabase
    .from("booking_services")
    .select("service_id, unit_price, quantity")
    .eq("booking_id", id)

  const existingServiceMap = new Map(existingServices?.map(es => [es.service_id, es]) || [])

  // Sync service relations: Delete existing and insert new ones
  const { error: servicesDeleteError } = await supabase
    .from("booking_services")
    .delete()
    .eq("booking_id", id)

  if (servicesDeleteError) return NextResponse.json({ error: servicesDeleteError.message }, { status: 400 })

  if (body.services && body.services.length > 0) {
    const serviceIds = body.services.map(Number)

    const newServiceIds = serviceIds.filter(sid => !existingServiceMap.has(sid))
    
    let servicePriceMap = new Map()
    if (newServiceIds.length > 0) {
      const { data: servicesData } = await supabase
        .from("services")
        .select("id, price")
        .in("id", newServiceIds)
      
      servicePriceMap = new Map(servicesData?.map(s => [s.id, s.price]) || [])
    }

    const serviceRelations = serviceIds.map((sid) => {
      const existing = existingServiceMap.get(sid)
      return {
        booking_id: id,
        service_id: sid,
        quantity: existing ? (existing.quantity || 1) : 1,
        unit_price: existing && existing.unit_price !== undefined && existing.unit_price !== null 
          ? existing.unit_price 
          : (servicePriceMap.get(sid) || 0),
      }
    })

    const { error: servicesInsertError } = await supabase
      .from("booking_services")
      .insert(serviceRelations)

    if (servicesInsertError) return NextResponse.json({ error: servicesInsertError.message }, { status: 400 })
  }

  // Fetch updated full booking details
  const { data: fullBooking, error: fetchError } = await supabase
    .from("bookings")
    .select(SELECT_FIELDS)
    .eq("id", id)
    .single()

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 400 })

  const { count: userBookingCount } = await supabase
    .from("bookings")
    .select("*", { count: "exact", head: true })
    .eq("user_id", session.id)
    .lte("id", id)

  const formatted = {
    ...fullBooking,
    user_booking_index: userBookingCount ?? id,
    services: fullBooking.booking_services?.map((bs: any) => ({
      ...bs.service,
      quantity: bs.quantity ?? 1,
      price: bs.unit_price ?? bs.service?.price ?? 0,
    })).filter((s: any) => s.id) ?? [],
    additional_charges: fullBooking.booking_additional_charges ?? [],
  }

  return NextResponse.json({ booking: formatted })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = getArtistSession(request)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const id = Number((await params).id)
  if (Number.isNaN(id)) return NextResponse.json({ error: "Invalid booking ID." }, { status: 400 })

  const supabase = await createClient()

  const { error } = await supabase
    .from("bookings")
    .delete()
    .eq("id", id)
    .eq("user_id", session.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
}
