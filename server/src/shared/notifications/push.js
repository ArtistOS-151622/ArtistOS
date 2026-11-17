import { getWebPushClient } from "#src/integrations/web-push.js"

/*
 * push_subscriptions row: { id, user_id, endpoint, p256dh, auth, user_agent, created_at, updated_at }
 * Payload: { title, body, url? }
 */

const GONE_STATUS_CODES = new Set([404, 410])

export async function saveSubscription(supabase, userId, subscription, userAgent) {
  const { data, error } = await supabase
    .from("push_subscriptions")
    .upsert(
      {
        user_id: userId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        user_agent: userAgent ?? null,
      },
      { onConflict: "endpoint" }
    )
    .select("*")
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function removeSubscription(supabase, endpoint) {
  await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint)
}

/**
 * Throws rather than returning [] on DB errors: the dispatcher treats "no devices"
 * as a failed attempt, so a swallowed error would burn the retry budget.
 */
export async function getSubscriptionsForUser(supabase, userId) {
  const { data, error } = await supabase.from("push_subscriptions").select("*").eq("user_id", userId)
  if (error) throw new Error(error.message)
  return data ?? []
}

/** One subscription scoped to its owner: the user_id filter stops pushing to another artist's device. */
export async function getSubscription(supabase, userId, endpoint) {
  const { data, error } = await supabase
    .from("push_subscriptions")
    .select("*")
    .eq("user_id", userId)
    .eq("endpoint", endpoint)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data ?? null
}

/**
 * Sends to one device → "sent" | "gone". A 404/410 means the subscription is dead
 * (app uninstalled, data cleared, permission revoked): the row is deleted and
 * "gone" returned, so a stale device never blocks a batch. Other errors throw.
 */
export async function sendPushToSubscription(supabase, subscription, payload) {
  const webpush = getWebPushClient()
  try {
    await webpush.sendNotification(
      { endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } },
      JSON.stringify(payload)
    )
    return "sent"
  } catch (err) {
    if (GONE_STATUS_CODES.has(err?.statusCode)) {
      await removeSubscription(supabase, subscription.endpoint)
      return "gone"
    }
    throw err
  }
}

/** Sends to every device of a user → `{ sent, removed, failed }`. */
export async function sendPushToUser(supabase, userId, payload) {
  const subscriptions = await getSubscriptionsForUser(supabase, userId)
  const counts = { sent: 0, removed: 0, failed: 0 }

  for (const subscription of subscriptions) {
    try {
      const result = await sendPushToSubscription(supabase, subscription, payload)
      if (result === "sent") counts.sent += 1
      if (result === "gone") counts.removed += 1
    } catch {
      counts.failed += 1
    }
  }
  return counts
}
