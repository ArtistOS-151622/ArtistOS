import { config } from "#src/config/env.js"
import {
  formatWhatsAppPhoneNumber,
  sanitizeWhatsAppParam,
  sendWhatsAppTemplate,
} from "#src/integrations/whatsapp.js"
import {
  APP_TIMEZONE,
  formatDisplayDate,
  formatDisplayTime,
  toWallClock,
} from "#src/shared/notifications/time.js"
import { getUserPlanFeatures } from "#src/shared/subscription/plan-features.js"
import { logger } from "#src/utils/logger.js"

const log = logger.child({ feature: "whatsapp-daily-agenda" })

const AGENDA_MAX_ATTEMPTS = 3

// Every event_type/entity_type an agenda row has ever been logged under (dedupe must see them all).
const LEGACY_AGENDA_EVENT_TYPES = [
  "today_bookings_to_artist",
  "artist_daily_agenda",
  "artist_morning_summary",
  "no_bookings_today_to_artist",
  "artist_no_bookings_today",
]
const AGENDA_ENTITY_TYPES = ["artist_daily_agenda", "artist_daily_agenda_empty", "artist_no_bookings_today"]

const BOOKINGS_SELECT = `
  id,
  user_id,
  customer_id,
  booking_date,
  start_time,
  end_time,
  booking_address,
  status,
  customer:customers(
    customer_name,
    phone
  ),
  artist:users(
    id,
    artist_name,
    studio_name,
    phone,
    is_free_user
  ),
  booking_services(
    quantity,
    unit_price,
    service:services(
      service_name,
      price
    )
  )
`

const firstOf = (value) => (Array.isArray(value) ? value[0] : value)

function firstBookingSummary(booking) {
  const time = formatDisplayTime(booking?.start_time || "09:00")
  const customer = firstOf(booking?.customer)
  const customerName = customer?.customer_name?.trim() || "Customer"
  const customerPhone = customer?.phone?.trim() ? ` (${customer.phone.trim()})` : ""

  const services = (Array.isArray(booking?.booking_services) ? booking.booking_services : [])
    .map((item) => item?.service?.service_name)
    .filter(Boolean)
  const serviceStr = services.length > 0 ? services.join(", ") : "Appointment"
  const addressStr = booking?.booking_address?.trim() ? `, ${booking.booking_address.trim()}` : ""

  return sanitizeWhatsAppParam(`${time} - ${customerName}${customerPhone} - ${serviceStr}${addressStr}`)
}

/** Every user with a phone, plus any artist embedded in the day's bookings. */
async function collectArtists(supabase, bookings) {
  const artists = new Map()
  try {
    const usersQuery = supabase.from("users").select("id, artist_name, studio_name, phone, is_free_user")
    const { data, error } =
      typeof usersQuery?.then === "function" ? await usersQuery : { data: null, error: null }

    if (!error && Array.isArray(data)) {
      for (const user of data) if (user?.id && user?.phone) artists.set(user.id, user)
    }
  } catch (err) {
    log.warn({ err }, "failed to query users")
  }

  for (const booking of bookings) {
    const artist = firstOf(booking?.artist)
    if (artist?.id && !artists.has(artist.id)) artists.set(artist.id, artist)
  }
  return artists
}

/**
 * Cron (morning): WhatsApps each eligible artist their day. With confirmed bookings
 * → "today_bookings_to_artist" [artist, date, count, first booking]; without →
 * "no_bookings_today_to_artist" [artist, date]. Eligible = WhatsApp automation and
 * not read-only. Deduplicated per artist per date. `customDate` overrides "today".
 * Returns { scannedArtists, sent, failed, skipped, details: [{ artistId, status, reason?, bookingsCount? }] }.
 */
