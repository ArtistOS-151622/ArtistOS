import { NextResponse, type NextRequest, after } from "next/server"

import { checkIsReadOnly } from "@/lib/auth/subscription"

import { getArtistSession } from "@/lib/auth/session"
import {
  BOOKING_FORM_ADVANCE_REMARK,
  BOOKING_ROW_FIELDS,
  CHARGE_FIELDS,
  PAYMENT_FIELDS,
  formatBookingResponse,
  validateBookingInput,
  type BookingInput,
  type ChargeRow,
  type PaymentRow,
  type ServiceRow,
} from "@/lib/bookings/booking-input"
import { createClient } from "@/lib/supabase/server"
import { sendBookingNotificationWhatsApp } from "@/lib/whatsapp/booking-notifications"

type DbError = { message: string } | null
type DbResult<T> = { data: T; error: DbError }

function badRequest(error: string) {
  return NextResponse.json({ error }, { status: 400 })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = getArtistSession(request)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const id = Number((await params).id)
  if (Number.isNaN(id)) return badRequest("Invalid booking ID.")

  // ── 1. Validate everything before touching the database ──────────────────
  const body = (await request.json()) as BookingInput
  const parsed = validateBookingInput(body)
  if ("error" in parsed) return badRequest(parsed.error)
  const input = parsed.data

  const userId = session.id
  const supabase = await createClient()

  // ── 2. One parallel batch of reads ───────────────────────────────────────
  const [isReadOnly, bookingRes, customerRes, servicesRes, existingServicesRes, existingChargesRes, paymentsRes] = await Promise.all([
    checkIsReadOnly(supabase, session.id),
    // Ownership check + previous status (for the WhatsApp "newly confirmed" message)
    supabase.from("bookings").select("id, status").eq("id", id).eq("user_id", session.id).maybeSingle(),
    supabase
      .from("customers")
      .select("customer_name, phone, email")
      .eq("id", input.bookingFields.customer_id)
      .eq("user_id", session.id)
      .maybeSingle(),
    supabase.from("services").select("id, service_name, price").eq("user_id", session.id).in("id", input.serviceIds),
    supabase.from("booking_services").select("service_id, unit_price").eq("booking_id", id),
    supabase.from("booking_additional_charges").select("id").eq("booking_id", id).eq("user_id", session.id),
    supabase.from("booking_payments").select(PAYMENT_FIELDS).eq("booking_id", id).eq("user_id", session.id),
  ])

  if (isReadOnly) {
    return NextResponse.json({ error: "Your subscription has expired. Please upgrade to edit bookings." }, { status: 403 })
  }
  const readError = bookingRes.error ?? customerRes.error ?? servicesRes.error ?? existingServicesRes.error ?? existingChargesRes.error ?? paymentsRes.error
  if (readError) return badRequest(readError.message)
  if (!bookingRes.data) return NextResponse.json({ error: "Booking not found." }, { status: 404 })
  if (!customerRes.data) return badRequest("Customer not found.")
  if ((servicesRes.data ?? []).length !== input.serviceIds.length) return badRequest("One or more selected services are invalid.")

  const previousStatus = bookingRes.data.status
  const serviceMap = new Map((servicesRes.data as ServiceRow[]).map((s) => [s.id, s]))
  const existingServices = (existingServicesRes.data ?? []) as { service_id: number; unit_price: number | null }[]
  const existingPriceMap = new Map(existingServices.map((es) => [es.service_id, es.unit_price]))
  const oldChargeIds = ((existingChargesRes.data ?? []) as { id: number }[]).map((c) => c.id)
  const existingPayments = (paymentsRes.data ?? []) as PaymentRow[]

  // Services already on the booking keep the price they were booked at; new ones use the current price.
  const serviceRows = input.services.map(({ service_id, quantity }) => ({
    booking_id: id,
    service_id,
    quantity,
    unit_price: existingPriceMap.get(service_id) ?? serviceMap.get(service_id)?.price ?? 0,
  }))
  const requestedServiceIds = new Set(input.serviceIds)
  const removedServiceIds = existingServices.map((es) => es.service_id).filter((sid) => !requestedServiceIds.has(sid))

  // Advance payment created by the booking form: prefer the ID the client sent, if it belongs to this booking.
  const requestedAdvanceId = Number(body.advance_payment_id)
  const existingAdvance =
    existingPayments.find((p) => p.id === requestedAdvanceId) ??
    existingPayments.find((p) => p.payment_type === "Advance" && p.remark === BOOKING_FORM_ADVANCE_REMARK) ??
    null

  // Charges: insert the new set first, then delete the old rows by ID.
  // If the insert fails, the old charges are untouched.
  async function syncCharges(): Promise<DbResult<ChargeRow[]>> {
    let inserted: ChargeRow[] = []
    if (input.additionalCharges.length > 0) {
      const res = await supabase
        .from("booking_additional_charges")
        .insert(input.additionalCharges.map((charge) => ({ ...charge, user_id: userId, booking_id: id })))
        .select(CHARGE_FIELDS)
      if (res.error) return { data: [], error: res.error }
      inserted = (res.data ?? []) as ChargeRow[]
    }
    if (oldChargeIds.length > 0) {
      const res = await supabase
        .from("booking_additional_charges")
        .delete()
        .eq("booking_id", id)
        .eq("user_id", userId)
        .in("id", oldChargeIds)
      if (res.error) return { data: inserted, error: res.error }
    }
    return { data: inserted, error: null }
  }

  async function syncAdvance(): Promise<DbResult<PaymentRow[]>> {
    const advanceFields = {
      payment_type: "Advance",
      payment_method: input.advancePaymentMethod,
      amount: input.advancePayment,
      payment_date: input.advancePaymentDate,
      remark: BOOKING_FORM_ADVANCE_REMARK,
    }

    if (existingAdvance && input.advancePayment <= 0) {
      const res = await supabase
        .from("booking_payments")
        .delete()
        .eq("id", existingAdvance.id)
        .eq("booking_id", id)
        .eq("user_id", userId)
      return { data: existingPayments.filter((p) => p.id !== existingAdvance.id), error: res.error }
    }
    if (existingAdvance) {
      const res = await supabase
        .from("booking_payments")
        .update(advanceFields)
        .eq("id", existingAdvance.id)
        .eq("booking_id", id)
        .eq("user_id", userId)
        .select(PAYMENT_FIELDS)
        .single()
      if (res.error) return { data: existingPayments, error: res.error }
      const updated = res.data as PaymentRow
      return { data: existingPayments.map((p) => (p.id === updated.id ? updated : p)), error: null }
    }
    if (input.advancePayment > 0) {
      const res = await supabase
        .from("booking_payments")
        .insert({ ...advanceFields, user_id: userId, booking_id: id })
        .select(PAYMENT_FIELDS)
        .single()
      if (res.error) return { data: existingPayments, error: res.error }
      return { data: [...existingPayments, res.data as PaymentRow], error: null }
    }
    return { data: existingPayments, error: null }
  }

  // ── 3. One parallel batch of writes ──────────────────────────────────────
  // Services: upsert the requested rows and delete only the removed ones. They touch
  // different rows, so they can run together, and a failure never leaves the booking
  // with zero services (unlike the old delete-all-then-insert).
  const [updateRes, upsertRes, removeRes, chargesRes, advanceRes] = await Promise.all([
    supabase
      .from("bookings")
      .update(input.bookingFields)
      .eq("id", id)
      .eq("user_id", session.id)
      .select(BOOKING_ROW_FIELDS)
      .single(),
    supabase.from("booking_services").upsert(serviceRows, { onConflict: "booking_id,service_id" }),
    removedServiceIds.length > 0
      ? supabase.from("booking_services").delete().eq("booking_id", id).in("service_id", removedServiceIds)
      : Promise.resolve({ error: null }),
    syncCharges(),
    syncAdvance(),
  ])

  const writeError = updateRes.error ?? upsertRes.error ?? removeRes.error ?? chargesRes.error ?? advanceRes.error
  if (writeError) return badRequest(writeError.message)
  if (!updateRes.data) return NextResponse.json({ error: "Booking not found." }, { status: 404 })

  // ── 4. Build the response in memory (no re-fetch) ────────────────────────
  const formatted = formatBookingResponse({
    booking: updateRes.data,
    customer: customerRes.data,
    serviceRows,
    serviceMap,
    charges: chargesRes.data,
    payments: advanceRes.data,
  })

  // Send automated WhatsApp confirmation asynchronously in background using after()
  // so the HTTP response is returned immediately to the client without blocking (~2-4s saved).
  const isNewlyConfirmed = input.bookingFields.status === "confirmed" && previousStatus !== "confirmed"
  if (isNewlyConfirmed) {
    after(async () => {
      try {
        await sendBookingNotificationWhatsApp(id, "confirmed", supabase)
      } catch (err) {
        console.error("[WhatsApp] Failed to dispatch booking confirmation notification in background:", err)
      }
    })
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

  if (await checkIsReadOnly(supabase, session.id)) {
    return NextResponse.json({ error: "Your subscription has expired. Please upgrade to delete bookings." }, { status: 403 })
  }

  const { error } = await supabase
    .from("bookings")
    .delete()
    .eq("id", id)
    .eq("user_id", session.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
}
