import { NextResponse, type NextRequest } from "next/server"

import { getArtistSession } from "@/lib/auth/session"
import { logSentEvent } from "@/lib/notifications/events"
import { isPushConfigured } from "@/lib/push/config"
import { sendPushToSubscription } from "@/lib/push/send"
import { getSubscription } from "@/lib/push/subscriptions"
import { createClient } from "@/lib/supabase/server"

/**
 * Send a test push to the single device that asked for it.
 *
 * Deliberately bypasses the notification_events queue and sends inline -- routing
 * it through the dispatcher would make the artist wait a cron tick for feedback,
 * which defeats the point of a test button.
 */
export async function POST(request: NextRequest) {
  const session = getArtistSession(request)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  if (!isPushConfigured()) {
    return NextResponse.json({ error: "Push notifications are not configured" }, { status: 503 })
  }

  const body = await request.json().catch(() => null)
  const endpoint = typeof body?.endpoint === "string" ? body.endpoint : ""

  if (!endpoint) return NextResponse.json({ error: "Endpoint is required" }, { status: 400 })

  const supabase = await createClient()

  // Scoped to the caller: this is what stops the route being a push-to-anyone endpoint.
  const subscription = await getSubscription(supabase, session.id, endpoint)
  if (!subscription) {
    return NextResponse.json({ error: "Subscription not found" }, { status: 404 })
  }

  const payload = {
    title: "ArtistOS",
    body: "Test notification — push is working on this device.",
    url: "/profile",
  }

  try {
    const result = await sendPushToSubscription(supabase, subscription, payload)

    if (result === "gone") {
      return NextResponse.json(
        { error: "This device is no longer subscribed. Turn notifications off and on again." },
        { status: 410 }
      )
    }

    await logSentEvent(supabase, {
      userId: session.id,
      eventType: "test",
      title: payload.title,
      body: payload.body,
      url: payload.url,
      devicesSent: 1,
    })

    return NextResponse.json({ status: true })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to send test notification" },
      { status: 500 }
    )
  }
}
