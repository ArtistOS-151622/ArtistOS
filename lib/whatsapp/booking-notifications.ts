import type { SupabaseClient } from "@supabase/supabase-js"
import { createAdminClient } from "../supabase/admin.ts"
import { sendWhatsAppTemplate, formatWhatsAppPhoneNumber } from "./client.ts"
import { APP_TIMEZONE, toWallClock, getMinutesUntilBooking } from "../notifications/time.ts"
import { getUserPlanFeatures } from "../auth/plan-features.ts"

export type BookingNotificationTrigger =
  | "created"
  | "confirmed"
  | "reminder_24h"
  | "one_day_reminder"
  | "one_day_reminder_to_customer"

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
 * Sends automated WhatsApp notification for booking creation, confirmation, or 24h reminder
 */
export async function sendBookingNotificationWhatsApp(
  bookingId: number | string,
  trigger: BookingNotificationTrigger,
  existingSupabase?: SupabaseClient
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase =
      existingSupabase ||
      (process.env.SUPABASE_SERVICE_ROLE_KEY
        ? createAdminClient()
        : await (await import("../supabase/server.ts")).createClient())

    const { data: booking, error: fetchError } = await supabase
      .from("bookings")
      .select(`
        id,
        user_id,
        customer_id,
        booking_date,
        start_time,
        status,
        discount,
        customer:customers(customer_name, phone),
        artist:users(artist_name, studio_name),
        booking_services(
          quantity,
          unit_price,
          service:services(service_name, price)
        ),
        booking_additional_charges(quantity, rate)
      `)
      .eq("id", Number(bookingId))
      .maybeSingle()

    if (fetchError || !booking) {
      console.warn(`[WhatsApp] Booking #${bookingId} not found for notification.`)
      return { success: false, error: "Booking not found" }
    }

    // Check if the artist's plan includes automated WhatsApp notifications
    const planFeatures = await getUserPlanFeatures(supabase, booking.user_id)
    if (!planFeatures.hasWhatsAppAutomation) {
      console.log(
        `[WhatsApp] User #${booking.user_id} is on "${planFeatures.planName}" plan which does not include automated WhatsApp notifications. Skipping.`
      )
      return {
        success: false,
        error: "Automated WhatsApp booking notifications are only available on the Pro plan.",
      }
    }

    const customer = Array.isArray(booking.customer)
      ? booking.customer[0]
      : booking.customer
    const artist = Array.isArray(booking.artist)
      ? booking.artist[0]
      : booking.artist

    const rawPhone = customer?.phone
    if (!rawPhone) {
      console.log(`[WhatsApp] Booking #${bookingId} customer has no phone. Skipping notification.`)
      return { success: false, error: "No customer phone" }
    }

    const formattedPhone = formatWhatsAppPhoneNumber(rawPhone)
    if (!formattedPhone) {
      console.warn(`[WhatsApp] Invalid customer phone "${rawPhone}" on booking #${bookingId}. Skipping.`)
      return { success: false, error: "Invalid customer phone" }
    }

    // Determine template:
    // If trigger is 24h reminder -> 'one_day_reminder_to_customer'
    // If trigger is confirmed OR status is confirmed -> 'booking_confirmed'
    // Otherwise -> 'create_booking'
    const isOneDayReminder =
      trigger === "reminder_24h" ||
      trigger === "one_day_reminder" ||
      trigger === "one_day_reminder_to_customer"

    const isConfirmed = trigger === "confirmed" || booking.status === "confirmed"

    const templateName = isOneDayReminder
      ? "one_day_reminder_to_customer"
      : isConfirmed
        ? "booking_confirmed"
        : "create_booking"

    const eventTitle = isOneDayReminder
      ? "1-Day Booking Reminder"
      : isConfirmed
        ? "Booking Confirmed"
        : "Booking Created"

    // 1. Customer Name
    const customerName = customer?.customer_name?.trim() || "Customer"

    // 2. Artist Name
    const artistName = artist?.artist_name?.trim() || "Artist Studio"

    // 3. Studio Name (fallback to Artist Name or "Studio")
    const studioName =
      artist?.studio_name?.trim() ||
      artist?.artist_name?.trim() ||
      "Studio"

    // 4. Date (e.g. "30 Sept 2026")
    const formattedDate = formatDisplayDate(booking.booking_date)

    // 5. Time (e.g. "05:30 PM")
    const formattedTime = formatDisplayTime(booking.start_time)

    // 6. Services (joined with comma)
    const serviceNames: string[] = []
    let servicesTotal = 0

    if (Array.isArray(booking.booking_services)) {
      for (const bs of booking.booking_services as any[]) {
        const sName = bs?.service?.service_name
        if (sName) serviceNames.push(sName)
        const unitPrice = Number(bs?.unit_price ?? bs?.service?.price ?? 0)
        const qty = Number(bs?.quantity || 1)
        servicesTotal += unitPrice * qty
      }
    }

    const servicesText =
      serviceNames.length > 0 ? serviceNames.join(", ") : "Appointment Service"

    // Additional charges & discount
    let additionalChargesTotal = 0
    if (Array.isArray(booking.booking_additional_charges)) {
      for (const ac of booking.booking_additional_charges as any[]) {
        const rate = Number(ac?.rate || 0)
        const qty = Number(ac?.quantity || 1)
        additionalChargesTotal += rate * qty
      }
    }

    const discount = Number(booking.discount || 0)
    const grandTotal = Math.max(0, servicesTotal + additionalChargesTotal - discount)

    // 7. Total Amount string (e.g. "500" or "1,500" — without ₹ since template already includes ₹)
    const amountText = Math.round(grandTotal).toLocaleString("en-IN")

    // The 7 parameters matching Meta templates
    const bodyParameters = [
      customerName,
      artistName,
      studioName,
      formattedDate,
      formattedTime,
      servicesText,
      amountText,
    ]

    console.log(
      `[WhatsApp] Preparing to send "${templateName}" to ${formattedPhone} for booking #${booking.id}:`,
      bodyParameters,
    )

    const result = await sendWhatsAppTemplate({
      to: formattedPhone,
      templateName,
      bodyParameters,
    })

    // Log to notification_events table for tracking/audit
    try {
      const { data: existing } = await supabase
        .from("notification_events")
        .select("id, attempts")
        .eq("user_id", booking.user_id)
        .eq("channel", "whatsapp")
        .eq("event_type", templateName)
        .eq("entity_type", "booking")
        .eq("entity_id", booking.id)
        .maybeSingle()

      if (existing?.id) {
        await supabase
          .from("notification_events")
          .update({
            title: eventTitle,
            body: `WhatsApp sent to ${formattedPhone} for booking #${booking.id}`,
            status: result.success ? "sent" : "failed",
            attempts: (existing.attempts || 1) + 1,
            last_error: result.error || null,
            sent_at: result.success ? new Date().toISOString() : null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id)
      } else {
        await supabase.from("notification_events").insert({
          user_id: booking.user_id,
          channel: "whatsapp",
          event_type: templateName,
          entity_type: "booking",
          entity_id: booking.id,
          title: eventTitle,
          body: `WhatsApp sent to ${formattedPhone} for booking #${booking.id}`,
          status: result.success ? "sent" : "failed",
          attempts: 1,
          last_error: result.error || null,
          sent_at: result.success ? new Date().toISOString() : null,
        })
      }
    } catch (auditErr) {
      // Non-critical audit log failure
      console.warn("[WhatsApp] Failed to save notification event audit:", auditErr)
    }

    return result
  } catch (err: any) {
    console.error("[WhatsApp] Error processing booking notification:", err)
    return {
      success: false,
      error: err?.message || "Internal error sending WhatsApp notification",
    }
  }
}

