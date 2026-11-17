import { isPushConfigured } from "#src/integrations/web-push.js"
import { claimPendingEvents, markFailed, markSent } from "#src/shared/notifications/events.js"
import { sendPushToUser } from "#src/shared/notifications/push.js"

export const NOTIFICATION_DISPATCH_BATCH_SIZE = 50

/** Drains the notification_events queue to each recipient's push subscriptions. */
export async function dispatchPendingNotifications(supabase) {
  if (!isPushConfigured()) {
    return { processed: 0, sent: 0, failed: 0, skipped: true, error: "Push notifications are not configured" }
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
        // No live device took it: retry until the attempt budget runs out.
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
