import { NextResponse, type NextRequest } from "next/server"

import { getArtistSession } from "@/lib/auth/session"
import { getSubscription, removeSubscription } from "@/lib/push/subscriptions"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  const session = getArtistSession(request)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await request.json().catch(() => null)
  const endpoint = typeof body?.endpoint === "string" ? body.endpoint : ""

  if (!endpoint) return NextResponse.json({ error: "Endpoint is required" }, { status: 400 })

  const supabase = await createClient()

  // Scope the delete to the caller so one artist cannot unsubscribe another's device.
  const subscription = await getSubscription(supabase, session.id, endpoint)
  if (subscription) await removeSubscription(supabase, endpoint)

  return NextResponse.json({ status: true })
}
