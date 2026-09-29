import { NextResponse, type NextRequest } from "next/server"

import { dispatchPendingNotifications } from "@/lib/notifications/dispatcher"
import { isPushConfigured } from "@/lib/push/config"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

/**
 * Dispatcher -- drains notification_events and delivers pushes.
 */
export async function GET(request: NextRequest) {
  const secret = request.headers.get("authorization")?.replace("Bearer ", "")
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && secret !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!isPushConfigured()) {
    return NextResponse.json({ error: "Push notifications are not configured" }, { status: 503 })
  }

  const supabase = process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createAdminClient()
    : await createClient()

  try {
    const result = await dispatchPendingNotifications(supabase)
    return NextResponse.json({ status: true, ...result })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Dispatch failed" },
      { status: 500 }
    )
  }
}
