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

const BOOKING_LIST_FIELDS = `
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
  booking_services:booking_services(
    quantity,
    unit_price,
    service:services(id, service_name, price)
  ),
  booking_additional_charges(id, charge_name, quantity, rate),
  booking_payments(id, payment_type, payment_method, amount, payment_date, remark)
`
// When searching, the customer join must be !inner so the customer filter also filters bookings.
const SELECT_FIELDS = `${BOOKING_LIST_FIELDS}, customer:customers(customer_name, phone, email)`
const SELECT_FIELDS_SEARCH = `${BOOKING_LIST_FIELDS}, customer:customers!inner(customer_name, phone, email)`

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
/** Calendar asks for month ± 14 days (~62 days); this leaves headroom while blocking huge ranges. */
const MAX_RANGE_DAYS = 100
const MS_PER_DAY = 24 * 60 * 60 * 1000

type BookingListRow = Record<string, unknown> & {
  booking_date: string
  booking_services: { quantity: number | null; unit_price: number | null; service: ServiceRow | null }[] | null
  booking_additional_charges: ChargeRow[] | null
  booking_payments: PaymentRow[] | null
}

/** Characters that would break or change a PostgREST `.or()` filter string. */
function sanitizeSearch(value: string) {
  return value.replace(/[,()"\\*]/g, " ").replace(/\s+/g, " ").trim()
}

export async function GET(request: NextRequest) {
  const session = getArtistSession(request)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const search = sanitizeSearch(searchParams.get("search") ?? "")
  const status = searchParams.get("status")?.trim() || "all"
  const startDate = searchParams.get("start_date") ?? ""
  const endDate = searchParams.get("end_date") ?? ""

  // A date range is required so a request can never load an artist's entire booking history.
  if (!DATE_PATTERN.test(startDate) || !DATE_PATTERN.test(endDate)) {
    return badRequest("start_date and end_date are required (YYYY-MM-DD).")
  }
  const rangeDays = (Date.parse(endDate) - Date.parse(startDate)) / MS_PER_DAY
  if (!Number.isFinite(rangeDays) || rangeDays < 0) return badRequest("end_date must be on or after start_date.")
  if (rangeDays > MAX_RANGE_DAYS) return badRequest(`Date range cannot exceed ${MAX_RANGE_DAYS} days.`)

  // Ranges entirely in the past list newest first; anything touching today or later lists soonest first.
  const todayStr = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" })
  const ascending = endDate >= todayStr

  const supabase = await createClient()

  let query = supabase
    .from("bookings")
    .select(search ? SELECT_FIELDS_SEARCH : SELECT_FIELDS)
    .eq("user_id", session.id)
    .gte("booking_date", startDate)
    .lte("booking_date", endDate)

  if (search) {
    query = query.or(`customer_name.ilike.%${search}%,phone.ilike.%${search}%`, { referencedTable: "customer" })
  }
  if (status !== "all") {
    query = query.eq("status", status)
  }

  const { data, error } = await query
    .order("booking_date", { ascending })
    .order("start_time", { ascending })

  if (error) return badRequest(error.message)

  const formatted = ((data ?? []) as unknown as BookingListRow[]).map((b) => ({
    ...b,
    services: (b.booking_services ?? [])
      .filter((bs) => bs.service?.id)
      .map((bs) => ({
        ...bs.service,
        quantity: bs.quantity ?? 1,
        price: bs.unit_price ?? bs.service?.price ?? 0,
      })),
    additional_charges: b.booking_additional_charges ?? [],
    advance_payment: getAdvancePayment(b.booking_payments),
  }))

  // Kept for response compatibility; results are bounded by the date range, not paginated.
  return NextResponse.json({ bookings: formatted, hasMore: false })
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
