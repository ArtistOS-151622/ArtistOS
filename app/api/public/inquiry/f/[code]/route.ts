import { NextResponse, type NextRequest, after } from "next/server"

import { checkIsReadOnly } from "@/lib/auth/subscription"
import { createClient } from "@/lib/supabase/server"
import { sendInquiryNotificationWhatsApp } from "@/lib/whatsapp/inquiry-notifications"

import {
  validateInquiry,
  type PublicInquiryInput,
} from "@/lib/inquiries/validation"

type RouteContext = {
  params: Promise<{ code: string }>
}

async function findActiveArtistByCode(code: string) {
  const supabase = await createClient()
  const normalizedCode = code.trim().toUpperCase()

  const { data: artist, error } = await supabase
    .from("users")
    .select("id, artist_name, studio_name, address, phone")
    .eq("inquiry_form_code", normalizedCode)
    .maybeSingle()

  if (error) return { supabase, error: error.message }
  if (!artist) return { supabase, error: "Inquiry link not found.", status: 404 }

  return { supabase, artist }
}

const FORM_CLOSED_ERROR = "This inquiry form is not accepting submissions right now."
const DUPLICATE_WINDOW_MS = 24 * 60 * 60 * 1000

export async function GET(_request: NextRequest, context: RouteContext) {
  const { code } = await context.params
  const result = await findActiveArtistByCode(code)

  if ("error" in result) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status ?? 400 },
    )
  }

  const { supabase, artist } = result

  // Subscription check and services list are independent: run them together
  const [isReadOnly, servicesRes] = await Promise.all([
    checkIsReadOnly(supabase, artist.id),
    supabase
      .from("services")
      .select("id, service_name, duration_minutes, price")
      .eq("user_id", artist.id)
      .order("service_name", { ascending: true }),
  ])

  if (isReadOnly) return NextResponse.json({ error: FORM_CLOSED_ERROR }, { status: 403 })
  if (servicesRes.error) return NextResponse.json({ error: servicesRes.error.message }, { status: 400 })

  return NextResponse.json({
    artist,
    services: servicesRes.data ?? [],
  })
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { code } = await context.params

  // ── 1. Validate the body before touching the database ────────────────────
  const validated = validateInquiry((await request.json()) as PublicInquiryInput)
  if ("error" in validated) return NextResponse.json({ error: validated.error }, { status: 400 })
  const input = validated.data

  // ── 2. Find the artist (everything else depends on it) ───────────────────
  const result = await findActiveArtistByCode(code)
  if ("error" in result) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status ?? 400 },
    )
  }
  const { supabase, artist } = result

  // ── 3. Independent reads in parallel ─────────────────────────────────────
  const requestedServiceIds = input.services
  const recentWindowStart = new Date(Date.now() - DUPLICATE_WINDOW_MS).toISOString()

  const [isReadOnly, servicesRes, customerRes, duplicateRes] = await Promise.all([
    checkIsReadOnly(supabase, artist.id),
    requestedServiceIds.length
      ? supabase.from("services").select("id, price").eq("user_id", artist.id).in("id", requestedServiceIds)
      : Promise.resolve({ data: [] as { id: number; price: number }[], error: null }),
    supabase.from("customers").select("id").eq("user_id", artist.id).eq("phone", input.phone).limit(1),
    // Recent open inquiry from the same phone number, matched through the customer join
    // so it can run in parallel with the customer lookup.
    supabase
      .from("inquiries")
      .select("id, customer:customers!inner(phone)")
      .eq("user_id", artist.id)
      .eq("status", "new")
      .eq("customer.phone", input.phone)
      .gte("created_at", recentWindowStart)
      .limit(1),
  ])

  if (isReadOnly) return NextResponse.json({ error: FORM_CLOSED_ERROR }, { status: 403 })

  const readError = servicesRes.error ?? customerRes.error ?? duplicateRes.error
  if (readError) return NextResponse.json({ error: readError.message }, { status: 400 })

  const selectedServices = servicesRes.data ?? []
  if (requestedServiceIds.length !== selectedServices.length) {
    return NextResponse.json({ error: "One or more selected services are invalid." }, { status: 400 })
  }
  if ((duplicateRes.data ?? []).length > 0) {
    return NextResponse.json(
      { error: "You already submitted an inquiry with this phone number. Please contact the artist for changes." },
      { status: 409 },
    )
  }

  // ── 4. Customer + inquiry ────────────────────────────────────────────────
  const customerDetails = {
    customer_name: input.customer_name,
    alt_phone: input.alt_phone,
    email: input.email,
    address: input.address,
  }
  const inquiryDetails = {
    user_id: artist.id,
    booking_address: input.address,
    booking_date: input.booking_date,
    start_time: input.start_time,
    end_time: input.end_time,
    additional_request: input.additional_request,
  }

  const existingCustomerId = customerRes.data?.[0]?.id as number | undefined
  let inquiryId: number

  if (existingCustomerId) {
    // Existing customer: refreshing their details and creating the inquiry are independent
    const [updateRes, inquiryRes] = await Promise.all([
      supabase.from("customers").update(customerDetails).eq("id", existingCustomerId).eq("user_id", artist.id),
      supabase.from("inquiries").insert({ ...inquiryDetails, customer_id: existingCustomerId }).select("id").single(),
    ])
    if (inquiryRes.error) return NextResponse.json({ error: inquiryRes.error.message }, { status: 400 })
    if (updateRes.error) {
      await supabase.from("inquiries").delete().eq("id", inquiryRes.data.id)
      return NextResponse.json({ error: updateRes.error.message }, { status: 400 })
    }
    inquiryId = inquiryRes.data.id
  } else {
    const createdRes = await supabase
      .from("customers")
      .insert({ ...customerDetails, user_id: artist.id, phone: input.phone })
      .select("id")
      .single()
    if (createdRes.error) return NextResponse.json({ error: createdRes.error.message }, { status: 400 })

    const inquiryRes = await supabase
      .from("inquiries")
      .insert({ ...inquiryDetails, customer_id: createdRes.data.id })
      .select("id")
      .single()
    if (inquiryRes.error) return NextResponse.json({ error: inquiryRes.error.message }, { status: 400 })
    inquiryId = inquiryRes.data.id
  }

  // ── 5. Selected services ─────────────────────────────────────────────────
  if (selectedServices.length > 0) {
    const priceById = new Map(selectedServices.map((service) => [service.id, service.price]))
    const { error: inquiryServicesError } = await supabase
      .from("inquiry_services")
      .insert(
        requestedServiceIds.map((serviceId) => ({
          inquiry_id: inquiryId,
          service_id: serviceId,
          quantity: 1,
          unit_price: priceById.get(serviceId) ?? 0,
        })),
      )

    if (inquiryServicesError) {
      await supabase.from("inquiries").delete().eq("id", inquiryId)
      return NextResponse.json({ error: inquiryServicesError.message }, { status: 400 })
    }
  }

  // ── 6. Notify the artist after the response is sent ──────────────────────
  // The WhatsApp send makes its own DB and network calls; the customer shouldn't wait for it.
  after(async () => {
    try {
      await sendInquiryNotificationWhatsApp(inquiryId, supabase)
    } catch (notifyErr) {
      console.error("[Inquiry Form] Failed to trigger WhatsApp notification:", notifyErr)
    }
  })

  // The public form only needs the new inquiry's id, so there is no re-fetch.
  return NextResponse.json({ inquiry: { id: inquiryId, status: "new" } })
}
