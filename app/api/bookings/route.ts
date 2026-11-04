import { NextResponse, type NextRequest, after } from "next/server"

import { checkIsReadOnly } from "@/lib/auth/subscription"

import { getArtistSession } from "@/lib/auth/session"
import { createClient } from "@/lib/supabase/server"
import { sendBookingNotificationWhatsApp } from "@/lib/whatsapp/booking-notifications"
import {
  BOOKING_FORM_ADVANCE_REMARK,
  BOOKING_ROW_FIELDS,
  CHARGE_FIELDS,
  PAYMENT_FIELDS,
  formatBookingResponse,
  getAdvancePayment,
  validateBookingInput,
  type BookingInput,
  type ChargeRow,
  type PaymentRow,
  type ServiceRow,
} from "@/lib/bookings/booking-input"

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

function badRequest(error: string) {
  return NextResponse.json({ error }, { status: 400 })
}

export async function POST(request: NextRequest) {
  const session = getArtistSession(request)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // ── 1. Validate everything before touching the database ──────────────────
  const parsed = validateBookingInput((await request.json()) as BookingInput)
  if ("error" in parsed) return badRequest(parsed.error)
  const input = parsed.data

  const supabase = await createClient()

  // ── 2. Independent reads in parallel: subscription, services, customer ───
  // Services and customer are scoped to the artist so another artist's IDs are rejected.
  const [isReadOnly, servicesRes, customerRes] = await Promise.all([
    checkIsReadOnly(supabase, session.id),
    supabase
      .from("services")
      .select("id, service_name, price")
      .eq("user_id", session.id)
      .in("id", input.serviceIds),
    supabase
      .from("customers")
      .select("customer_name, phone, email")
      .eq("id", input.bookingFields.customer_id)
      .eq("user_id", session.id)
      .maybeSingle(),
  ])

  if (isReadOnly) {
    return NextResponse.json({ error: "Your subscription has expired. Please upgrade to create bookings." }, { status: 403 })
  }
  if (servicesRes.error) return badRequest(servicesRes.error.message)
  if (customerRes.error) return badRequest(customerRes.error.message)
  if (!customerRes.data) return badRequest("Customer not found.")
  if ((servicesRes.data ?? []).length !== input.serviceIds.length) return badRequest("One or more selected services are invalid.")

  const serviceMap = new Map((servicesRes.data as ServiceRow[]).map((s) => [s.id, s]))

  // ── 3. Insert the booking ────────────────────────────────────────────────
  const { data: booking, error: insertError } = await supabase
    .from("bookings")
    .insert({ user_id: session.id, ...input.bookingFields })
    .select(BOOKING_ROW_FIELDS)
    .single()

  if (insertError) return badRequest(insertError.message)

  // ── 4. Child rows in parallel; each insert returns what the response needs ─
  const serviceRows = input.services.map(({ service_id, quantity }) => ({
    booking_id: booking.id,
    service_id,
    quantity,
    unit_price: serviceMap.get(service_id)?.price ?? 0,
  }))

  const [servicesInsert, chargesInsert, paymentInsert] = await Promise.all([
    supabase.from("booking_services").insert(serviceRows),
    input.additionalCharges.length > 0
      ? supabase
          .from("booking_additional_charges")
          .insert(input.additionalCharges.map((charge) => ({ ...charge, user_id: session.id, booking_id: booking.id })))
          .select(CHARGE_FIELDS)
      : Promise.resolve({ data: [], error: null }),
    input.advancePayment > 0
      ? supabase
          .from("booking_payments")
          .insert({
            user_id: session.id,
            booking_id: booking.id,
            payment_type: "Advance",
            payment_method: input.advancePaymentMethod,
            amount: input.advancePayment,
            payment_date: input.advancePaymentDate,
            remark: BOOKING_FORM_ADVANCE_REMARK,
          })
          .select(PAYMENT_FIELDS)
      : Promise.resolve({ data: [], error: null }),
  ])

  const childError = servicesInsert.error ?? chargesInsert.error ?? paymentInsert.error
  if (childError) {
    // Child tables cascade on delete, so removing the booking cleans up any partial inserts.
    await supabase.from("bookings").delete().eq("id", booking.id)
    return badRequest(childError.message)
  }

  // ── 5. Build the response from what we already have (no re-fetch) ────────
  const formatted = formatBookingResponse({
    booking,
    customer: customerRes.data,
    serviceRows,
    serviceMap,
    charges: (chargesInsert.data ?? []) as ChargeRow[],
    payments: (paymentInsert.data ?? []) as PaymentRow[],
  })

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
