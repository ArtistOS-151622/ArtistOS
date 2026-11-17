import { createPreferredClient } from "#src/integrations/supabase.js"
import { formatWhatsAppPhoneNumber, sendWhatsAppTemplate } from "#src/integrations/whatsapp.js"
import { recordWhatsAppEvent } from "#src/shared/notifications/events.js"
import {
  APP_TIMEZONE,
  formatDisplayDate,
  formatDisplayTime,
  getMinutesUntilBooking,
  toWallClock,
} from "#src/shared/notifications/time.js"
import { getUserPlanFeatures } from "#src/shared/subscription/plan-features.js"
import { logger } from "#src/utils/logger.js"

const log = logger.child({ feature: "whatsapp-booking" })

/** Triggers: "confirmed" | "reminder_24h" | "one_day_reminder" | "one_day_reminder_to_customer". */
const ONE_DAY_REMINDER_TRIGGERS = new Set(["reminder_24h", "one_day_reminder", "one_day_reminder_to_customer"])

const TEMPLATES = Object.freeze({
  confirmed: "booking_confirmed",
  confirmedWithLocation: "booking_confirmed_with_location",
  reminder: "one_day_reminder_to_customer",
  reminderWithLink: "one_day_reminder_to_customer_with_link",
})

const REMINDER_MAX_ATTEMPTS = 3
const DAY_MINUTES = 24 * 60
const DAY_MS = DAY_MINUTES * 60 * 1000

const BOOKING_SELECT = `
  id,
  user_id,
  customer_id,
  booking_date,
  start_time,
  status,
  discount,
  customer:customers(customer_name, phone),
  artist:users(id, artist_name, studio_name, phone, address, google_maps_url),
  booking_services(
    quantity,
    unit_price,
    service:services(service_name, price)
  ),
  booking_additional_charges(quantity, rate)
`

const firstOf = (value) => (Array.isArray(value) ? value[0] : value)

function bookingTotal(booking) {
  let servicesTotal = 0
  const serviceNames = []
  for (const item of Array.isArray(booking.booking_services) ? booking.booking_services : []) {
    if (item?.service?.service_name) serviceNames.push(item.service.service_name)
    servicesTotal += Number(item?.unit_price ?? item?.service?.price ?? 0) * Number(item?.quantity || 1)
  }

  let chargesTotal = 0
  for (const charge of Array.isArray(booking.booking_additional_charges) ? booking.booking_additional_charges : []) {
    chargesTotal += Number(charge?.rate || 0) * Number(charge?.quantity || 1)
  }

  const grandTotal = Math.max(0, servicesTotal + chargesTotal - Number(booking.discount || 0))
  return { serviceNames, grandTotal }
}

/**
 * Sends the booking confirmation, or the one-day reminder, to the customer.
 * Pro-plan feature. Uses the "_with_location"/"_with_link" template variant when the
 * artist has a Google Maps URL. Never throws: resolves to { success, error?, templateName? }.
 */
export async function sendBookingNotificationWhatsApp(bookingId, trigger, existingSupabase) {
  try {
    const supabase = existingSupabase ?? createPreferredClient()

    const { data: booking, error: fetchError } = await supabase
      .from("bookings")
      .select(BOOKING_SELECT)
      .eq("id", Number(bookingId))
      .maybeSingle()

    if (fetchError || !booking) {
      log.warn({ bookingId }, "booking not found for notification")
      return { success: false, error: "Booking not found" }
    }

    const planFeatures = await getUserPlanFeatures(supabase, booking.user_id)
    if (!planFeatures.hasWhatsAppAutomation) {
      log.info({ userId: booking.user_id, plan: planFeatures.planName }, "plan has no WhatsApp automation; skipping")
      return {
        success: false,
        error: "Automated WhatsApp booking notifications are only available on the Pro plan.",
      }
    }

    const customer = firstOf(booking.customer)
    const artist = firstOf(booking.artist)

    if (!customer?.phone) {
      log.info({ bookingId }, "customer has no phone; skipping")
      return { success: false, error: "No customer phone" }
    }

    const formattedPhone = formatWhatsAppPhoneNumber(customer.phone)
    if (!formattedPhone) {
      log.warn({ bookingId }, "invalid customer phone; skipping")
      return { success: false, error: "Invalid customer phone" }
    }

    const isOneDayReminder = ONE_DAY_REMINDER_TRIGGERS.has(trigger)
    if (isOneDayReminder && booking.status !== "confirmed") {
      log.info({ bookingId, status: booking.status }, "booking not confirmed; skipping 24h reminder")
      return { success: false, error: "24-hour reminder can only be sent for confirmed bookings." }
    }

    const mapsUrl = artist?.google_maps_url?.trim()
    const templateName = isOneDayReminder
      ? mapsUrl
        ? TEMPLATES.reminderWithLink
        : TEMPLATES.reminder
      : mapsUrl
        ? TEMPLATES.confirmedWithLocation
        : TEMPLATES.confirmed

    const { serviceNames, grandTotal } = bookingTotal(booking)

    // Shared parameter order of the confirmation and reminder templates:
    // customer, artist, studio, date, time, services, total (no ₹: the template has it),
    // studio phone, studio address[, maps url].
    const bodyParameters = [
      customer?.customer_name?.trim() || "Customer",
      artist?.artist_name?.trim() || "Artist Studio",
      artist?.studio_name?.trim() || artist?.artist_name?.trim() || "Studio",
      formatDisplayDate(booking.booking_date),
      formatDisplayTime(booking.start_time),
      serviceNames.length > 0 ? serviceNames.join(", ") : "Appointment Service",
      Math.round(grandTotal).toLocaleString("en-IN"),
      artist?.phone?.trim() || "Not provided",
      artist?.address?.trim() || "Not provided",
    ]
    if (mapsUrl) bodyParameters.push(mapsUrl)

    log.info({ bookingId: booking.id, templateName }, "sending booking notification")
    const result = await sendWhatsAppTemplate({ to: formattedPhone, templateName, bodyParameters })

    await recordWhatsAppEvent(
      supabase,
      {
        userId: booking.user_id,
        eventType: templateName,
        entityType: "booking",
        entityId: booking.id,
        title: isOneDayReminder ? "1-Day Booking Reminder" : "Booking Confirmed",
        body: `WhatsApp sent to ${formattedPhone} for booking #${booking.id}`,
        result,
      },
      log
    )

    return { ...result, templateName }
  } catch (err) {
    log.error({ err, bookingId }, "error processing booking notification")
    return { success: false, error: err?.message || "Internal error sending WhatsApp notification" }
  }
}

