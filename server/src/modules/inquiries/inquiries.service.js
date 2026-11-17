import { createDbClient } from "#src/integrations/supabase.js"
import { ensureInquiryFormLink } from "#src/modules/inquiries/form-link.js"
import { validateInquiry } from "#src/modules/inquiries/inquiries.validation.js"
import {
  convertInquiryToBooking,
  formatInquiry,
  getInquiryForUser,
  INQUIRY_SELECT_FIELDS,
} from "#src/modules/inquiries/queries.js"
import { sendBookingNotificationWhatsApp } from "#src/shared/notifications/whatsapp/booking.js"
import { sendInquiryNotificationWhatsApp } from "#src/shared/notifications/whatsapp/inquiry.js"
import { assertWritable, checkIsReadOnly } from "#src/shared/subscription/read-only.js"
import { ApiError, badRequest, conflict, notFound } from "#src/utils/api-error.js"
import { runInBackground } from "#src/utils/background.js"
import { logger } from "#src/utils/logger.js"

const PAGE_SIZE = 20
const FORM_CLOSED_ERROR = "This inquiry form is not accepting submissions right now."
const DUPLICATE_WINDOW_MS = 24 * 60 * 60 * 1000

const log = logger.child({ module: "inquiries" })

// --- artist-facing ---------------------------------------------------------------------

/** → { inquiries, hasMore }. Search matches customer name/phone/email. */
export async function listInquiries(userId, { search, status, page }) {
  const supabase = createDbClient()
  const from = (page - 1) * PAGE_SIZE

  let customerIds = []
  if (search) {
    const { data, error } = await supabase
      .from("customers")
      .select("id")
      .eq("user_id", userId)
      .or(`customer_name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`)
    if (error) throw badRequest(error.message)

    customerIds = data?.map((c) => c.id) ?? []
    if (customerIds.length === 0) return { inquiries: [], hasMore: false }
  }

  let query = supabase
    .from("inquiries")
    .select(INQUIRY_SELECT_FIELDS, { count: "exact" })
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
  if (status !== "all") query = query.eq("status", status)
  if (search) query = query.in("customer_id", customerIds)

  const { data, count, error } = await query.range(from, from + PAGE_SIZE - 1)
  if (error) throw badRequest(error.message)

  return { inquiries: (data ?? []).map(formatInquiry), hasMore: (count ?? 0) > page * PAGE_SIZE }
}

/** New (unhandled) inquiries count. → { pending } */
export async function countPending(userId) {
  const { count, error } = await createDbClient()
    .from("inquiries")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "new")
  if (error) throw badRequest(error.message)
  return { pending: count ?? 0 }
}

export async function getFormLink(userId) {
  const result = await ensureInquiryFormLink(createDbClient(), userId)
  if (result.error) throw badRequest(result.error)
  return { code: result.code, is_active: true }
}

export async function activateFormLink(userId) {
  const supabase = createDbClient()
  await assertWritable(supabase, userId, "Your subscription has expired. Please upgrade to access inquiry links.")
  const result = await ensureInquiryFormLink(supabase, userId)
  if (result.error) throw badRequest(result.error)
  return { code: result.code, is_active: true }
}

/** Converts to a confirmed booking (WhatsApp confirmation in the background). → { inquiry, booking_id } */
export async function convertInquiry(userId, inquiryId) {
  const supabase = createDbClient()
  const [isReadOnly, inquiryRes] = await Promise.all([
    checkIsReadOnly(supabase, userId),
    getInquiryForUser(supabase, inquiryId, userId),
  ])

  if (isReadOnly) throw new ApiError(403, "Your subscription has expired. Please upgrade to create bookings.")
  if (inquiryRes.error) throw badRequest(inquiryRes.error.message)
  if (!inquiryRes.data) throw notFound("Inquiry not found.")

  const result = await convertInquiryToBooking(supabase, inquiryRes.data, userId)
  if (result.error) throw badRequest(result.error)

  if (result.booking_id) {
    const bookingId = result.booking_id
    runInBackground("converted-inquiry-confirmation-whatsapp", async () => {
      try {
        await sendBookingNotificationWhatsApp(bookingId, "confirmed", supabase)
      } catch (err) {
        log.error({ err, bookingId }, "WhatsApp confirmation for converted inquiry failed")
      }
    })
  }
  return result
}

export async function cancelInquiry(userId, inquiryId) {
  const supabase = createDbClient()
  await assertWritable(supabase, userId, "Your subscription has expired. Please upgrade to update inquiries.")

  const { data: existing, error: existingError } = await supabase
    .from("inquiries")
    .select("id, status")
    .eq("id", inquiryId)
    .eq("user_id", userId)
    .maybeSingle()
  if (existingError) throw badRequest(existingError.message)
  if (!existing) throw notFound("Inquiry not found.")
  if (existing.status === "booked") throw badRequest("Booked inquiries cannot be cancelled.")

  const { data, error } = await supabase
    .from("inquiries")
    .update({ status: "cancelled" })
    .eq("id", inquiryId)
    .eq("user_id", userId)
    .select(INQUIRY_SELECT_FIELDS)
    .single()
  if (error) throw badRequest(error.message)
  return { inquiry: formatInquiry(data) }
}

