import { Router } from "express"

import { createDbClient } from "#src/integrations/supabase.js"
import { requireArtist } from "#src/middlewares/require-artist.js"
import { ApiError } from "#src/utils/api-error.js"

/**
 * Mounted at /api/badges. Counts for the dashboard badges (sidebar + topbar),
 * polled every minute. Count-only queries (head: true): no rows are loaded.
 */
export const badgesRouter = Router()

badgesRouter.get("/", requireArtist, async (req, res) => {
  const supabase = createDbClient()
  const userId = req.artist.id

  const [notificationsRes, inquiriesRes] = await Promise.all([
    supabase
      .from("notification_events")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .is("read_at", null),
    supabase
      .from("inquiries")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "new"),
  ])

  const error = notificationsRes.error ?? inquiriesRes.error
  if (error) throw new ApiError(500, error.message)

  res.set("Cache-Control", "no-store").json({
    unread_notifications: notificationsRes.count ?? 0,
    pending_inquiries: inquiriesRes.count ?? 0,
  })
})
