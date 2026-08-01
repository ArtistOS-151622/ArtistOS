import type { SupabaseClient } from "@supabase/supabase-js"

import { getWebPushClient } from "@/lib/push/client"
import { getSubscriptionsForUser, removeSubscription } from "@/lib/push/subscriptions"
import type { PushPayload, PushSendResult, PushSubscriptionRow } from "@/lib/push/types"

/**
 * Send to one device. A 404/410 from the push service means the subscription is
 * dead (app uninstalled, site data cleared, permission revoked) -- delete the row
 * and report "gone" rather than throwing, so a stale device never blocks a batch.
 */
export async function sendPushToSubscription(
  supabase: SupabaseClient,
  subscription: PushSubscriptionRow,
  payload: PushPayload
): Promise<PushSendResult> {
  const webpush = getWebPushClient()

  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      },
      JSON.stringify(payload)
    )

    return "sent"
  } catch (err) {
    const statusCode = (err as { statusCode?: number }).statusCode

    if (statusCode === 404 || statusCode === 410) {
      await removeSubscription(supabase, subscription.endpoint)
      return "gone"
    }

    throw err
  }
}

export async function sendPushToUser(
  supabase: SupabaseClient,
  userId: number,
  payload: PushPayload
): Promise<{ sent: number; removed: number; failed: number }> {
  const subscriptions = await getSubscriptionsForUser(supabase, userId)

  let sent = 0
  let removed = 0
  let failed = 0

  for (const subscription of subscriptions) {
    try {
      const result = await sendPushToSubscription(supabase, subscription, payload)
      if (result === "sent") sent += 1
      if (result === "gone") removed += 1
    } catch {
      failed += 1
    }
  }

  return { sent, removed, failed }
}
