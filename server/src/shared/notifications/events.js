import { config } from "#src/config/env.js"

/*
 * notification_events is both the push queue and the audit log for WhatsApp sends.
 * Row: { id, user_id, channel, event_type, entity_type, entity_id, title, body, url,
 *        status: pending|sent|failed|cancelled, attempts, devices_sent, last_error,
 *        sent_at, created_at, updated_at }
 */

const UNIQUE_VIOLATION = "23505"
const MAX_ERROR_LENGTH = 500

function toRow(input) {
  return {
    user_id: input.userId,
    channel: input.channel ?? "push",
    event_type: input.eventType,
    entity_type: input.entityType ?? null,
    entity_id: input.entityId ?? null,
    title: input.title,
    body: input.body,
    url: input.url ?? null,
  }
}

/**
 * Queues an event to send now (there is no scheduled_for: producers enqueue when
 * the moment arrives). Returns null when a matching event already exists (partial
 * unique index on user_id/event_type/entity_type/entity_id), which makes re-running
 * a producer safe. Rows without entity_id are exempt, so test sends can repeat.
 */
export async function enqueueEvent(supabase, input) {
  const { data, error } = await supabase.from("notification_events").insert(toRow(input)).select("*").maybeSingle()

  if (error) {
    if (error.code === UNIQUE_VIOLATION) return null
    throw new Error(error.message)
  }
  return data ?? null
}

/** Records an already-delivered event, for sends that bypass the queue (the test button). */
export async function logSentEvent(supabase, input) {
  await supabase.from("notification_events").insert({
    ...toRow(input),
    status: "sent",
    devices_sent: input.devicesSent,
    attempts: 1,
    sent_at: new Date().toISOString(),
  })
}

/** Everything still pending is ready to send. Throws on DB errors (never looks like an empty queue). */
export async function claimPendingEvents(supabase, limit) {
  const { data, error } = await supabase
    .from("notification_events")
    .select("*")
    .eq("status", "pending")
    .lt("attempts", config.notifications.maxAttempts)
    .order("created_at", { ascending: true })
    .limit(limit)

  if (error) throw new Error(error.message)
  return data ?? []
}

/** Throws if the update fails: the push already went out, and the next pass would re-send it. */
export async function markSent(supabase, id, devicesSent) {
  const { error } = await supabase
    .from("notification_events")
    .update({ status: "sent", devices_sent: devicesSent, sent_at: new Date().toISOString(), last_error: null })
    .eq("id", id)

  if (error) throw new Error(error.message)
}

/** Records a failed attempt; stays pending for another pass until the attempt budget runs out. */
export async function markFailed(supabase, event, error) {
  const attempts = event.attempts + 1
  await supabase
    .from("notification_events")
    .update({
      attempts,
      last_error: error.slice(0, MAX_ERROR_LENGTH),
      status: attempts >= config.notifications.maxAttempts ? "failed" : "pending",
    })
    .eq("id", event.id)
}

/** Bulk-cancels queued events whose subject is no longer relevant. Returns the count. */
export async function cancelPendingEvents(supabase, { eventType, entityType, entityIds }) {
  if (entityIds.length === 0) return 0

  const { data } = await supabase
    .from("notification_events")
    .update({ status: "cancelled" })
    .eq("status", "pending")
    .eq("event_type", eventType)
    .eq("entity_type", entityType)
    .in("entity_id", entityIds)
    .select("id")

  return data?.length ?? 0
}

/**
 * Upserts the audit row for a WhatsApp send: one row per
 * (user, channel "whatsapp", event_type, entity_type, entity_id), attempts incremented on retry.
 * Never throws (audit failures must not fail the send).
 */
export async function recordWhatsAppEvent(supabase, { userId, eventType, entityType, entityId, title, body, url, result }, log) {
  try {
    const status = result.success ? "sent" : "failed"
    const lastError = result.error || null
    const sentAt = result.success ? new Date().toISOString() : null

    const { data: existing } = await supabase
      .from("notification_events")
      .select("id, attempts")
      .eq("user_id", userId)
      .eq("channel", "whatsapp")
      .eq("event_type", eventType)
      .eq("entity_type", entityType)
      .eq("entity_id", entityId)
      .maybeSingle()

    if (existing?.id) {
      await supabase
        .from("notification_events")
        .update({
          title,
          body,
          ...(url !== undefined ? { url } : {}),
          status,
          attempts: (existing.attempts || 1) + 1,
          last_error: lastError,
          sent_at: sentAt,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
    } else {
      await supabase.from("notification_events").insert({
        user_id: userId,
        channel: "whatsapp",
        event_type: eventType,
        entity_type: entityType,
        entity_id: entityId,
        title,
        body,
        ...(url !== undefined ? { url } : {}),
        status,
        attempts: 1,
        last_error: lastError,
        sent_at: sentAt,
      })
    }
  } catch (err) {
    log.warn({ err }, "failed to save notification event audit")
  }
}
