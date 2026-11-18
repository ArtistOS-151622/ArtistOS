import { createDbClient } from "#src/integrations/supabase.js"
import { isPushConfigured } from "#src/integrations/web-push.js"
import { logSentEvent } from "#src/shared/notifications/events.js"
import {
  getSubscription,
  removeSubscription,
  saveSubscription,
  sendPushToSubscription,
} from "#src/shared/notifications/push.js"
import { ApiError, badRequest, notFound, serviceUnavailable } from "#src/utils/api-error.js"

const TEST_PAYLOAD = Object.freeze({
  title: "ArtistOS",
  body: "Test notification — push is working on this device.",
  url: "/profile",
})

const asString = (value) => (typeof value === "string" ? value : "")

export async function subscribe(userId, body, userAgent) {
  const endpoint = asString(body?.endpoint)
  const p256dh = asString(body?.keys?.p256dh)
  const auth = asString(body?.keys?.auth)
  if (!endpoint || !p256dh || !auth) throw badRequest("Invalid push subscription")

  try {
    await saveSubscription(createDbClient(), userId, { endpoint, keys: { p256dh, auth } }, userAgent)
  } catch (err) {
    throw new ApiError(500, err instanceof Error ? err.message : "Failed to save subscription", { cause: err })
  }
}

/** Scoped to the caller, so one artist can't unsubscribe another's device. Unknown endpoints are a no-op. */
export async function unsubscribe(userId, body) {
  const endpoint = asString(body?.endpoint)
  if (!endpoint) throw badRequest("Endpoint is required")

  const supabase = createDbClient()
  if (await getSubscription(supabase, userId, endpoint)) await removeSubscription(supabase, endpoint)
}

/**
 * Sends a test push to the one device that asked for it. Bypasses the
 * notification_events queue and sends inline: waiting a cron tick would defeat
 * the point of a test button.
 */
export async function sendTest(userId, body) {
  if (!isPushConfigured()) throw serviceUnavailable("Push notifications are not configured")

  const endpoint = asString(body?.endpoint)
  if (!endpoint) throw badRequest("Endpoint is required")

  const supabase = createDbClient()
  // Scoped to the caller: this is what stops the route being a push-to-anyone endpoint.
  const subscription = await getSubscription(supabase, userId, endpoint)
  if (!subscription) throw notFound("Subscription not found")

  let result
  try {
    result = await sendPushToSubscription(supabase, subscription, TEST_PAYLOAD)
  } catch (err) {
    throw new ApiError(500, err instanceof Error ? err.message : "Failed to send test notification", { cause: err })
  }

  if (result === "gone") {
    throw new ApiError(410, "This device is no longer subscribed. Turn notifications off and on again.")
  }

  await logSentEvent(supabase, { userId, eventType: "test", ...TEST_PAYLOAD, devicesSent: 1 })
}
