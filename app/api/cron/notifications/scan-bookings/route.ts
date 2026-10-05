import { NextResponse, type NextRequest } from "next/server"

import { dispatchPendingNotifications } from "@/lib/notifications/dispatcher"
import { scanBookingReminders } from "@/lib/notifications/producers/bookings"
import { scanCustomerWhatsAppReminders } from "@/lib/whatsapp/booking-notifications"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

/**
 * Producer & Auto-dispatcher.
 *
 * 1. Enqueues artist push reminders for bookings due within 2h or 10m.
 * 2. Scans and sends 24h WhatsApp reminders to customers (one_day_reminder_to_customer).
 * 3. Immediately drains pending push notification events to ensure prompt delivery.
 */
export async function GET(request: NextRequest) {
  const secret = request.headers.get("authorization")?.replace("Bearer ", "")
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && secret !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createAdminClient()
    : await createClient()

  try {
    const scanResult = await scanBookingReminders(supabase)
    const whatsAppResult = await scanCustomerWhatsAppReminders(supabase)
    const dispatchResult = await dispatchPendingNotifications(supabase)

    return NextResponse.json({
      status: true,
      enqueued: scanResult.enqueued,
      skipped: scanResult.skipped,
      enqueued2h: scanResult.enqueued2h,
      enqueued10m: scanResult.enqueued10m,
      whatsAppReminders: whatsAppResult,
      dispatched: dispatchResult,
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Scan failed" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  return GET(request)
}
