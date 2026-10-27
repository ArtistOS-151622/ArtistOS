import type { SupabaseClient } from "@supabase/supabase-js"
import { getUserPlanFeatures } from "../auth/plan-features.ts"
import { APP_TIMEZONE, toWallClock } from "../notifications/time.ts"
import {
  formatWhatsAppPhoneNumber,
  sanitizeWhatsAppParam,
  sendWhatsAppTemplate,
} from "./client.ts"

export type DailyAgendaDetail = {
  artistId: number
  status: "sent" | "failed" | "skipped"
  reason?: string
  bookingsCount?: number
}

export type DailyAgendaScanResult = {
  scannedArtists: number
  sent: number
  failed: number
  skipped: number
  details: DailyAgendaDetail[]
}

function formatDisplayDate(dateStr: string): string {
  try {
    const [year, month, day] = dateStr.split("-").map(Number)
    const dateObj = new Date(year, month - 1, day)
    return dateObj.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
  } catch {
    return dateStr
  }
}

function formatDisplayTime(timeStr: string): string {
  try {
    const parts = timeStr.split(":")
    const hours = Number(parts[0])
    const minutes = Number(parts[1] || 0)

    const dateObj = new Date()
    dateObj.setHours(hours, minutes, 0, 0)

    return dateObj.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })
  } catch {
    return timeStr
  }
}

/**
 * Scans today's confirmed bookings and sends a daily morning summary
 * via WhatsApp to eligible artists (Free users and active Pro subscribers).
 */
