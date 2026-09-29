import type { SupabaseClient } from "@supabase/supabase-js"

import { claimPendingEvents, markFailed, markSent } from "@/lib/notifications/events"
import { NOTIFICATION_DISPATCH_BATCH_SIZE, isPushConfigured } from "@/lib/push/config"
import { sendPushToUser } from "@/lib/push/send"

export type DispatchResult = {
  processed: number
  sent: number
  failed: number
  skipped?: boolean
  error?: string
}

/**
 * Drains the notification_events queue and pushes to each recipient's active subscriptions.
 */
export async function dispatchPendingNotifications(
  supabase: SupabaseClient
): Promise<DispatchResult> {
  if (!isPushConfigured()) {
    return {
      processed: 0,
      sent: 0,
      failed: 0,
      skipped: true,
      error: "Push notifications are not configured",
    }
  }

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

  return { processed: events.length, sent, failed }
}
