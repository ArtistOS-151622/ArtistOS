import type { SupabaseClient } from "@supabase/supabase-js"

// Postgres unique_violation. razorpay_webhook_events.event_id is unique, so a
// losing insert reports this rather than throwing.
const UNIQUE_VIOLATION = "23505"

/**
 * Claims a Razorpay webhook event for processing, returning false when another
 * delivery already has it.
 *
 * The unique constraint is the lock. A read-then-insert cannot do this job:
 * Razorpay retries deliveries for 24 hours and two of them can both pass a
 * stale read, and because supabase-js reports a unique violation as a returned
 * error rather than a throw, the losing insert used to pass unnoticed and let
 * both deliveries carry on processing.
 */
export async function claimWebhookEvent(
  supabase: SupabaseClient,
  eventId: string,
  eventType: string
): Promise<boolean> {
  const { error } = await supabase
    .from("razorpay_webhook_events")
    .insert({ event_id: eventId, event_type: eventType })

  if (!error) return true
  if (error.code === UNIQUE_VIOLATION) return false

  throw new Error(`Failed to claim webhook event ${eventId}: ${error.message}`)
}

/**
 * Drops a claim so a later delivery of the same event can retry it.
 *
 * Call this whenever processing fails after the claim succeeded: the claim
 * would otherwise outlive the failed attempt and dedupe away every retry, so
 * the payment would never be applied. Never throws -- it runs on the failure
 * path, where the original error is the one worth surfacing.
 */
export async function releaseWebhookEvent(
  supabase: SupabaseClient,
  eventId: string
): Promise<void> {
  const { error } = await supabase
    .from("razorpay_webhook_events")
    .delete()
    .eq("event_id", eventId)

  if (error) {
    console.error(`Failed to release webhook event claim ${eventId}:`, error.message)
  }
}
