import { Router } from "express"

import * as pushService from "#src/modules/push/push.service.js"
import { requireArtist } from "#src/middlewares/require-artist.js"
import { bodyOf } from "#src/utils/request.js"

/** Mounted at /api/push: web-push device subscriptions for the logged-in artist. */
export const pushRouter = Router()

pushRouter.use(requireArtist)

pushRouter.post("/subscribe", async (req, res) => {
  await pushService.subscribe(req.artist.id, bodyOf(req), req.get("user-agent") ?? null)
  res.json({ status: true })
})

pushRouter.post("/unsubscribe", async (req, res) => {
  await pushService.unsubscribe(req.artist.id, bodyOf(req))
  res.json({ status: true })
})

pushRouter.post("/test", async (req, res) => {
  await pushService.sendTest(req.artist.id, bodyOf(req))
  res.json({ status: true })
})
