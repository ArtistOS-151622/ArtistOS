import { Router } from "express"

import * as controller from "#src/modules/services/services.controller.js"
import { requireArtist } from "#src/middlewares/require-artist.js"

/** Mounted at /api/services. */
export const servicesRouter = Router()

servicesRouter.use(requireArtist)
servicesRouter.get("/", controller.list)
servicesRouter.post("/", controller.create)
servicesRouter.patch("/:id", controller.update)
servicesRouter.delete("/:id", controller.remove)
