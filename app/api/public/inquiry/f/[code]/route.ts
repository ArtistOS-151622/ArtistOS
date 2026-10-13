import { NextResponse, type NextRequest } from "next/server"

import { checkIsReadOnly } from "@/lib/auth/subscription"
import { INQUIRY_SELECT_FIELDS, formatInquiry } from "@/lib/inquiries/queries"
import { createClient } from "@/lib/supabase/server"

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
    .select("id, artist_name, studio_name, address")
    .eq("inquiry_form_code", normalizedCode)
    .maybeSingle()

  if (error) return { supabase, error: error.message }
  if (!artist) return { supabase, error: "Inquiry link not found.", status: 404 }

  return { supabase, artist }
}

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

  if (await checkIsReadOnly(supabase, artist.id)) {
    return NextResponse.json({ error: "This inquiry form is not accepting submissions right now." }, { status: 403 })
  }

  const { data: services, error: servicesError } = await supabase
    .from("services")
    .select("id, service_name, duration_minutes, price")
    .eq("user_id", artist.id)
    .order("service_name", { ascending: true })

  if (servicesError) return NextResponse.json({ error: servicesError.message }, { status: 400 })

  return NextResponse.json({
    artist,
    services: services ?? [],
  })
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { code } = await context.params
  const result = await findActiveArtistByCode(code)

  if ("error" in result) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status ?? 400 },
    )
  }

  const { supabase, artist } = result
  const body = (await request.json()) as PublicInquiryInput
  const validated = validateInquiry(body)

  if ("error" in validated) return NextResponse.json({ error: validated.error }, { status: 400 })

  if (await checkIsReadOnly(supabase, artist.id)) {
    return NextResponse.json({ error: "This inquiry form is not accepting submissions right now." }, { status: 403 })
  }

  const requestedServiceIds = validated.data.services
  const { data: selectedServices, error: servicesError } = requestedServiceIds.length
    ? await supabase
        .from("services")
        .select("id, price")
        .eq("user_id", artist.id)
        .in("id", requestedServiceIds)
    : { data: [], error: null }

  if (servicesError) return NextResponse.json({ error: servicesError.message }, { status: 400 })

  if (requestedServiceIds.length !== (selectedServices?.length ?? 0)) {
    return NextResponse.json({ error: "One or more selected services are invalid." }, { status: 400 })
  }

  const { data: existingCustomer, error: customerLookupError } = await supabase
    .from("customers")
    .select("id")
    .eq("user_id", artist.id)
    .eq("phone", validated.data.phone)
    .maybeSingle()

  if (customerLookupError) {
    return NextResponse.json({ error: customerLookupError.message }, { status: 400 })
  }

  let customerId = existingCustomer?.id

  if (customerId) {
    const recentWindowStart = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { data: duplicateInquiry, error: duplicateError } = await supabase
      .from("inquiries")
      .select("id")
      .eq("user_id", artist.id)
      .eq("customer_id", customerId)
      .eq("status", "new")
      .gte("created_at", recentWindowStart)
      .limit(1)
      .maybeSingle()

    if (duplicateError) {
      return NextResponse.json({ error: duplicateError.message }, { status: 400 })
    }

    if (duplicateInquiry) {
      return NextResponse.json(
        { error: "You already submitted an inquiry with this phone number. Please contact the artist for changes." },
        { status: 409 },
      )
    }

    const { error: updateCustomerError } = await supabase
      .from("customers")
      .update({
        customer_name: validated.data.customer_name,
        alt_phone: validated.data.alt_phone,
        email: validated.data.email,
        address: validated.data.address,
      })
      .eq("id", customerId)
      .eq("user_id", artist.id)

    if (updateCustomerError) {
      return NextResponse.json({ error: updateCustomerError.message }, { status: 400 })
    }
  } else {
    const { data: createdCustomer, error: createCustomerError } = await supabase
      .from("customers")
      .insert({
        user_id: artist.id,
        customer_name: validated.data.customer_name,
        phone: validated.data.phone,
        alt_phone: validated.data.alt_phone,
        email: validated.data.email,
        address: validated.data.address,
      })
      .select("id")
      .single()

    if (createCustomerError) {
      return NextResponse.json({ error: createCustomerError.message }, { status: 400 })
    }

    customerId = createdCustomer.id
  }

  const { data: inquiry, error: inquiryError } = await supabase
    .from("inquiries")
    .insert({
      user_id: artist.id,
      customer_id: customerId,
      booking_address: validated.data.address,
      booking_date: validated.data.booking_date,
      start_time: validated.data.start_time,
      end_time: validated.data.end_time,
      additional_request: validated.data.additional_request,
    })
    .select("id")
    .single()

  if (inquiryError) return NextResponse.json({ error: inquiryError.message }, { status: 400 })

  if (selectedServices && selectedServices.length > 0) {
    const priceById = new Map(selectedServices.map((service) => [service.id, service.price]))
    const { error: inquiryServicesError } = await supabase
      .from("inquiry_services")
      .insert(
        requestedServiceIds.map((serviceId) => ({
          inquiry_id: inquiry.id,
          service_id: serviceId,
          quantity: 1,
          unit_price: priceById.get(serviceId) ?? 0,
        })),
      )

    if (inquiryServicesError) {
      await supabase.from("inquiries").delete().eq("id", inquiry.id)
      return NextResponse.json({ error: inquiryServicesError.message }, { status: 400 })
    }
  }

  const { data: fullInquiry, error: fetchError } = await supabase
    .from("inquiries")
    .select(INQUIRY_SELECT_FIELDS)
    .eq("id", inquiry.id)
    .single()

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 400 })

  return NextResponse.json({ inquiry: formatInquiry(fullInquiry) })
}
