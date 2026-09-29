import { NextResponse, type NextRequest } from "next/server"

import { dispatchPendingNotifications } from "@/lib/notifications/dispatcher"
import { scanBookingReminders } from "@/lib/notifications/producers/bookings"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

/**
 * Producer & Auto-dispatcher.
 *
 * Enqueues reminders for bookings whose 2h or 10m reminder moment has arrived,
 * and immediately drains pending events to ensure prompt delivery.
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
    const dispatchResult = await dispatchPendingNotifications(supabase)

    return NextResponse.json({
      status: true,
      enqueued: scanResult.enqueued,
      skipped: scanResult.skipped,
      enqueued2h: scanResult.enqueued2h,
      enqueued10m: scanResult.enqueued10m,
      dispatched: dispatchResult,
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Scan failed" },
      { status: 500 }
    )
  }
}
