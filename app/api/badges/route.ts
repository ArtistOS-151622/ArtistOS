import { NextResponse, type NextRequest } from "next/server"

import { getArtistSession } from "@/lib/auth/session"
import { createClient } from "@/lib/supabase/server"

/**
 * Counts for the dashboard badges (sidebar + topbar), polled every minute.
 * Count-only queries (head: true): no rows are loaded.
 */
export async function GET(request: NextRequest) {
  const session = getArtistSession(request)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supabase = await createClient()

  const [notificationsRes, inquiriesRes] = await Promise.all([
    supabase
      .from("notification_events")
      .select("id", { count: "exact", head: true })
      .eq("user_id", session.id)
      .is("read_at", null),
    supabase
      .from("inquiries")
      .select("id", { count: "exact", head: true })
      .eq("user_id", session.id)
      .eq("status", "new"),
  ])

  const error = notificationsRes.error ?? inquiriesRes.error
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(
    {
      unread_notifications: notificationsRes.count ?? 0,
      pending_inquiries: inquiriesRes.count ?? 0,
    },
    { headers: { "Cache-Control": "no-store" } }
  )
}
