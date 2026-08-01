import { NextResponse, type NextRequest } from "next/server"

import { getArtistSession } from "@/lib/auth/session"
import { saveSubscription } from "@/lib/push/subscriptions"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  const session = getArtistSession(request)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await request.json().catch(() => null)
  const endpoint = typeof body?.endpoint === "string" ? body.endpoint : ""
  const p256dh = typeof body?.keys?.p256dh === "string" ? body.keys.p256dh : ""
  const auth = typeof body?.keys?.auth === "string" ? body.keys.auth : ""

  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json({ error: "Invalid push subscription" }, { status: 400 })
  }

  const supabase = await createClient()

  try {
    await saveSubscription(
      supabase,
      session.id,
      { endpoint, keys: { p256dh, auth } },
      request.headers.get("user-agent")
    )

    return NextResponse.json({ status: true })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to save subscription" },
      { status: 500 }
    )
  }
}
