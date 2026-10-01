import { createClient } from "@/lib/supabase/server"
import { sendWhatsAppTemplate, formatWhatsAppPhoneNumber } from "@/lib/whatsapp/client"

export type BookingNotificationTrigger = "created" | "confirmed"

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
 * Sends automated WhatsApp notification for booking creation or confirmation
 */
export async function sendBookingNotificationWhatsApp(
  bookingId: number | string,
  trigger: BookingNotificationTrigger,
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()

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
      console.warn(`[WhatsApp] Booking #${bookingId} not found for notification.`);
      return { success: false, error: "Booking not found" }
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
    // If trigger is 'confirmed' OR the booking status is 'confirmed', send 'booking_confirmed'
    // Otherwise send 'create_booking'
    const isConfirmed = trigger === "confirmed" || booking.status === "confirmed"
    const templateName = isConfirmed ? "booking_confirmed" : "create_booking"

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
      await supabase.from("notification_events").insert({
        user_id: booking.user_id,
        channel: "whatsapp",
        event_type: templateName,
        entity_type: "booking",
        entity_id: booking.id,
        title: isConfirmed ? "Booking Confirmed" : "Booking Created",
        body: `WhatsApp sent to ${formattedPhone} for booking #${booking.id}`,
        status: result.success ? "sent" : "failed",
        last_error: result.error || null,
        sent_at: result.success ? new Date().toISOString() : null,
      })
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
