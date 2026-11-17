import { createDbClient } from "#src/integrations/supabase.js"
import {
  BOOKING_FORM_ADVANCE_REMARK,
  BOOKING_ROW_FIELDS,
  CHARGE_FIELDS,
  formatBookingResponse,
  getAdvancePayment,
  PAYMENT_FIELDS,
  validateBookingInput,
} from "#src/modules/bookings/booking-input.js"
import { bookingBelongsToUser } from "#src/modules/bookings/guards.js"
import { sendBookingNotificationWhatsApp } from "#src/shared/notifications/whatsapp/booking.js"
import { assertWritable, checkIsReadOnly } from "#src/shared/subscription/read-only.js"
import { ApiError, badRequest, notFound } from "#src/utils/api-error.js"
import { runInBackground } from "#src/utils/background.js"

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
// When searching, the customer join is !inner so the customer filter also filters bookings.
const LIST_SELECT = `${BOOKING_LIST_FIELDS}, customer:customers(customer_name, phone, email)`
const LIST_SELECT_SEARCH = `${BOOKING_LIST_FIELDS}, customer:customers!inner(customer_name, phone, email)`

const DETAIL_SELECT = `
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

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
/** The calendar asks for month ± 14 days (~62 days); this leaves headroom while blocking huge ranges. */
const MAX_RANGE_DAYS = 100
const MS_PER_DAY = 24 * 60 * 60 * 1000
// The list sort flips on "today" in the studio's timezone (hard-coded in the original route).
const LIST_TIMEZONE = "Asia/Kolkata"

const STAGE_MESSAGES = {
  create: {
    validation: "Booking creation failed while validating the request body",
    initial_reads: "Booking creation failed while loading subscription, service, or customer data",
    subscription_check: "Booking creation blocked by the artist subscription",
    services_lookup: "Booking creation failed while validating selected services",
    customer_lookup: "Booking creation failed while validating the selected customer",
    booking_insert: "Booking creation failed while saving the main booking record",
    booking_services_insert: "Booking creation failed while saving selected services",
    additional_charges_insert: "Booking creation failed while saving additional charges",
    advance_payment_insert: "Booking creation failed while saving the advance payment",
  },
  update: {
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
  },
}

function dbErrorDetails(cause) {
  if (!cause || typeof cause !== "object") return undefined
  const { name, message, code, details, hint } = cause
  return { name, message, code, details, hint }
}

/** Logs a failed create/update with its stage, then returns the ApiError to throw. */
function stageFailure(log, op, context) {
  return (stage, message, status = 400, cause) => {
    log.error(
      { op, stage, status, ...context, error: message, cause: dbErrorDetails(cause) },
      STAGE_MESSAGES[op][stage] ?? `Booking ${op} failed`
    )
    return new ApiError(status, message)
  }
}

const sanitizeSearch = (value) =>
  value
    .replace(/[,()"\\*]/g, " ")
    .replace(/\s+/g, " ")
    .trim()

function formatListedBooking(booking) {
  return {
    ...booking,
    services: (booking.booking_services ?? [])
      .filter((bs) => bs.service?.id)
      .map((bs) => ({ ...bs.service, quantity: bs.quantity ?? 1, price: bs.unit_price ?? bs.service?.price ?? 0 })),
    additional_charges: booking.booking_additional_charges ?? [],
  }
}

/**
 * Bookings in a required date range (≤ 100 days). Past-only ranges list newest
 * first; ranges touching today or later list soonest first. → { bookings, hasMore: false }
 */
export async function listBookings(userId, { search: rawSearch, status, startDate, endDate }) {
  const search = sanitizeSearch(rawSearch)

  if (!DATE_PATTERN.test(startDate) || !DATE_PATTERN.test(endDate)) {
    throw badRequest("start_date and end_date are required (YYYY-MM-DD).")
  }
  const rangeDays = (Date.parse(endDate) - Date.parse(startDate)) / MS_PER_DAY
  if (!Number.isFinite(rangeDays) || rangeDays < 0) throw badRequest("end_date must be on or after start_date.")
  if (rangeDays > MAX_RANGE_DAYS) throw badRequest(`Date range cannot exceed ${MAX_RANGE_DAYS} days.`)

  const today = new Date().toLocaleDateString("en-CA", { timeZone: LIST_TIMEZONE })
  const ascending = endDate >= today

  let query = createDbClient()
    .from("bookings")
    .select(search ? LIST_SELECT_SEARCH : LIST_SELECT)
    .eq("user_id", userId)
    .gte("booking_date", startDate)
    .lte("booking_date", endDate)

  if (search) {
    query = query.or(`customer_name.ilike.%${search}%,phone.ilike.%${search}%`, { referencedTable: "customer" })
  }
  if (status !== "all") query = query.eq("status", status)

  const { data, error } = await query.order("booking_date", { ascending }).order("start_time", { ascending })
  if (error) throw badRequest(error.message)

  const bookings = (data ?? []).map((b) => ({
    ...formatListedBooking(b),
    advance_payment: getAdvancePayment(b.booking_payments),
  }))
  // hasMore kept for response compatibility; results are bounded by the date range.
  return { bookings, hasMore: false }
}

/** Number of bookings per date in a range. → { counts: [{ date, count }] } */
export async function countBookingsByDate(userId, { startDate, endDate, status }) {
  if (!startDate || !endDate) throw badRequest("start_date and end_date are required")

  let query = createDbClient()
    .from("bookings")
    .select("booking_date")
    .eq("user_id", userId)
    .gte("booking_date", startDate)
    .lte("booking_date", endDate)
  if (status && status !== "all") query = query.eq("status", status)

  const { data, error } = await query
  if (error) throw badRequest(error.message)

  const counts = {}
  for (const { booking_date } of data || []) counts[booking_date] = (counts[booking_date] || 0) + 1
  return { counts: Object.entries(counts).map(([date, count]) => ({ date, count })) }
}

/** One booking with services/charges and its per-artist number (user_booking_index). */
export async function getBookingDetail(userId, id) {
  const supabase = createDbClient()
  const [{ data, error }, { count }] = await Promise.all([
    supabase.from("bookings").select(DETAIL_SELECT).eq("id", id).eq("user_id", userId).maybeSingle(),
    supabase.from("bookings").select("id", { count: "exact", head: true }).eq("user_id", userId).lte("id", id),
  ])

  if (error) throw badRequest(error.message)
  if (!data) throw notFound("Booking not found.")
  return { booking: { ...formatListedBooking(data), user_booking_index: count ?? id } }
}

function scheduleConfirmation(log, supabase, bookingId, context) {
  runInBackground("booking-confirmation-whatsapp", async () => {
    try {
      await sendBookingNotificationWhatsApp(bookingId, "confirmed", supabase)
    } catch (err) {
      log.error({ ...context, bookingId, err }, "WhatsApp confirmation failed")
    }
  })
}

/**
 * Creates a booking with its services, extra charges and optional advance payment.
 * Child rows are inserted in parallel; if any fails the booking is deleted (children
 * cascade). A confirmed booking triggers the WhatsApp confirmation in the background.
 */
export async function createBooking(userId, body, { requestId, log }) {
  const context = { requestId, userId }
  const fail = stageFailure(log, "create", context)

  const parsed = validateBookingInput(body)
  if (parsed.error) throw fail("validation", parsed.error)
  const input = parsed.data

  log.info(
    {
      ...context,
      serviceCount: input.services.length,
      hasAdvancePayment: input.advancePayment > 0,
      additionalChargeCount: input.additionalCharges.length,
    },
    "booking create: validated, starting"
  )

  const supabase = createDbClient()
  // Services and customer are scoped to the artist so another artist's ids are rejected.
  const [isReadOnly, servicesRes, customerRes] = await Promise.all([
    checkIsReadOnly(supabase, userId),
    supabase.from("services").select("id, service_name, price").eq("user_id", userId).in("id", input.serviceIds),
    supabase
      .from("customers")
      .select("customer_name, phone, email")
      .eq("id", input.bookingFields.customer_id)
      .eq("user_id", userId)
      .maybeSingle(),
  ])

  if (isReadOnly) {
    throw fail("subscription_check", "Your subscription has expired. Please upgrade to create bookings.", 403)
  }
  if (servicesRes.error) throw fail("services_lookup", servicesRes.error.message, 400, servicesRes.error)
  if (customerRes.error) throw fail("customer_lookup", customerRes.error.message, 400, customerRes.error)
  if (!customerRes.data) throw fail("customer_lookup", "Customer not found.")
  if ((servicesRes.data ?? []).length !== input.serviceIds.length) {
    throw fail("services_lookup", "One or more selected services are invalid.")
  }

  const serviceMap = new Map(servicesRes.data.map((s) => [s.id, s]))

  const { data: booking, error: insertError } = await supabase
    .from("bookings")
    .insert({ user_id: userId, ...input.bookingFields })
    .select(BOOKING_ROW_FIELDS)
    .single()
  if (insertError) throw fail("booking_insert", insertError.message, 400, insertError)

  const serviceRows = input.services.map(({ service_id, quantity }) => ({
    booking_id: booking.id,
    service_id,
    quantity,
    unit_price: serviceMap.get(service_id)?.price ?? 0,
  }))
  const none = Promise.resolve({ data: [], error: null })

  const [servicesInsert, chargesInsert, paymentInsert] = await Promise.all([
    supabase.from("booking_services").insert(serviceRows),
    input.additionalCharges.length > 0
      ? supabase
          .from("booking_additional_charges")
          .insert(input.additionalCharges.map((c) => ({ ...c, user_id: userId, booking_id: booking.id })))
          .select(CHARGE_FIELDS)
      : none,
    input.advancePayment > 0
      ? supabase
          .from("booking_payments")
          .insert({
            user_id: userId,
            booking_id: booking.id,
            payment_type: "Advance",
            payment_method: input.advancePaymentMethod,
            amount: input.advancePayment,
            payment_date: input.advancePaymentDate,
            remark: BOOKING_FORM_ADVANCE_REMARK,
          })
          .select(PAYMENT_FIELDS)
      : none,
  ])

  const childError = servicesInsert.error ?? chargesInsert.error ?? paymentInsert.error
  if (childError) {
    const stage = servicesInsert.error
      ? "booking_services_insert"
      : chargesInsert.error
        ? "additional_charges_insert"
        : "advance_payment_insert"
    // Child tables cascade on delete, so removing the booking cleans up partial inserts.
    const cleanup = await supabase.from("bookings").delete().eq("id", booking.id)
    if (cleanup.error) {
      log.error({ ...context, stage, bookingId: booking.id, cause: dbErrorDetails(cleanup.error) }, "booking create cleanup failed")
    }
    throw fail(stage, childError.message, 400, childError)
  }

  const formatted = formatBookingResponse({
    booking,
    customer: customerRes.data,
    serviceRows,
    serviceMap,
    charges: chargesInsert.data ?? [],
    payments: paymentInsert.data ?? [],
  })

  if (booking.status === "confirmed") scheduleConfirmation(log, supabase, booking.id, context)

  log.info({ ...context, bookingId: booking.id }, "booking created")
  return { booking: formatted, requestId }
}

/**
 * Updates a booking and syncs its services (upsert kept/new, delete removed; existing
 * services keep their booked price), extra charges (insert new set, then delete old)
 * and the booking-form advance payment. Newly confirmed → WhatsApp confirmation.
 */
export async function updateBooking(userId, id, body, { requestId, log }) {
  const context = { requestId, userId, bookingId: id }
  const fail = stageFailure(log, "update", context)

  const parsed = validateBookingInput(body)
  if (parsed.error) throw fail("validation", parsed.error)
  const input = parsed.data

  log.info(
    {
      ...context,
      serviceCount: input.services.length,
      hasAdvancePayment: input.advancePayment > 0,
      additionalChargeCount: input.additionalCharges.length,
    },
    "booking update: validated, starting"
  )

  const supabase = createDbClient()
  const [isReadOnly, bookingRes, customerRes, servicesRes, existingServicesRes, existingChargesRes, paymentsRes] =
    await Promise.all([
      checkIsReadOnly(supabase, userId),
      // Ownership + previous status (for "newly confirmed").
      supabase.from("bookings").select("id, status").eq("id", id).eq("user_id", userId).maybeSingle(),
      supabase
        .from("customers")
        .select("customer_name, phone, email")
        .eq("id", input.bookingFields.customer_id)
        .eq("user_id", userId)
        .maybeSingle(),
      supabase.from("services").select("id, service_name, price").eq("user_id", userId).in("id", input.serviceIds),
      supabase.from("booking_services").select("service_id, unit_price").eq("booking_id", id),
      supabase.from("booking_additional_charges").select("id").eq("booking_id", id).eq("user_id", userId),
      supabase.from("booking_payments").select(PAYMENT_FIELDS).eq("booking_id", id).eq("user_id", userId),
    ])

  if (isReadOnly) throw fail("subscription_check", "Your subscription has expired. Please upgrade to edit bookings.", 403)
  for (const [stage, res] of [
    ["booking_lookup", bookingRes],
    ["customer_lookup", customerRes],
    ["services_lookup", servicesRes],
    ["existing_services_lookup", existingServicesRes],
    ["existing_charges_lookup", existingChargesRes],
    ["existing_payments_lookup", paymentsRes],
  ]) {
    if (res.error) throw fail(stage, res.error.message, 400, res.error)
  }
  if (!bookingRes.data) throw fail("booking_lookup", "Booking not found.", 404)
  if (!customerRes.data) throw fail("customer_lookup", "Customer not found.")
  if ((servicesRes.data ?? []).length !== input.serviceIds.length) {
    throw fail("services_lookup", "One or more selected services are invalid.")
  }

  const previousStatus = bookingRes.data.status
  const serviceMap = new Map(servicesRes.data.map((s) => [s.id, s]))
  const existingServices = existingServicesRes.data ?? []
  const existingPriceMap = new Map(existingServices.map((es) => [es.service_id, es.unit_price]))
  const oldChargeIds = (existingChargesRes.data ?? []).map((c) => c.id)
  const existingPayments = paymentsRes.data ?? []

  const serviceRows = input.services.map(({ service_id, quantity }) => ({
    booking_id: id,
    service_id,
    quantity,
    unit_price: existingPriceMap.get(service_id) ?? serviceMap.get(service_id)?.price ?? 0,
  }))
  const requested = new Set(input.serviceIds)
  const removedServiceIds = existingServices.map((es) => es.service_id).filter((sid) => !requested.has(sid))

  // Prefer the advance id the client sent, if it belongs to this booking.
  const requestedAdvanceId = Number(body.advance_payment_id)
  const existingAdvance =
    existingPayments.find((p) => p.id === requestedAdvanceId) ??
    existingPayments.find((p) => p.payment_type === "Advance" && p.remark === BOOKING_FORM_ADVANCE_REMARK) ??
    null

  // Insert the new charge set first, then delete the old rows: a failed insert leaves the old ones.
  async function syncCharges() {
    let inserted = []
    if (input.additionalCharges.length > 0) {
      const res = await supabase
        .from("booking_additional_charges")
        .insert(input.additionalCharges.map((c) => ({ ...c, user_id: userId, booking_id: id })))
        .select(CHARGE_FIELDS)
      if (res.error) return { data: [], error: res.error }
      inserted = res.data ?? []
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

  async function syncAdvance() {
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
      return { data: existingPayments.map((p) => (p.id === res.data.id ? res.data : p)), error: null }
    }
    if (input.advancePayment > 0) {
      const res = await supabase
        .from("booking_payments")
        .insert({ ...advanceFields, user_id: userId, booking_id: id })
        .select(PAYMENT_FIELDS)
        .single()
      if (res.error) return { data: existingPayments, error: res.error }
      return { data: [...existingPayments, res.data], error: null }
    }
    return { data: existingPayments, error: null }
  }

  // Upsert kept/new services and delete only removed ones (never leaves zero services).
  const [updateRes, upsertRes, removeRes, chargesRes, advanceRes] = await Promise.all([
    supabase
      .from("bookings")
      .update(input.bookingFields)
      .eq("id", id)
      .eq("user_id", userId)
      .select(BOOKING_ROW_FIELDS)
      .single(),
    supabase.from("booking_services").upsert(serviceRows, { onConflict: "booking_id,service_id" }),
    removedServiceIds.length > 0
      ? supabase.from("booking_services").delete().eq("booking_id", id).in("service_id", removedServiceIds)
      : Promise.resolve({ error: null }),
    syncCharges(),
    syncAdvance(),
  ])

  for (const [stage, res] of [
    ["booking_update", updateRes],
    ["booking_services_upsert", upsertRes],
    ["removed_services_delete", removeRes],
    ["additional_charges_sync", chargesRes],
    ["advance_payment_sync", advanceRes],
  ]) {
    if (res.error) throw fail(stage, res.error.message, 400, res.error)
  }
  if (!updateRes.data) throw fail("booking_update", "Booking not found.", 404)

  const formatted = formatBookingResponse({
    booking: updateRes.data,
    customer: customerRes.data,
    serviceRows,
    serviceMap,
    charges: chargesRes.data,
    payments: advanceRes.data,
  })

  if (input.bookingFields.status === "confirmed" && previousStatus !== "confirmed") {
    scheduleConfirmation(log, supabase, id, context)
  }

  log.info(context, "booking updated")
  return { booking: formatted, requestId }
}

export async function deleteBooking(userId, id) {
  const supabase = createDbClient()
  await assertWritable(supabase, userId, "Your subscription has expired. Please upgrade to delete bookings.")

  const { error } = await supabase.from("bookings").delete().eq("id", id).eq("user_id", userId)
  if (error) throw badRequest(error.message)
  return { success: true }
}

export async function updateDiscount(userId, bookingId, rawDiscount) {
  const discount = Number(rawDiscount)
  if (Number.isNaN(discount) || discount < 0) throw badRequest("Discount must be a positive number.")

  const supabase = createDbClient()
  await assertWritable(supabase, userId, "Your subscription has expired. Please upgrade to update booking discounts.")

  const { data, error } = await supabase
    .from("bookings")
    .update({ discount })
    .eq("id", bookingId)
    .eq("user_id", userId)
    .select("id, discount")
    .single()

  if (error) throw badRequest(error.message)
  if (!data) throw notFound("Booking not found.")
  return { success: true, discount: data.discount }
}

/**
 * Replaces the booking's services with `services` ([{ service_id, quantity, unit_price }]):
 * upserts the given rows and deletes the rest. All services must be the artist's.
 */
export async function syncBookingServices(userId, bookingId, services) {
  if (!Array.isArray(services)) throw badRequest("Services must be an array.")
  if (services.some((s) => !Number.isInteger(Number(s?.quantity)) || Number(s.quantity) < 1)) {
    throw badRequest("Service quantity must be a whole number of at least 1.")
  }

  const rows = services.map((s) => ({
    booking_id: bookingId,
    service_id: Number(s.service_id),
    quantity: Number(s.quantity) || 1,
    unit_price: Number(s.unit_price) || 0,
  }))
  const serviceIds = rows.map((r) => r.service_id)
  if (serviceIds.some((sid) => !Number.isInteger(sid))) throw badRequest("One or more selected services are invalid.")
  if (new Set(serviceIds).size !== serviceIds.length) {
    throw badRequest("Each service can only be added once. Use quantity instead.")
  }

  const supabase = createDbClient()
  const [isReadOnly, owns, ownedServicesRes] = await Promise.all([
    checkIsReadOnly(supabase, userId),
    bookingBelongsToUser(supabase, bookingId, userId),
    serviceIds.length > 0
      ? supabase.from("services").select("id").eq("user_id", userId).in("id", serviceIds)
      : Promise.resolve({ data: [], error: null }),
  ])

  if (isReadOnly) throw new ApiError(403, "Your subscription has expired. Please upgrade to update booking services.")
  if (!owns) throw notFound("Booking not found.")
  if (ownedServicesRes.error) throw badRequest(ownedServicesRes.error.message)
  if ((ownedServicesRes.data ?? []).length !== serviceIds.length) {
    throw badRequest("One or more selected services are invalid.")
  }

  let removeQuery = supabase.from("booking_services").delete().eq("booking_id", bookingId)
  if (serviceIds.length > 0) removeQuery = removeQuery.not("service_id", "in", `(${serviceIds.join(",")})`)

  const [upsertRes, removeRes] = await Promise.all([
    rows.length > 0
      ? supabase.from("booking_services").upsert(rows, { onConflict: "booking_id,service_id" })
      : Promise.resolve({ error: null }),
    removeQuery,
  ])

  const writeError = upsertRes.error ?? removeRes.error
  if (writeError) throw badRequest(writeError.message)
  return { success: true }
}

/** Manually sends the one-day WhatsApp reminder for a confirmed booking. */
export async function sendWhatsAppReminder(userId, id) {
  const supabase = createDbClient()
  const { data: booking, error } = await supabase
    .from("bookings")
    .select("id, user_id, status")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle()

  if (error || !booking) throw notFound("Booking not found")
  if (booking.status !== "confirmed") throw badRequest("WhatsApp reminder can only be sent for confirmed bookings.")

  const result = await sendBookingNotificationWhatsApp(id, "reminder_24h", supabase)
  if (!result.success) {
    throw new ApiError(400, result.error || "Failed to send WhatsApp reminder", { extra: { success: false } })
  }
  return { success: true, bookingId: id, templateName: result.templateName ?? "one_day_reminder_to_customer" }
}