/** Sends the one-day reminder template for a booking. */
export function sendOneDayBookingReminderWhatsApp(bookingId, existingSupabase) {
  return sendBookingNotificationWhatsApp(bookingId, "reminder_24h", existingSupabase)
}

/**
 * Cron: sends the one-day reminder to customers of confirmed bookings starting
 * within the next 24 hours (tomorrow onward, never today). Pro-plan artists only;
 * deduplicated via notification_events; gives up after 3 failed attempts.
 * Returns { scanned, sent, failed, skipped, details: [{ bookingId, status, reason? }] }.
 */
export async function scanCustomerWhatsAppReminders(supabase) {
  const now = new Date()
  const nowLocal = toWallClock(now, APP_TIMEZONE)
  const tomorrowLocal = toWallClock(new Date(now.getTime() + DAY_MS), APP_TIMEZONE)
  const lookaheadLocal = toWallClock(new Date(now.getTime() + 2 * DAY_MS), APP_TIMEZONE)

  const { data: bookings, error } = await supabase
    .from("bookings")
    .select(`
      id,
      user_id,
      customer_id,
      booking_date,
      start_time,
      status
    `)
    .eq("status", "confirmed")
    .gte("booking_date", tomorrowLocal.date)
    .lte("booking_date", lookaheadLocal.date)

  if (error) {
    log.error({ error }, "reminder scan: failed to query bookings")
    throw new Error(`Failed to query bookings for WhatsApp reminders: ${error.message}`)
  }

  const result = { scanned: bookings?.length || 0, sent: 0, failed: 0, skipped: 0, details: [] }
  const skip = (bookingId, reason) => {
    result.skipped += 1
    result.details.push({ bookingId, status: "skipped", reason })
  }

  for (const booking of bookings ?? []) {
    if (booking.status !== "confirmed") {
      skip(booking.id, "Booking is not confirmed")
      continue
    }
    if (booking.booking_date <= nowLocal.date) {
      skip(booking.id, "Booking is today or in the past")
      continue
    }

    const diffMinutes = getMinutesUntilBooking(
      booking.booking_date,
      booking.start_time || "09:00",
      nowLocal.date,
      nowLocal.time
    )
    if (diffMinutes <= 0) {
      skip(booking.id, "Booking already started/passed")
      continue
    }

    const artistPlan = await getUserPlanFeatures(supabase, booking.user_id)
    if (!artistPlan.hasWhatsAppAutomation) {
      skip(booking.id, `Artist on "${artistPlan.planName}" plan (WhatsApp auto reminders require Pro plan)`)
      continue
    }

    if (diffMinutes > DAY_MINUTES) {
      skip(booking.id, `More than 24h away (${diffMinutes}m remaining)`)
      continue
    }

    const findReminderLog = (eventType) =>
      supabase
        .from("notification_events")
        .select("id, status, attempts")
        .eq("user_id", booking.user_id)
        .eq("channel", "whatsapp")
        .eq("event_type", eventType)
        .eq("entity_type", "booking")
        .eq("entity_id", booking.id)
        .maybeSingle()

    const logs = (
      await Promise.all([findReminderLog(TEMPLATES.reminder), findReminderLog(TEMPLATES.reminderWithLink)])
    )
      .map(({ data }) => data)
      .filter(Boolean)

    if (logs.some((entry) => entry.status === "sent")) {
      skip(booking.id, "Reminder already sent")
      continue
    }
    if (logs.some((entry) => entry.status === "failed" && (entry.attempts || 0) >= REMINDER_MAX_ATTEMPTS)) {
      skip(booking.id, `Exceeded max attempts (${REMINDER_MAX_ATTEMPTS})`)
      continue
    }

    log.info({ bookingId: booking.id, diffMinutes }, "sending 24h reminder")
    const sendRes = await sendBookingNotificationWhatsApp(booking.id, "reminder_24h", supabase)

    if (sendRes.success) {
      result.sent += 1
      result.details.push({ bookingId: booking.id, status: "sent" })
    } else {
      result.failed += 1
      result.details.push({ bookingId: booking.id, status: "failed", reason: sendRes.error })
    }
  }

  return result
}
