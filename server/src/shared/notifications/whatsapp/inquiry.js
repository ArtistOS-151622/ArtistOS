import { createPreferredClient } from "#src/integrations/supabase.js"
import {
  formatWhatsAppPhoneNumber,
  sanitizeWhatsAppParam,
  sendWhatsAppTemplate,
} from "#src/integrations/whatsapp.js"
import { recordWhatsAppEvent } from "#src/shared/notifications/events.js"
import { formatDisplayDate } from "#src/shared/notifications/time.js"
import { getUserPlanFeatures } from "#src/shared/subscription/plan-features.js"
import { logger } from "#src/utils/logger.js"

const log = logger.child({ feature: "whatsapp-inquiry" })

const TEMPLATE_NAME = "new_inquiry_received"

const INQUIRY_SELECT = `
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
`

const firstOf = (value) => (Array.isArray(value) ? value[0] : value)

function serviceNamesOf(inquiry) {
  const names = []
  for (const item of Array.isArray(inquiry.inquiry_services) ? inquiry.inquiry_services : []) {
    const service = item && typeof item === "object" && "service" in item ? firstOf(item.service) : null
    const name =
      service && typeof service === "object" && "service_name" in service
        ? String(service.service_name || "").trim()
        : ""
    if (name) names.push(name)
  }
  return names
}

/**
 * Tells the artist about a new inquiry via the "new_inquiry_received" template:
 * {{1}} artist, {{2}} customer, {{3}} customer phone, {{4}} location,
 * {{5}} requested services, {{6}} preferred date.
 * Never throws: resolves to { success, messageId?, error?, skipped?, details? }.
 */
export async function sendInquiryNotificationWhatsApp(inquiryId, existingSupabase) {
  try {
    const supabase = existingSupabase ?? createPreferredClient()

    const { data: inquiry, error: fetchError } = await supabase
      .from("inquiries")
      .select(INQUIRY_SELECT)
      .eq("id", Number(inquiryId))
      .maybeSingle()

    if (fetchError || !inquiry) {
      log.warn({ inquiryId, error: fetchError }, "inquiry not found for notification")
      return { success: false, error: "Inquiry not found" }
    }

    const planFeatures = await getUserPlanFeatures(supabase, inquiry.user_id)
    if (!planFeatures.hasWhatsAppAutomation) {
      log.info({ userId: inquiry.user_id, plan: planFeatures.planName }, "plan has no WhatsApp automation; skipping")
      return {
        success: false,
        skipped: true,
        error: "Automated WhatsApp notifications are only available on plans with WhatsApp automation.",
      }
    }

    const customer = firstOf(inquiry.customer)
    const artist = firstOf(inquiry.artist)

    if (!artist?.phone) {
      log.warn({ inquiryId }, "artist has no phone; skipping")
      return { success: false, error: "No artist phone number found" }
    }

    const formattedPhone = formatWhatsAppPhoneNumber(artist.phone)
    if (!formattedPhone) {
      log.warn({ inquiryId }, "invalid artist phone; skipping")
      return { success: false, error: "Invalid artist phone number" }
    }

    const serviceNames = serviceNamesOf(inquiry)
    const customerName = sanitizeWhatsAppParam(customer?.customer_name, "Customer")
    const servicesText = sanitizeWhatsAppParam(
      serviceNames.length > 0 ? serviceNames.join(", ") : "Appointment Service",
      "Appointment Service"
    )
    const formattedDate = sanitizeWhatsAppParam(formatDisplayDate(inquiry.booking_date), "-")

    const bodyParameters = [
      sanitizeWhatsAppParam(artist?.artist_name, "Artist"),
      customerName,
      sanitizeWhatsAppParam(customer?.phone, "-"),
      sanitizeWhatsAppParam(inquiry.booking_address || customer?.address, "Not specified"),
      servicesText,
      formattedDate,
    ]

    log.info({ inquiryId: inquiry.id }, "sending inquiry notification")
    const result = await sendWhatsAppTemplate({ to: formattedPhone, templateName: TEMPLATE_NAME, bodyParameters })

    await recordWhatsAppEvent(
      supabase,
      {
        userId: inquiry.user_id,
        eventType: TEMPLATE_NAME,
        entityType: "inquiry",
        entityId: inquiry.id,
        title: "New Inquiry Received",
        body: `New inquiry received from ${customerName} for ${formattedDate} (${servicesText})`,
        url: "/inquiries",
        result,
      },
      log
    )

    return result
  } catch (err) {
    log.error({ err, inquiryId }, "error processing inquiry notification")
    return {
      success: false,
      error: err instanceof Error ? err.message : "Internal error sending WhatsApp inquiry notification",
    }
  }
}
