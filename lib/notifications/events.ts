import type { SupabaseClient } from "@supabase/supabase-js"

import { NOTIFICATION_MAX_ATTEMPTS } from "@/lib/push/config"
import type { NotificationEventRow } from "@/lib/push/types"

type EnqueueInput = {
  userId: number
  eventType: string
  entityType?: string | null
  entityId?: number | null
  title: string
  body: string
  url?: string | null
  channel?: string
}

/**
 * Add an event to the queue. Inserting means "send this now" -- there is no
 * scheduled_for; producers only enqueue once the moment has arrived.
 *
 * Returns null when a matching event already exists (the partial unique index on
 * user_id/event_type/entity_type/entity_id), which is how re-running a producer
 * stays safe. Rows without an entity_id are exempt from that index, so test
 * sends and broadcasts can repeat freely.
 */
export async function enqueueEvent(
  supabase: SupabaseClient,
  input: EnqueueInput
): Promise<NotificationEventRow | null> {
  const { data, error } = await supabase
    .from("notification_events")
    .insert({
      user_id: input.userId,
      channel: input.channel ?? "push",
      event_type: input.eventType,
      entity_type: input.entityType ?? null,
      entity_id: input.entityId ?? null,
      title: input.title,
      body: input.body,
      url: input.url ?? null,
    })
    .select("*")
    .maybeSingle()

  if (error) {
    // 23505 = unique_violation: this event was already queued or sent.
    if (error.code === "23505") return null
    throw new Error(error.message)
  }

  return (data as NotificationEventRow) ?? null
}

/** Insert an already-delivered row, for sends that bypass the queue (the test button). */
export async function logSentEvent(
  supabase: SupabaseClient,
  input: EnqueueInput & { devicesSent: number }
): Promise<void> {
  await supabase.from("notification_events").insert({
    user_id: input.userId,
    channel: input.channel ?? "push",
    event_type: input.eventType,
    entity_type: input.entityType ?? null,
    entity_id: input.entityId ?? null,
    title: input.title,
    body: input.body,
    url: input.url ?? null,
    status: "sent",
    devices_sent: input.devicesSent,
    attempts: 1,
    sent_at: new Date().toISOString(),
  })
}

/**
 * Everything still pending is ready to send -- no time gate. Presence in the
 * table is readiness.
 */
export async function claimPendingEvents(
  supabase: SupabaseClient,
  limit: number
): Promise<NotificationEventRow[]> {
  const { data, error } = await supabase
    .from("notification_events")
    .select("*")
    .eq("status", "pending")
    .lt("attempts", NOTIFICATION_MAX_ATTEMPTS)
    .order("created_at", { ascending: true })
    .limit(limit)

  // Must throw: a swallowed error here would look like an empty queue, and the
  // dispatcher would report a healthy run while silently sending nothing.
  if (error) throw new Error(error.message)

  return (data as NotificationEventRow[]) ?? []
}

export async function markSent(
  supabase: SupabaseClient,
  id: number,
  devicesSent: number
): Promise<void> {
  const { error } = await supabase
    .from("notification_events")
    .update({
      status: "sent",
      devices_sent: devicesSent,
      sent_at: new Date().toISOString(),
      last_error: null,
    })
    .eq("id", id)

  // The push already went out; failing to record that means the next pass would
  // re-send it. Surface it so the dispatcher response shows something went wrong.
  if (error) throw new Error(error.message)
}

/**
 * Record a failed attempt. Stays "pending" for another pass until the attempt
 * budget runs out, so a transient push-service blip retries instead of vanishing.
 */
export async function markFailed(
  supabase: SupabaseClient,
  event: NotificationEventRow,
  error: string
): Promise<void> {
  const attempts = event.attempts + 1

  await supabase
    .from("notification_events")
    .update({
      attempts,
      last_error: error.slice(0, 500),
      status: attempts >= NOTIFICATION_MAX_ATTEMPTS ? "failed" : "pending",
    })
    .eq("id", event.id)
}

/**
 * Bulk-cancel queued events whose subject is no longer relevant. The booking
 * scanner does not need this (it enqueues at the last moment, so there is no
 * meaningful stale window), but producers that queue ahead of time will.
 */
export async function cancelPendingEvents(
  supabase: SupabaseClient,
  input: { eventType: string; entityType: string; entityIds: number[] }
): Promise<number> {
  if (input.entityIds.length === 0) return 0

  const { data } = await supabase
    .from("notification_events")
    .update({ status: "cancelled" })
    .eq("status", "pending")
    .eq("event_type", input.eventType)
    .eq("entity_type", input.entityType)
    .in("entity_id", input.entityIds)
    .select("id")

  return data?.length ?? 0
}
