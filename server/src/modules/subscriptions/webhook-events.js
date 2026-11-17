import { logger } from "#src/utils/logger.js"

// razorpay_webhook_events.event_id is unique; a losing insert reports this code.
const UNIQUE_VIOLATION = "23505"

/**
 * Claims a Razorpay webhook event for processing; false when another delivery has it.
 * The unique constraint is the lock: Razorpay retries for 24 h and two deliveries can
 * both pass a read-then-insert check.
 */
export async function claimWebhookEvent(supabase, eventId, eventType) {
  const { error } = await supabase.from("razorpay_webhook_events").insert({ event_id: eventId, event_type: eventType })
  if (!error) return true
  if (error.code === UNIQUE_VIOLATION) return false
  throw new Error(`Failed to claim webhook event ${eventId}: ${error.message}`)
}

/**
 * Drops a claim so Razorpay's retry can process the event again. Call it whenever
 * processing fails after a successful claim. Never throws (it runs on the failure path).
 */
export async function releaseWebhookEvent(supabase, eventId) {
  const { error } = await supabase.from("razorpay_webhook_events").delete().eq("event_id", eventId)
  if (error) logger.error({ eventId, error: error.message }, "failed to release webhook event claim")
}
