import { Router } from "express"

import { createDbClient } from "#src/integrations/supabase.js"
import { requireArtist } from "#src/middlewares/require-artist.js"
import { ApiError } from "#src/utils/api-error.js"
import { bodyOf } from "#src/utils/request.js"

const LIST_LIMIT = 50

/** Mounted at /api/notifications: the artist's in-app notification list. */
export const notificationsRouter = Router()

notificationsRouter.use(requireArtist)

notificationsRouter.get("/", async (req, res) => {
  const { data, error } = await createDbClient()
    .from("notification_events")
    .select("id, title, body, url, created_at, read_at, status")
    .eq("user_id", req.artist.id)
    .order("created_at", { ascending: false })
    .limit(LIST_LIMIT)

  if (error) throw new ApiError(500, error.message)
  res.json(data)
})

/** Body `{ id }` marks one notification read; no id marks them all read. */
notificationsRouter.patch("/", async (req, res) => {
  const { id } = bodyOf(req)

  let query = createDbClient()
    .from("notification_events")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", req.artist.id)
  if (id) query = query.eq("id", id)

  const { error } = await query.is("read_at", null)
  if (error) throw new ApiError(500, error.message)
  res.json({ status: true })
})
