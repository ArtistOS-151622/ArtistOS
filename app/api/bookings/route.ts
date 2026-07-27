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

export async function GET(request: NextRequest) {
  const session = getArtistSession(request)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const search = searchParams.get("search")?.trim() || ""
  const startDate = searchParams.get("start_date")
  const endDate = searchParams.get("end_date")
  
  const isDateRangeQuery = startDate && endDate

  const page = Math.max(1, Number(searchParams.get("page")) || 1)
  const limit = 20
  const from = (page - 1) * limit
  const to = from + limit - 1

  const supabase = await createClient()

  let customerIds: number[] = []
  if (search) {
    const { data: matchedCustomers } = await supabase
      .from("customers")
      .select("id")
      .eq("user_id", session.id)
      .or(`customer_name.ilike.%${search}%,phone.ilike.%${search}%`)

    customerIds = matchedCustomers?.map((c) => c.id) ?? []
    if (customerIds.length === 0) {
      return NextResponse.json({ bookings: [], hasMore: false })
    }
  }

  let query = supabase
    .from("bookings")
    .select(SELECT_FIELDS, { count: "exact" })
    .eq("user_id", session.id)

  if (search) {
    query = query.in("customer_id", customerIds)
  }

  if (isDateRangeQuery) {
    query = query.gte("booking_date", startDate).lte("booking_date", endDate)
  }

  query = query
    .order("booking_date", { ascending: false })
    .order("start_time", { ascending: false })

  if (!isDateRangeQuery) {
    query = query.range(from, to)
  }

  const { data, count, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  const formatted = (data ?? []).map((b: any) => ({
    ...b,
    services: b.booking_services?.map((bs: any) => ({
      ...bs.service,
      quantity: bs.quantity ?? 1,
      price: bs.unit_price ?? bs.service?.price ?? 0,
    })).filter((s: any) => s.id) ?? [],
    additional_charges: b.booking_additional_charges ?? [],
  }))

  const hasMore = isDateRangeQuery ? false : (count ?? 0) > page * limit

  return NextResponse.json({
    bookings: formatted,
    hasMore,
  })
}

export async function POST(request: NextRequest) {
  const session = getArtistSession(request)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = (await request.json()) as BookingInput

  if (!body.customer_id) return NextResponse.json({ error: "Customer is required." }, { status: 400 })
  if (!body.booking_address?.trim()) return NextResponse.json({ error: "Booking address is required." }, { status: 400 })
  if (!body.booking_date) return NextResponse.json({ error: "Booking date is required." }, { status: 400 })
  if (!body.start_time) return NextResponse.json({ error: "Start time is required." }, { status: 400 })
  if (!body.end_time) return NextResponse.json({ error: "End time is required." }, { status: 400 })
  if (!body.status) return NextResponse.json({ error: "Status is required." }, { status: 400 })

  const supabase = await createClient()

  // Insert main booking record
  const { data: booking, error: insertError } = await supabase
    .from("bookings")
    .insert({
      user_id: session.id,
      customer_id: Number(body.customer_id),
      booking_address: body.booking_address.trim(),
      booking_date: body.booking_date,
      start_time: body.start_time,
      end_time: body.end_time,
      status: body.status,
      additional_request: body.additional_request?.trim() || null,
    })
    .select()
    .single()

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 400 })

  // Insert service relationships
  if (body.services && body.services.length > 0) {
    const serviceIds = body.services.map(Number)

    // Fetch prices for the selected services
    const { data: servicesData } = await supabase
      .from("services")
      .select("id, price")
      .in("id", serviceIds)

    const servicePriceMap = new Map(servicesData?.map(s => [s.id, s.price]) || [])

    const serviceRelations = serviceIds.map((sid) => ({
      booking_id: booking.id,
      service_id: sid,
      quantity: 1,
      unit_price: servicePriceMap.get(sid) || 0,
    }))

    const { error: servicesError } = await supabase
      .from("booking_services")
      .insert(serviceRelations)

    if (servicesError) {
      // Clean up the booking if services insert failed
      await supabase.from("bookings").delete().eq("id", booking.id)
      return NextResponse.json({ error: servicesError.message }, { status: 400 })
    }
  }

  // Fetch the full booking details to return
  const { data: fullBooking, error: fetchError } = await supabase
    .from("bookings")
    .select(SELECT_FIELDS)
    .eq("id", booking.id)
    .single()

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 400 })

  const formatted = {
    ...fullBooking,
    services: fullBooking.booking_services?.map((bs: any) => ({
      ...bs.service,
      quantity: bs.quantity ?? 1,
      price: bs.unit_price ?? bs.service?.price ?? 0,
    })).filter((s: any) => s.id) ?? [],
    additional_charges: fullBooking.booking_additional_charges ?? [],
  }

  return NextResponse.json({ booking: formatted })
}
