import { NextResponse, type NextRequest } from "next/server"

import { scanBookingReminders } from "@/lib/notifications/producers/bookings"
import { createClient } from "@/lib/supabase/server"

/**
 * Producer. Enqueues reminders for bookings whose reminder moment has arrived.
 * Sends nothing -- the dispatcher does that on its next tick.
 */
export async function GET(request: NextRequest) {
  const secret = request.headers.get("authorization")?.replace("Bearer ", "")
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && secret !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = await createClient()

  try {
    const { enqueued, skipped } = await scanBookingReminders(supabase)
    return NextResponse.json({ status: true, enqueued, skipped })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Scan failed" },
      { status: 500 }
    )
  }
}