// --- public form (/api/public/inquiry/f/:code) -------------------------------------------

async function findArtistByFormCode(supabase, code) {
  const { data: artist, error } = await supabase
    .from("users")
    .select("id, artist_name, studio_name, address, phone")
    .eq("inquiry_form_code", String(code).trim().toUpperCase())
    .maybeSingle()

  if (error) throw badRequest(error.message)
  if (!artist) throw notFound("Inquiry link not found.")
  return artist
}

/** The artist's public card and services; closed (403) while the artist is read-only. */
export async function getPublicForm(code) {
  const supabase = createDbClient()
  const artist = await findArtistByFormCode(supabase, code)

  const [isReadOnly, servicesRes] = await Promise.all([
    checkIsReadOnly(supabase, artist.id),
    supabase
      .from("services")
      .select("id, service_name, duration_minutes, price")
      .eq("user_id", artist.id)
      .order("service_name", { ascending: true }),
  ])

  if (isReadOnly) throw new ApiError(403, FORM_CLOSED_ERROR)
  if (servicesRes.error) throw badRequest(servicesRes.error.message)
  return { artist, services: servicesRes.data ?? [] }
}

/**
 * Public submission: upserts the customer by phone, creates the inquiry and its services,
 * rejects a second open inquiry from the same phone within 24 h (409), then tells the
 * artist on WhatsApp in the background. → { inquiry: { id, status: "new" } }
 */
export async function submitPublicInquiry(code, body) {
  const validated = validateInquiry(body)
  if (validated.error) throw badRequest(validated.error)
  const input = validated.data

  const supabase = createDbClient()
  const artist = await findArtistByFormCode(supabase, code)

  const requestedServiceIds = input.services
  const recentWindowStart = new Date(Date.now() - DUPLICATE_WINDOW_MS).toISOString()

  const [isReadOnly, servicesRes, customerRes, duplicateRes] = await Promise.all([
    checkIsReadOnly(supabase, artist.id),
    requestedServiceIds.length
      ? supabase.from("services").select("id, price").eq("user_id", artist.id).in("id", requestedServiceIds)
      : Promise.resolve({ data: [], error: null }),
    supabase.from("customers").select("id").eq("user_id", artist.id).eq("phone", input.phone).limit(1),
    // Recent open inquiry from the same phone, matched through the customer join.
    supabase
      .from("inquiries")
      .select("id, customer:customers!inner(phone)")
      .eq("user_id", artist.id)
      .eq("status", "new")
      .eq("customer.phone", input.phone)
      .gte("created_at", recentWindowStart)
      .limit(1),
  ])

  if (isReadOnly) throw new ApiError(403, FORM_CLOSED_ERROR)
  const readError = servicesRes.error ?? customerRes.error ?? duplicateRes.error
  if (readError) throw badRequest(readError.message)

  const selectedServices = servicesRes.data ?? []
  if (requestedServiceIds.length !== selectedServices.length) {
    throw badRequest("One or more selected services are invalid.")
  }
  if ((duplicateRes.data ?? []).length > 0) {
    throw conflict("You already submitted an inquiry with this phone number. Please contact the artist for changes.")
  }

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

  const existingCustomerId = customerRes.data?.[0]?.id
  let inquiryId

  if (existingCustomerId) {
    const [updateRes, inquiryRes] = await Promise.all([
      supabase.from("customers").update(customerDetails).eq("id", existingCustomerId).eq("user_id", artist.id),
      supabase.from("inquiries").insert({ ...inquiryDetails, customer_id: existingCustomerId }).select("id").single(),
    ])
    if (inquiryRes.error) throw badRequest(inquiryRes.error.message)
    if (updateRes.error) {
      await supabase.from("inquiries").delete().eq("id", inquiryRes.data.id)
      throw badRequest(updateRes.error.message)
    }
    inquiryId = inquiryRes.data.id
  } else {
    const created = await supabase
      .from("customers")
      .insert({ ...customerDetails, user_id: artist.id, phone: input.phone })
      .select("id")
      .single()
    if (created.error) throw badRequest(created.error.message)

    const inquiryRes = await supabase
      .from("inquiries")
      .insert({ ...inquiryDetails, customer_id: created.data.id })
      .select("id")
      .single()
    if (inquiryRes.error) throw badRequest(inquiryRes.error.message)
    inquiryId = inquiryRes.data.id
  }

  if (selectedServices.length > 0) {
    const priceById = new Map(selectedServices.map((s) => [s.id, s.price]))
    const { error } = await supabase.from("inquiry_services").insert(
      requestedServiceIds.map((serviceId) => ({
        inquiry_id: inquiryId,
        service_id: serviceId,
        quantity: 1,
        unit_price: priceById.get(serviceId) ?? 0,
      }))
    )
    if (error) {
      await supabase.from("inquiries").delete().eq("id", inquiryId)
      throw badRequest(error.message)
    }
  }

  runInBackground("new-inquiry-whatsapp", async () => {
    try {
      await sendInquiryNotificationWhatsApp(inquiryId, supabase)
    } catch (err) {
      log.error({ err, inquiryId }, "new-inquiry WhatsApp notification failed")
    }
  })

  return { inquiry: { id: inquiryId, status: "new" } }
}
