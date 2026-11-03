import { NextResponse, type NextRequest, after } from "next/server"

import { checkIsReadOnly } from "@/lib/auth/subscription"

import { getArtistSession } from "@/lib/auth/session"
import { createClient } from "@/lib/supabase/server"
import { sendBookingNotificationWhatsApp } from "@/lib/whatsapp/booking-notifications"

type BookingInput = {
  customer_id?: string | number
  booking_address?: string
  booking_date?: string
  start_time?: string
  end_time?: string
  status?: string
  services?: (string | number | { service_id: string | number; quantity?: number })[]
  additional_charges?: { charge_name: string; quantity: number; rate: number }[]
  advance_payment?: number | string
  advance_payment_method?: string
  advance_payment_date?: string
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
  ,booking_payments(id, payment_type, payment_method, amount, payment_date, remark)
`

const BOOKING_FORM_ADVANCE_REMARK = "Advance payment added during booking"

function getAdvancePayment(payments: any[] | null | undefined) {
  return payments?.find((payment) =>
    payment.payment_type === "Advance" && payment.remark === BOOKING_FORM_ADVANCE_REMARK,
  ) ?? payments?.find((payment) => payment.payment_type === "Advance") ?? null
}

export async function GET(request: NextRequest) {
  const session = getArtistSession(request)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const search = searchParams.get("search")?.trim() || ""
  const status = searchParams.get("status")?.trim() || "all"
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

  if (status !== "all") {
    query = query.eq("status", status)
  }

  if (isDateRangeQuery) {
    query = query.gte("booking_date", startDate).lte("booking_date", endDate)
  }

  // We remove the db-level order and range to perform custom sorting in-memory
  // query = query
  //   .order("booking_date", { ascending: false })
  //   .order("start_time", { ascending: false })

  // if (!isDateRangeQuery) {
  //   query = query.range(from, to)
  // }

  const { data, count, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }); // YYYY-MM-DD for IST (since user's timezone seems to be +05:30)

  const futureBookings = [];
  const pastBookings = [];

  for (const b of data ?? []) {
    if (b.booking_date >= todayStr) {
      futureBookings.push(b);
    } else {
      pastBookings.push(b);
    }
  }

  // Future: ASC by date, ASC by time (nearest future first)
  futureBookings.sort((a, b) => {
    if (a.booking_date !== b.booking_date) {
      return a.booking_date.localeCompare(b.booking_date);
    }
    return (a.start_time || "").localeCompare(b.start_time || "");
  });

  // Past: DESC by date, DESC by time (nearest past first)
  pastBookings.sort((a, b) => {
    if (a.booking_date !== b.booking_date) {
      return b.booking_date.localeCompare(a.booking_date);
    }
    return (b.start_time || "").localeCompare(a.start_time || "");
  });

  const sortedData = [...futureBookings, ...pastBookings];

  let paginatedData = sortedData;
  if (!isDateRangeQuery) {
    paginatedData = sortedData.slice(from, to + 1);
  }

  const formatted = paginatedData.map((b: any) => ({
    ...b,
    services: b.booking_services?.map((bs: any) => ({
      ...bs.service,
      quantity: bs.quantity ?? 1,
      price: bs.unit_price ?? bs.service?.price ?? 0,
    })).filter((s: any) => s.id) ?? [],
    additional_charges: b.booking_additional_charges ?? [],
    advance_payment: getAdvancePayment(b.booking_payments),
  }))

  const hasMore = isDateRangeQuery ? false : sortedData.length > (page * limit)

  return NextResponse.json({
    bookings: formatted,
    hasMore,
  })
}

export async function POST(request: NextRequest) {
  const session = getArtistSession(request)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supabase = await createClient()

  if (await checkIsReadOnly(supabase, session.id)) {
    return NextResponse.json({ error: "Your subscription has expired. Please upgrade to create bookings." }, { status: 403 })
  }

  const body = (await request.json()) as BookingInput

  if (!body.customer_id) return NextResponse.json({ error: "Customer is required." }, { status: 400 })
  if (!body.booking_address?.trim()) return NextResponse.json({ error: "Booking address is required." }, { status: 400 })
  if (!body.booking_date) return NextResponse.json({ error: "Booking date is required." }, { status: 400 })
  if (!body.start_time) return NextResponse.json({ error: "Start time is required." }, { status: 400 })
  if (!body.end_time) return NextResponse.json({ error: "End time is required." }, { status: 400 })
  if (!body.status) return NextResponse.json({ error: "Status is required." }, { status: 400 })
  if (!body.services || body.services.length === 0) return NextResponse.json({ error: "At least one service is required." }, { status: 400 })
  if (body.services.some((service) => typeof service === "object" && (!Number.isInteger(Number(service.quantity)) || Number(service.quantity) < 1))) {
    return NextResponse.json({ error: "Service quantity must be a whole number of at least 1." }, { status: 400 })
  }
  const advancePayment = Number(body.advance_payment ?? 0)
  const validPaymentMethods = ["UPI", "Cash", "Check", "Bank Transfer"]
  if (!Number.isFinite(advancePayment) || advancePayment < 0) return NextResponse.json({ error: "Advance payment cannot be negative." }, { status: 400 })
  if (advancePayment > 0 && (!body.advance_payment_method || !validPaymentMethods.includes(body.advance_payment_method))) {
    return NextResponse.json({ error: "Select a valid advance payment method." }, { status: 400 })
  }
  if (advancePayment > 0 && !body.advance_payment_date) return NextResponse.json({ error: "Advance payment date is required." }, { status: 400 })

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
    const normalizedServices = body.services.map((service) =>
      typeof service === "object"
        ? { service_id: Number(service.service_id), quantity: Math.max(1, Math.floor(Number(service.quantity) || 1)) }
        : { service_id: Number(service), quantity: 1 },
    )
    const serviceIds = normalizedServices.map((service) => service.service_id)

    // Fetch prices for the selected services
    const { data: servicesData } = await supabase
      .from("services")
      .select("id, price")
      .in("id", serviceIds)

    const servicePriceMap = new Map(servicesData?.map(s => [s.id, s.price]) || [])

    const serviceRelations = normalizedServices.map(({ service_id: sid, quantity }) => ({
      booking_id: booking.id,
      service_id: sid,
      quantity,
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

  const additionalCharges = body.additional_charges ?? []
  if (additionalCharges.some((charge) => !charge.charge_name?.trim() || !Number.isInteger(Number(charge.quantity)) || Number(charge.quantity) < 1 || Number(charge.rate) < 0)) {
    await supabase.from("bookings").delete().eq("id", booking.id)
    return NextResponse.json({ error: "Each additional charge requires a name, quantity of at least 1, and a non-negative rate." }, { status: 400 })
  }

  if (additionalCharges.length > 0) {
    const { error: chargesError } = await supabase
      .from("booking_additional_charges")
      .insert(additionalCharges.map((charge) => ({
        user_id: session.id,
        booking_id: booking.id,
        charge_name: charge.charge_name.trim(),
        quantity: Number(charge.quantity),
        rate: Number(charge.rate),
      })))

    if (chargesError) {
      await supabase.from("bookings").delete().eq("id", booking.id)
      return NextResponse.json({ error: chargesError.message }, { status: 400 })
    }
  }

  if (advancePayment > 0) {
    const { error: paymentError } = await supabase.from("booking_payments").insert({
      user_id: session.id,
      booking_id: booking.id,
      payment_type: "Advance",
      payment_method: body.advance_payment_method,
      amount: advancePayment,
      payment_date: body.advance_payment_date,
      remark: BOOKING_FORM_ADVANCE_REMARK,
    })
    if (paymentError) {
      await supabase.from("bookings").delete().eq("id", booking.id)
      return NextResponse.json({ error: paymentError.message }, { status: 400 })
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
    advance_payment: getAdvancePayment(fullBooking.booking_payments),
  }

  // Send automated WhatsApp notification asynchronously in background using after()
  // so the HTTP response is returned immediately to the client without blocking (~2-4s saved).
  const isConfirmed = booking.status === "confirmed"
  after(async () => {
    try {
      await sendBookingNotificationWhatsApp(booking.id, isConfirmed ? "confirmed" : "created", supabase)
    } catch (err) {
      console.error("[WhatsApp] Failed to dispatch booking notification in background:", err)
    }
  })

  return NextResponse.json({ booking: formatted })
}
