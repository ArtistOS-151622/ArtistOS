import { NextResponse, type NextRequest } from "next/server"

import { claimPendingEvents, markFailed, markSent } from "@/lib/notifications/events"
import { NOTIFICATION_DISPATCH_BATCH_SIZE, isPushConfigured } from "@/lib/push/config"
import { sendPushToUser } from "@/lib/push/send"
import { createClient } from "@/lib/supabase/server"

/**
 * Dispatcher -- the only thing that sends.
 *
 * Reads notification_events and nothing else: it never touches bookings, which is
 * what lets any future producer (admin broadcasts, other server events) reuse it
 * unchanged. Every pending row is ready to go; presence in the table is readiness.
 */
export async function GET(request: NextRequest) {
  const secret = request.headers.get("authorization")?.replace("Bearer ", "")
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && secret !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!isPushConfigured()) {
    return NextResponse.json({ error: "Push notifications are not configured" }, { status: 503 })
  }

  const supabase = await createClient()

  try {
    const events = await claimPendingEvents(supabase, NOTIFICATION_DISPATCH_BATCH_SIZE)

    let sent = 0
    let failed = 0

    for (const event of events) {
      try {
        const result = await sendPushToUser(supabase, event.user_id, {
          title: event.title,
          body: event.body,
          url: event.url,
        })

        if (result.sent > 0) {
          await markSent(supabase, event.id, result.sent)
          sent += 1
        } else {
          // No live device took it -- retry until the attempt budget runs out.
          await markFailed(supabase, event, "No active push subscriptions")
          failed += 1
        }
      } catch (err) {
        await markFailed(supabase, event, err instanceof Error ? err.message : "Send failed")
        failed += 1
      }
    }

    return NextResponse.json({ status: true, processed: events.length, sent, failed })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Dispatch failed" },
      { status: 500 }
    )
  }
}
