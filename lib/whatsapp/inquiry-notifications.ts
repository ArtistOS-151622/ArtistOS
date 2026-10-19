import type { SupabaseClient } from "@supabase/supabase-js"
import { createAdminClient } from "../supabase/admin.ts"
import { sendWhatsAppTemplate, formatWhatsAppPhoneNumber, sanitizeWhatsAppParam } from "./client.ts"
import { getUserPlanFeatures } from "../auth/plan-features.ts"

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

export type InquiryNotificationResult = {
  success: boolean
  messageId?: string
  error?: string
  skipped?: boolean
  details?: unknown
}

/**
 * Sends automated WhatsApp notification to the artist when a new inquiry is received.
 * Template: new_inquiry_received
 * Variables:
 * {{1}} - Artist Name
 * {{2}} - Customer Name
 * {{3}} - Contact Number (Customer Phone)
 * {{4}} - Location (Customer Location)
 * {{5}} - Requested Service(s)
 * {{6}} - Preferred Booking Date
 */
export async function sendInquiryNotificationWhatsApp(
  inquiryId: number | string,
  existingSupabase?: SupabaseClient
): Promise<InquiryNotificationResult> {
  try {
    const supabase =
      existingSupabase ||
      (process.env.SUPABASE_SERVICE_ROLE_KEY
        ? createAdminClient()
        : await (await import("../supabase/server.ts")).createClient())

    const { data: inquiry, error: fetchError } = await supabase
      .from("inquiries")
      .select(`
        id,
        user_id,
        customer_id,
        booking_address,
        booking_date,
        start_time,
        end_time,
        status,
        additional_request,
        customer:customers(customer_name, phone, address),
        artist:users(artist_name, studio_name, phone),
        inquiry_services(
          quantity,
          unit_price,
          service:services(service_name, price)
        )
      `)
      .eq("id", Number(inquiryId))
      .maybeSingle()

    if (fetchError || !inquiry) {
      console.warn(`[WhatsApp] Inquiry #${inquiryId} not found for notification.`, fetchError)
      return { success: false, error: "Inquiry not found" }
    }

    // Check if the artist's subscription plan has automated WhatsApp enabled
    const planFeatures = await getUserPlanFeatures(supabase, inquiry.user_id)
    if (!planFeatures.hasWhatsAppAutomation) {
      console.log(
        `[WhatsApp] User #${inquiry.user_id} is on "${planFeatures.planName}" plan which does not include automated WhatsApp notifications. Skipping.`
      )
      return {
        success: false,
        skipped: true,
        error: "Automated WhatsApp notifications are only available on plans with WhatsApp automation.",
      }
    }

    const customer = Array.isArray(inquiry.customer)
      ? inquiry.customer[0]
      : inquiry.customer
    const artist = Array.isArray(inquiry.artist)
      ? inquiry.artist[0]
      : inquiry.artist

    const rawArtistPhone = artist?.phone
    if (!rawArtistPhone) {
      console.warn(`[WhatsApp] Inquiry #${inquiryId} artist has no phone number. Skipping notification.`)
      return { success: false, error: "No artist phone number found" }
    }

    const formattedPhone = formatWhatsAppPhoneNumber(rawArtistPhone)
    if (!formattedPhone) {
      console.warn(`[WhatsApp] Invalid artist phone "${rawArtistPhone}" for inquiry #${inquiryId}. Skipping.`)
      return { success: false, error: "Invalid artist phone number" }
    }

    // 1. Artist Name
    const artistName = sanitizeWhatsAppParam(artist?.artist_name, "Artist")

    // 2. Customer Name
    const customerName = sanitizeWhatsAppParam(customer?.customer_name, "Customer")

    // 3. Customer Phone Number
    const customerPhone = sanitizeWhatsAppParam(customer?.phone, "-")

    // 4. Customer Location (sanitized to remove newlines, carriage returns, and tabs)
    const customerLocation = sanitizeWhatsAppParam(
      inquiry.booking_address || customer?.address,
      "Not specified"
    )

    // 5. Requested Service(s)
    const serviceNames: string[] = []
    if (Array.isArray(inquiry.inquiry_services)) {
      for (const item of inquiry.inquiry_services) {
        const rawService = item && typeof item === "object" && "service" in item ? (item as { service: unknown }).service : null
        const s = Array.isArray(rawService) ? rawService[0] : rawService
        const sName = s && typeof s === "object" && "service_name" in s ? String((s as { service_name?: string }).service_name || "").trim() : ""
        if (sName) serviceNames.push(sName)
      }
    }
    const servicesText = sanitizeWhatsAppParam(
      serviceNames.length > 0 ? serviceNames.join(", ") : "Appointment Service",
      "Appointment Service"
    )

    // 6. Preferred Booking Date
    const formattedDate = sanitizeWhatsAppParam(formatDisplayDate(inquiry.booking_date), "-")

    const bodyParameters = [
      artistName,
      customerName,
      customerPhone,
      customerLocation,
      servicesText,
      formattedDate,
    ]

    console.log(
      `[WhatsApp] Preparing to send "new_inquiry_received" to artist ${formattedPhone} for inquiry #${inquiry.id}:`,
      bodyParameters
    )

    const result = await sendWhatsAppTemplate({
      to: formattedPhone,
      templateName: "new_inquiry_received",
      bodyParameters,
    })

    // Log to notification_events table for tracking/audit
    try {
      const eventTitle = "New Inquiry Received"
      const eventBody = `New inquiry received from ${customerName} for ${formattedDate} (${servicesText})`

      const { data: existing } = await supabase
        .from("notification_events")
        .select("id, attempts")
        .eq("user_id", inquiry.user_id)
        .eq("channel", "whatsapp")
        .eq("event_type", "new_inquiry_received")
        .eq("entity_type", "inquiry")
        .eq("entity_id", inquiry.id)
        .maybeSingle()

      if (existing?.id) {
        await supabase
          .from("notification_events")
          .update({
            title: eventTitle,
            body: eventBody,
            url: "/inquiries",
            status: result.success ? "sent" : "failed",
            attempts: (existing.attempts || 1) + 1,
            last_error: result.error || null,
            sent_at: result.success ? new Date().toISOString() : null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id)
      } else {
        await supabase.from("notification_events").insert({
          user_id: inquiry.user_id,
          channel: "whatsapp",
          event_type: "new_inquiry_received",
          entity_type: "inquiry",
          entity_id: inquiry.id,
          title: eventTitle,
          body: eventBody,
          url: "/inquiries",
          status: result.success ? "sent" : "failed",
          attempts: 1,
          last_error: result.error || null,
          sent_at: result.success ? new Date().toISOString() : null,
        })
      }
    } catch (auditErr) {
      console.warn("[WhatsApp] Failed to save notification event audit:", auditErr)
    }

    return result
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Internal error sending WhatsApp inquiry notification"
    console.error("[WhatsApp] Error processing inquiry notification:", err)
    return {
      success: false,
      error: errorMsg,
    }
  }
}
