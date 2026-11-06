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

const BOOKING_UPDATE_STAGE_MESSAGES: Record<string, string> = {
  authentication: "Booking update rejected during authentication",
  booking_id_validation: "Booking update rejected because the booking ID is invalid",
  validation: "Booking update failed while validating the request body",
  initial_reads: "Booking update failed while loading existing booking data",
  subscription_check: "Booking update blocked by the artist subscription",
  booking_lookup: "Booking update failed while loading the existing booking",
  customer_lookup: "Booking update failed while validating the selected customer",
  services_lookup: "Booking update failed while validating selected services",
  existing_services_lookup: "Booking update failed while loading existing services",
  existing_charges_lookup: "Booking update failed while loading existing charges",
  existing_payments_lookup: "Booking update failed while loading existing payments",
  booking_update: "Booking update failed while saving the main booking record",
  booking_services_upsert: "Booking update failed while saving selected services",
  removed_services_delete: "Booking update failed while removing deselected services",
  additional_charges_sync: "Booking update failed while synchronizing additional charges",
  advance_payment_sync: "Booking update failed while synchronizing the advance payment",
  response_formatting: "Booking was updated, but formatting the API response failed",
  notification_scheduling: "Booking was updated, but scheduling its confirmation notification failed",
}

function errorDetails(cause: unknown) {
  if (!(cause && typeof cause === "object")) {
    return cause instanceof Error ? { message: cause.message, name: cause.name } : undefined
  }

  const value = cause as Record<string, unknown>
  return {
    name: typeof value.name === "string" ? value.name : undefined,
    message: typeof value.message === "string" ? value.message : undefined,
    code: typeof value.code === "string" ? value.code : undefined,
    details: typeof value.details === "string" ? value.details : undefined,
    hint: typeof value.hint === "string" ? value.hint : undefined,
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startedAt = Date.now()
  const suppliedRequestId = request.headers.get("x-booking-request-id")?.trim()
  const requestId = suppliedRequestId && /^[a-zA-Z0-9_-]{1,80}$/.test(suppliedRequestId)
    ? suppliedRequestId
    : crypto.randomUUID()
  const responseHeaders = { "x-booking-request-id": requestId }
  let stage = "authentication"
  let bookingId: number | null = null
  let userId: number | null = null

  const fail = (error: string, status = 400, cause?: unknown) => {
    console.error(`[BookingUpdate] ${BOOKING_UPDATE_STAGE_MESSAGES[stage] ?? "Booking update failed"}`, {
      requestId,
      outcome: "failed",
      stage,
      status,
      userId,
      bookingId,
      elapsedMs: Date.now() - startedAt,
      error,
      cause: errorDetails(cause),
      userAgent: request.headers.get("user-agent")?.slice(0, 300),
    })
    return NextResponse.json({ error, requestId }, { status, headers: responseHeaders })
  }

  try {
  const session = getArtistSession(request)
  if (!session) return fail("Unauthorized", 401)
  userId = session.id

  stage = "booking_id_validation"
  const id = Number((await params).id)
  if (Number.isNaN(id)) return fail("Invalid booking ID.")
  bookingId = id

  // ── 1. Validate everything before touching the database ──────────────────
  stage = "validation"
  const body = (await request.json()) as BookingInput
  const parsed = validateBookingInput(body)
  if ("error" in parsed) return fail(parsed.error)
  const input = parsed.data

  console.info(`[BookingUpdate] Validated request for booking #${id}; starting update`, {
    requestId,
    userId,
    bookingId,
    serviceCount: input.services.length,
    hasAdvancePayment: input.advancePayment > 0,
    additionalChargeCount: input.additionalCharges.length,
  })

  const supabase = await createClient()

  // ── 2. One parallel batch of reads ───────────────────────────────────────
  stage = "initial_reads"
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
    stage = "subscription_check"
    return fail("Your subscription has expired. Please upgrade to edit bookings.", 403)
  }
  if (bookingRes.error) {
    stage = "booking_lookup"
    return fail(bookingRes.error.message, 400, bookingRes.error)
  }
  if (customerRes.error) {
    stage = "customer_lookup"
    return fail(customerRes.error.message, 400, customerRes.error)
  }
  if (servicesRes.error) {
    stage = "services_lookup"
    return fail(servicesRes.error.message, 400, servicesRes.error)
  }
  if (existingServicesRes.error) {
    stage = "existing_services_lookup"
    return fail(existingServicesRes.error.message, 400, existingServicesRes.error)
  }
  if (existingChargesRes.error) {
    stage = "existing_charges_lookup"
    return fail(existingChargesRes.error.message, 400, existingChargesRes.error)
  }
  if (paymentsRes.error) {
    stage = "existing_payments_lookup"
    return fail(paymentsRes.error.message, 400, paymentsRes.error)
  }
  if (!bookingRes.data) {
    stage = "booking_lookup"
    return fail("Booking not found.", 404)
  }
  if (!customerRes.data) {
    stage = "customer_lookup"
    return fail("Customer not found.")
  }
  if ((servicesRes.data ?? []).length !== input.serviceIds.length) {
    stage = "services_lookup"
    return fail("One or more selected services are invalid.")
  }

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
  stage = "booking_update"
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

  if (updateRes.error) {
    stage = "booking_update"
    return fail(updateRes.error.message, 400, updateRes.error)
  }
  if (upsertRes.error) {
    stage = "booking_services_upsert"
    return fail(upsertRes.error.message, 400, upsertRes.error)
  }
  if (removeRes.error) {
    stage = "removed_services_delete"
    return fail(removeRes.error.message, 400, removeRes.error)
  }
  if (chargesRes.error) {
    stage = "additional_charges_sync"
    return fail(chargesRes.error.message, 400, chargesRes.error)
  }
  if (advanceRes.error) {
    stage = "advance_payment_sync"
    return fail(advanceRes.error.message, 400, advanceRes.error)
  }
  if (!updateRes.data) {
    stage = "booking_update"
    return fail("Booking not found.", 404)
  }

  // ── 4. Build the response in memory (no re-fetch) ────────────────────────
  stage = "response_formatting"
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
  stage = "notification_scheduling"
  const isNewlyConfirmed = input.bookingFields.status === "confirmed" && previousStatus !== "confirmed"
  if (isNewlyConfirmed) {
    after(async () => {
      try {
        await sendBookingNotificationWhatsApp(id, "confirmed", supabase)
      } catch (err) {
        console.error(`[BookingUpdate] WhatsApp confirmation failed for booking #${id}`, {
          requestId,
          userId,
          bookingId: id,
          cause: errorDetails(err),
        })
      }
    })
  }

  console.info(`[BookingUpdate] Booking #${id} updated successfully`, {
    requestId,
    outcome: "succeeded",
    userId,
    bookingId: id,
    elapsedMs: Date.now() - startedAt,
    userAgent: request.headers.get("user-agent")?.slice(0, 300),
  })
  return NextResponse.json({ booking: formatted, requestId }, { headers: responseHeaders })
  } catch (error) {
    return fail("Unable to update booking.", 500, error)
  }
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