/**
 * Convenience helper to send the 1-day reminder WhatsApp template for a booking
 */
export async function sendOneDayBookingReminderWhatsApp(
  bookingId: number | string,
  existingSupabase?: SupabaseClient
) {
  return sendBookingNotificationWhatsApp(bookingId, "reminder_24h", existingSupabase)
}

export type WhatsAppReminderScanResult = {
  scanned: number
  sent: number
  failed: number
  skipped: number
  details?: Array<{ bookingId: number; status: "sent" | "failed" | "skipped"; reason?: string }>
}

/**
 * Scans active bookings occurring tomorrow (within 24 hours of booking time)
 * and sends the 'one_day_reminder_to_customer' WhatsApp template message.
 */
export async function scanCustomerWhatsAppReminders(
  supabase: SupabaseClient
): Promise<WhatsAppReminderScanResult> {
  const now = new Date()
  const nowLocal = toWallClock(now, APP_TIMEZONE)

  // Look ahead for tomorrow and day after tomorrow in artist's timezone
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
  const tomorrowLocal = toWallClock(tomorrow, APP_TIMEZONE)
  const lookahead = new Date(now.getTime() + 48 * 60 * 60 * 1000)
  const lookaheadLocal = toWallClock(lookahead, APP_TIMEZONE)

  // Bookings with dates starting tomorrow up to lookahead window
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
    .in("status", ["pending", "confirmed"])
    .gte("booking_date", tomorrowLocal.date)
    .lte("booking_date", lookaheadLocal.date)

  if (error) {
    console.error("[WhatsApp Reminder Scanner] Error querying bookings:", error)
    throw new Error(`Failed to query bookings for WhatsApp reminders: ${error.message}`)
  }

  const result: WhatsAppReminderScanResult = {
    scanned: bookings?.length || 0,
    sent: 0,
    failed: 0,
    skipped: 0,
    details: [],
  }

  if (!bookings || bookings.length === 0) {
    return result
  }

  for (const booking of bookings) {
    // Only send if the booking is strictly tomorrow (or future date, not today or past)
    if (booking.booking_date <= nowLocal.date) {
      result.skipped += 1
      result.details?.push({
        bookingId: booking.id,
        status: "skipped",
        reason: "Booking is today or in the past",
      })
      continue
    }

    const startTime = booking.start_time || "09:00"
    const diffMinutes = getMinutesUntilBooking(
      booking.booking_date,
      startTime,
      nowLocal.date,
      nowLocal.time
    )

    // Booking has already started or passed
    if (diffMinutes <= 0) {
      result.skipped += 1
      result.details?.push({
        bookingId: booking.id,
        status: "skipped",
        reason: "Booking already started/passed",
      })
      continue
    }

    // Check if the artist's plan includes automated WhatsApp reminders
    const artistPlan = await getUserPlanFeatures(supabase, booking.user_id)
    if (!artistPlan.hasWhatsAppAutomation) {
      result.skipped += 1
      result.details?.push({
        bookingId: booking.id,
        status: "skipped",
        reason: `Artist on "${artistPlan.planName}" plan (WhatsApp auto reminders require Pro plan)`,
      })
      continue
    }

    // Must be within 24 hours of booking time (diffMinutes <= 1440)
    if (diffMinutes > 24 * 60) {
      result.skipped += 1
      result.details?.push({
        bookingId: booking.id,
        status: "skipped",
        reason: `More than 24h away (${diffMinutes}m remaining)`,
      })
      continue
    }

    // Check deduplication in notification_events
    const { data: existingLog } = await supabase
      .from("notification_events")
      .select("id, status, attempts")
      .eq("user_id", booking.user_id)
      .eq("channel", "whatsapp")
      .eq("event_type", "one_day_reminder_to_customer")
      .eq("entity_type", "booking")
      .eq("entity_id", booking.id)
      .maybeSingle()

    if (existingLog) {
      if (existingLog.status === "sent") {
        result.skipped += 1
        result.details?.push({
          bookingId: booking.id,
          status: "skipped",
          reason: "Reminder already sent",
        })
        continue
      }
      if (existingLog.status === "failed" && (existingLog.attempts || 0) >= 3) {
        result.skipped += 1
        result.details?.push({
          bookingId: booking.id,
          status: "skipped",
          reason: "Exceeded max attempts (3)",
        })
        continue
      }
    }

    // Send WhatsApp reminder
    console.log(
      `[WhatsApp Scanner] Sending 24h reminder (one_day_reminder_to_customer) for booking #${booking.id} (${diffMinutes}m until booking)`
    )
    const sendRes = await sendBookingNotificationWhatsApp(
      booking.id,
      "reminder_24h",
      supabase
    )

    if (sendRes.success) {
      result.sent += 1
      result.details?.push({ bookingId: booking.id, status: "sent" })
    } else {
      result.failed += 1
      result.details?.push({
        bookingId: booking.id,
        status: "failed",
        reason: sendRes.error,
      })
    }
  }

  return result
}
