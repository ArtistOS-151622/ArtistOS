import type { SupabaseClient } from "@supabase/supabase-js"

import type { PushSubscriptionRow } from "@/lib/push/types"

export async function saveSubscription(
  supabase: SupabaseClient,
  userId: number,
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  userAgent?: string | null
): Promise<PushSubscriptionRow> {
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
  return data as PushSubscriptionRow
}

export async function removeSubscription(
  supabase: SupabaseClient,
  endpoint: string
): Promise<void> {
  await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint)
}

export async function getSubscriptionsForUser(
  supabase: SupabaseClient,
  userId: number
): Promise<PushSubscriptionRow[]> {
  const { data, error } = await supabase
    .from("push_subscriptions")
    .select("*")
    .eq("user_id", userId)

  // Must throw rather than return []: the dispatcher treats "no devices" as a
  // failed attempt, so a swallowed DB error would burn the retry budget and
  // permanently mark a reminder failed.
  if (error) throw new Error(error.message)

  return (data as PushSubscriptionRow[]) ?? []
}

/**
 * Fetch a single subscription scoped to its owner. The user_id filter is what
 * stops the test route from pushing to a device belonging to another artist.
 */
export async function getSubscription(
  supabase: SupabaseClient,
  userId: number,
  endpoint: string
): Promise<PushSubscriptionRow | null> {
  const { data, error } = await supabase
    .from("push_subscriptions")
    .select("*")
    .eq("user_id", userId)
    .eq("endpoint", endpoint)
    .maybeSingle()

  if (error) throw new Error(error.message)

  return (data as PushSubscriptionRow) ?? null
}
