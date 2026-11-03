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
  advance_payment_id?: number | string
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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = getArtistSession(request)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const id = Number((await params).id)
  if (Number.isNaN(id)) return NextResponse.json({ error: "Invalid booking ID." }, { status: 400 })

  const supabase = await createClient()

  if (await checkIsReadOnly(supabase, session.id)) {
    return NextResponse.json({ error: "Your subscription has expired. Please upgrade to edit bookings." }, { status: 403 })
  }

  const body = (await request.json()) as BookingInput

  if (!body.customer_id) return NextResponse.json({ error: "Customer is required." }, { status: 400 })
  if (!body.booking_address?.trim()) return NextResponse.json({ error: "Booking address is required." }, { status: 400 })
  if (!body.booking_date) return NextResponse.json({ error: "Booking date is required." }, { status: 400 })
  if (!body.start_time) return NextResponse.json({ error: "Start time is required." }, { status: 400 })
  if (!body.end_time) return NextResponse.json({ error: "End time is required." }, { status: 400 })
  if (!body.status) return NextResponse.json({ error: "Status is required." }, { status: 400 })
  if (body.services?.some((service) => typeof service === "object" && (!Number.isInteger(Number(service.quantity)) || Number(service.quantity) < 1))) {
    return NextResponse.json({ error: "Service quantity must be a whole number of at least 1." }, { status: 400 })
  }
  const advancePayment = Number(body.advance_payment ?? 0)
  const validPaymentMethods = ["UPI", "Cash", "Check", "Bank Transfer"]
  if (!Number.isFinite(advancePayment) || advancePayment < 0) return NextResponse.json({ error: "Advance payment cannot be negative." }, { status: 400 })
  if (advancePayment > 0 && (!body.advance_payment_method || !validPaymentMethods.includes(body.advance_payment_method))) {
    return NextResponse.json({ error: "Select a valid advance payment method." }, { status: 400 })
  }
  if (advancePayment > 0 && !body.advance_payment_date) return NextResponse.json({ error: "Advance payment date is required." }, { status: 400 })

  const additionalCharges = body.additional_charges ?? []
  if (additionalCharges.some((charge) => !charge.charge_name?.trim() || !Number.isInteger(Number(charge.quantity)) || Number(charge.quantity) < 1 || Number(charge.rate) < 0)) {
    return NextResponse.json({ error: "Each additional charge requires a name, quantity of at least 1, and a non-negative rate." }, { status: 400 })
  }

  // Verify ownership before updating
  const { data: checkOwn, error: ownError } = await supabase
    .from("bookings")
    .select("id, status")
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
    const normalizedServices = body.services.map((service) =>
      typeof service === "object"
        ? { service_id: Number(service.service_id), quantity: Math.max(1, Math.floor(Number(service.quantity) || 1)) }
        : { service_id: Number(service), quantity: 1 },
    )
    const serviceIds = normalizedServices.map((service) => service.service_id)

    const newServiceIds = serviceIds.filter(sid => !existingServiceMap.has(sid))

    let servicePriceMap = new Map()
    if (newServiceIds.length > 0) {
      const { data: servicesData } = await supabase
        .from("services")
        .select("id, price")
        .in("id", newServiceIds)

      servicePriceMap = new Map(servicesData?.map(s => [s.id, s.price]) || [])
    }

    const serviceRelations = normalizedServices.map(({ service_id: sid, quantity }) => {
      const existing = existingServiceMap.get(sid)
      return {
        booking_id: id,
        service_id: sid,
        quantity,
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

  const { error: chargesDeleteError } = await supabase
    .from("booking_additional_charges")
    .delete()
    .eq("booking_id", id)
    .eq("user_id", session.id)

  if (chargesDeleteError) return NextResponse.json({ error: chargesDeleteError.message }, { status: 400 })

  if (additionalCharges.length > 0) {
    const { error: chargesInsertError } = await supabase
      .from("booking_additional_charges")
      .insert(additionalCharges.map((charge) => ({
        user_id: session.id,
        booking_id: id,
        charge_name: charge.charge_name.trim(),
        quantity: Number(charge.quantity),
        rate: Number(charge.rate),
      })))

    if (chargesInsertError) return NextResponse.json({ error: chargesInsertError.message }, { status: 400 })
  }

  const requestedAdvanceId = Number(body.advance_payment_id)
  let advancePaymentId = Number.isFinite(requestedAdvanceId) ? requestedAdvanceId : null
  if (!advancePaymentId) {
    const { data: existingAdvance } = await supabase
      .from("booking_payments")
      .select("id")
      .eq("booking_id", id)
      .eq("user_id", session.id)
      .eq("payment_type", "Advance")
      .eq("remark", BOOKING_FORM_ADVANCE_REMARK)
      .maybeSingle()
    advancePaymentId = existingAdvance?.id ?? null
  }

  if (advancePaymentId && advancePayment <= 0) {
    const { error: paymentDeleteError } = await supabase
      .from("booking_payments")
      .delete()
      .eq("id", advancePaymentId)
      .eq("booking_id", id)
      .eq("user_id", session.id)
    if (paymentDeleteError) return NextResponse.json({ error: paymentDeleteError.message }, { status: 400 })
  } else if (advancePaymentId) {
    const { error: paymentUpdateError } = await supabase
      .from("booking_payments")
      .update({
        payment_type: "Advance",
        payment_method: body.advance_payment_method,
        amount: advancePayment,
        payment_date: body.advance_payment_date,
        remark: BOOKING_FORM_ADVANCE_REMARK,
      })
      .eq("id", advancePaymentId)
      .eq("booking_id", id)
      .eq("user_id", session.id)
    if (paymentUpdateError) return NextResponse.json({ error: paymentUpdateError.message }, { status: 400 })
  } else if (advancePayment > 0) {
    const { error: paymentInsertError } = await supabase.from("booking_payments").insert({
      user_id: session.id,
      booking_id: id,
      payment_type: "Advance",
      payment_method: body.advance_payment_method,
      amount: advancePayment,
      payment_date: body.advance_payment_date,
      remark: BOOKING_FORM_ADVANCE_REMARK,
    })
    if (paymentInsertError) return NextResponse.json({ error: paymentInsertError.message }, { status: 400 })
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
    advance_payment: getAdvancePayment(fullBooking.booking_payments),
  }

  // Send automated WhatsApp confirmation asynchronously in background using after()
  // so the HTTP response is returned immediately to the client without blocking (~2-4s saved).
  const isNewlyConfirmed = body.status === "confirmed" && checkOwn.status !== "confirmed"
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