export async function scanDailyArtistAgenda(
  supabase: SupabaseClient,
  customDate?: string
): Promise<DailyAgendaScanResult> {
  const now = new Date()
  const nowLocal = toWallClock(now, APP_TIMEZONE)
  const targetDate = customDate || nowLocal.date

  // 1. Query all confirmed bookings scheduled for target date
  const { data: bookings, error: bookingsError } = await supabase
    .from("bookings")
    .select(`
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
    `)
    .eq("status", "confirmed")
    .eq("booking_date", targetDate)
    .order("start_time", { ascending: true })

  if (bookingsError) {
    console.error("[Daily Agenda Scanner] Error querying bookings:", bookingsError)
    throw new Error(`Failed to query daily bookings: ${bookingsError.message}`)
  }

  // 2. Group confirmed bookings by artist (user_id)
  const bookingsByArtist = new Map<number, typeof bookings>()
  for (const booking of bookings || []) {
    const list = bookingsByArtist.get(booking.user_id) || []
    list.push(booking)
    bookingsByArtist.set(booking.user_id, list)
  }

  const result: DailyAgendaScanResult = {
    scannedArtists: bookingsByArtist.size,
    sent: 0,
    failed: 0,
    skipped: 0,
    details: [],
  }

  if (bookingsByArtist.size === 0) {
    return result
  }

  const templateName =
    process.env.WHATSAPP_DAILY_AGENDA_TEMPLATE_NAME?.trim() || "today_bookings_to_artist"

  const startOfDay = `${targetDate}T00:00:00`
  const endOfDay = `${targetDate}T23:59:59`

  // 3. Process each artist
  for (const [artistId, artistBookings] of bookingsByArtist.entries()) {
    const firstBooking = artistBookings[0]
    const rawArtist = firstBooking?.artist
    const artist = Array.isArray(rawArtist) ? rawArtist[0] : rawArtist

    // A. Verify artist phone number
    const rawPhone = artist?.phone
    if (!rawPhone) {
      result.skipped += 1
      result.details.push({
        artistId,
        status: "skipped",
        reason: "Artist has no phone number",
        bookingsCount: artistBookings.length,
      })
      continue
    }

    const formattedPhone = formatWhatsAppPhoneNumber(rawPhone)
    if (!formattedPhone) {
      result.skipped += 1
      result.details.push({
        artistId,
        status: "skipped",
        reason: "Invalid artist phone number format",
        bookingsCount: artistBookings.length,
      })
      continue
    }

    // B. Check plan features (Pro Plan or Free User required)
    const planFeatures = await getUserPlanFeatures(supabase, artistId)
    if (!planFeatures.hasWhatsAppAutomation) {
      result.skipped += 1
      result.details.push({
        artistId,
        status: "skipped",
        reason: `Artist on "${planFeatures.planName}" plan without WhatsApp automation`,
        bookingsCount: artistBookings.length,
      })
      continue
    }

    if (planFeatures.isReadOnly) {
      result.skipped += 1
      result.details.push({
        artistId,
        status: "skipped",
        reason: "Artist account is in read-only mode",
        bookingsCount: artistBookings.length,
      })
      continue
    }

    const targetUrl = `/bookings?date=${targetDate}`

    // C. Check deduplication for target date
    const { data: existingLog } = await supabase
      .from("notification_events")
      .select("id, status, attempts")
      .eq("user_id", artistId)
      .eq("channel", "whatsapp")
      .in("event_type", [
        "today_bookings_to_artist",
        "artist_daily_agenda",
        "artist_morning_summary",
        templateName,
      ])
      .eq("entity_type", "artist_daily_agenda")
      .eq("url", targetUrl)
      .maybeSingle()

    if (existingLog) {
      if (existingLog.status === "sent") {
        result.skipped += 1
        result.details.push({
          artistId,
          status: "skipped",
          reason: "Daily agenda already sent today",
          bookingsCount: artistBookings.length,
        })
        continue
      }
      if (existingLog.status === "failed" && (existingLog.attempts || 0) >= 3) {
        result.skipped += 1
        result.details.push({
          artistId,
          status: "skipped",
          reason: "Exceeded max attempts (3)",
          bookingsCount: artistBookings.length,
        })
        continue
      }
    }

    // D. Build template parameters
    const artistName = sanitizeWhatsAppParam(
      artist?.artist_name?.trim() || artist?.studio_name?.trim() || "Artist"
    )
    const formattedDate = sanitizeWhatsAppParam(formatDisplayDate(targetDate))
    const totalCount = artistBookings.length
    const countText = sanitizeWhatsAppParam(
      `${totalCount} ${totalCount === 1 ? "Booking" : "Bookings"}`
    )

    // Build first appointment summary for Pattern 2
    const firstTime = formatDisplayTime(firstBooking?.start_time || "09:00")
    const firstCustomer = Array.isArray(firstBooking?.customer)
      ? firstBooking.customer[0]
      : firstBooking?.customer
    const customerName = firstCustomer?.customer_name?.trim() || "Customer"
    const customerPhone = firstCustomer?.phone?.trim() ? ` (${firstCustomer.phone.trim()})` : ""

    const firstServices: string[] = []
    if (Array.isArray(firstBooking?.booking_services)) {
      for (const bs of firstBooking.booking_services as any[]) {
        const sName = bs?.service?.service_name
        if (sName) firstServices.push(sName)
      }
    }
    const serviceStr = firstServices.length > 0 ? firstServices.join(", ") : "Appointment"
    const addressStr = firstBooking?.booking_address?.trim()
      ? `, ${firstBooking.booking_address.trim()}`
      : ""

    const firstBookingSummary = sanitizeWhatsAppParam(
      `${firstTime} - ${customerName}${customerPhone} - ${serviceStr}${addressStr}`
    )

    const bodyParameters = [artistName, formattedDate, countText, firstBookingSummary]

    console.log(
      `[Daily Agenda] Sending "${templateName}" to artist ${formattedPhone} for ${totalCount} bookings on ${targetDate}`
    )

    // E. Dispatch WhatsApp template
    const sendResult = await sendWhatsAppTemplate({
      to: formattedPhone,
      templateName,
      bodyParameters,
    })

    // F. Log event to notification_events table
    try {
      if (existingLog?.id) {
        await supabase
          .from("notification_events")
          .update({
            title: "Today's Booking Schedule",
            body: `WhatsApp daily agenda sent to ${formattedPhone} (${totalCount} bookings)`,
            status: sendResult.success ? "sent" : "failed",
            attempts: (existingLog.attempts || 1) + 1,
            last_error: sendResult.error || null,
            sent_at: sendResult.success ? new Date().toISOString() : null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingLog.id)
      } else {
        await supabase.from("notification_events").insert({
          user_id: artistId,
          channel: "whatsapp",
          event_type: templateName,
          entity_type: "artist_daily_agenda",
          entity_id: artistId,
          title: "Today's Booking Schedule",
          body: `WhatsApp daily agenda sent to ${formattedPhone} (${totalCount} bookings)`,
          status: sendResult.success ? "sent" : "failed",
          attempts: 1,
          last_error: sendResult.error || null,
          sent_at: sendResult.success ? new Date().toISOString() : null,
          url: `/bookings?date=${targetDate}`,
        })
      }
    } catch (auditErr) {
      console.warn("[Daily Agenda] Failed to log notification event:", auditErr)
    }

    if (sendResult.success) {
      result.sent += 1
      result.details.push({
        artistId,
        status: "sent",
        bookingsCount: totalCount,
      })
    } else {
      result.failed += 1
      result.details.push({
        artistId,
        status: "failed",
        reason: sendResult.error,
        bookingsCount: totalCount,
      })
    }
  }

  return result
}