export async function scanDailyArtistAgenda(supabase, customDate) {
  const targetDate = customDate || toWallClock(new Date(), APP_TIMEZONE).date
  const { dailyAgendaTemplate, noBookingsTemplate } = config.whatsapp

  const { data: bookings, error: bookingsError } = await supabase
    .from("bookings")
    .select(BOOKINGS_SELECT)
    .eq("status", "confirmed")
    .eq("booking_date", targetDate)
    .order("start_time", { ascending: true })

  if (bookingsError) {
    log.error({ error: bookingsError }, "failed to query bookings")
    throw new Error(`Failed to query daily bookings: ${bookingsError.message}`)
  }

  const bookingsByArtist = new Map()
  for (const booking of bookings || []) {
    const list = bookingsByArtist.get(booking.user_id) || []
    list.push(booking)
    bookingsByArtist.set(booking.user_id, list)
  }

  const artists = await collectArtists(supabase, bookings || [])
  const result = { scannedArtists: artists.size, sent: 0, failed: 0, skipped: 0, details: [] }

  for (const artist of artists.values()) {
    const artistId = Number(artist.id)
    const artistBookings = bookingsByArtist.get(artistId) || []
    const totalCount = artistBookings.length
    const hasBookings = totalCount > 0
    const templateName = hasBookings ? dailyAgendaTemplate : noBookingsTemplate

    const skip = (reason) => {
      result.skipped += 1
      result.details.push({ artistId, status: "skipped", reason, bookingsCount: totalCount })
    }

    if (!artist?.phone) {
      skip("Artist has no phone number")
      continue
    }
    const formattedPhone = formatWhatsAppPhoneNumber(artist.phone)
    if (!formattedPhone) {
      skip("Invalid artist phone number format")
      continue
    }

    const planFeatures = await getUserPlanFeatures(supabase, artistId)
    if (!planFeatures.hasWhatsAppAutomation) {
      skip(`Artist on "${planFeatures.planName}" plan without WhatsApp automation`)
      continue
    }
    if (planFeatures.isReadOnly) {
      skip("Artist account is in read-only mode")
      continue
    }

    const targetUrl = `/bookings?date=${targetDate}`

    const { data: existingLog } = await supabase
      .from("notification_events")
      .select("id, status, attempts")
      .eq("user_id", artistId)
      .eq("channel", "whatsapp")
      .in("event_type", [...LEGACY_AGENDA_EVENT_TYPES, dailyAgendaTemplate, noBookingsTemplate])
      .in("entity_type", AGENDA_ENTITY_TYPES)
      .eq("url", targetUrl)
      .maybeSingle()

    if (existingLog?.status === "sent") {
      skip("Daily agenda already sent today")
      continue
    }
    if (existingLog?.status === "failed" && (existingLog.attempts || 0) >= AGENDA_MAX_ATTEMPTS) {
      skip(`Exceeded max attempts (${AGENDA_MAX_ATTEMPTS})`)
      continue
    }

    const artistName = sanitizeWhatsAppParam(artist?.artist_name?.trim() || artist?.studio_name?.trim() || "Artist")
    const formattedDate = sanitizeWhatsAppParam(formatDisplayDate(targetDate))
    const bodyParameters = hasBookings
      ? [
          artistName,
          formattedDate,
          sanitizeWhatsAppParam(`${totalCount} ${totalCount === 1 ? "Booking" : "Bookings"}`),
          firstBookingSummary(artistBookings[0]),
        ]
      : [artistName, formattedDate]

    log.info({ templateName, bookings: totalCount, date: targetDate }, "sending daily agenda")
    const sendResult = await sendWhatsAppTemplate({ to: formattedPhone, templateName, bodyParameters })

    // Agenda rows are keyed by url (the date), not by entity, so they're logged here directly.
    const eventTitle = hasBookings ? "Today's Booking Schedule" : "Daily Booking Update"
    const eventBody = hasBookings
      ? `WhatsApp daily agenda sent to ${formattedPhone} (${totalCount} bookings)`
      : `WhatsApp daily no-bookings update sent to ${formattedPhone}`
    const status = sendResult.success ? "sent" : "failed"
    const sentAt = sendResult.success ? new Date().toISOString() : null

    try {
      if (existingLog?.id) {
        await supabase
          .from("notification_events")
          .update({
            title: eventTitle,
            body: eventBody,
            status,
            attempts: (existingLog.attempts || 1) + 1,
            last_error: sendResult.error || null,
            sent_at: sentAt,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingLog.id)
      } else {
        await supabase.from("notification_events").insert({
          user_id: artistId,
          channel: "whatsapp",
          event_type: templateName,
          entity_type: hasBookings ? "artist_daily_agenda" : "artist_no_bookings_today",
          entity_id: artistId,
          title: eventTitle,
          body: eventBody,
          status,
          attempts: 1,
          last_error: sendResult.error || null,
          sent_at: sentAt,
          url: targetUrl,
        })
      }
    } catch (err) {
      log.warn({ err }, "failed to log notification event")
    }

    if (sendResult.success) {
      result.sent += 1
      result.details.push({ artistId, status: "sent", bookingsCount: totalCount })
    } else {
      result.failed += 1
      result.details.push({ artistId, status: "failed", reason: sendResult.error, bookingsCount: totalCount })
    }
  }

  return result
}
