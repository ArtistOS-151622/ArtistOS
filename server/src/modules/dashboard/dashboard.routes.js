import { Router } from "express"

import { getDashboard } from "#src/modules/dashboard/dashboard.service.js"
import { requireArtist } from "#src/middlewares/require-artist.js"

/** Mounted at /api/dashboard. Single read-only endpoint, so no separate controller file. */
export const dashboardRouter = Router()

dashboardRouter.get("/", requireArtist, async (req, res) => {
  res.json(await getDashboard(req.artist))
})
