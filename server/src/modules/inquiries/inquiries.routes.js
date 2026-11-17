import { Router } from "express"

import * as controller from "#src/modules/inquiries/inquiries.controller.js"
import { requireArtist } from "#src/middlewares/require-artist.js"

/** Mounted at /api/inquiries. */
export const inquiriesRouter = Router()

inquiriesRouter.use(requireArtist)
inquiriesRouter.get("/", controller.list)
inquiriesRouter.get("/counts", controller.counts)
inquiriesRouter.get("/form-link", controller.getFormLink)
inquiriesRouter.post("/form-link", controller.activateFormLink)
inquiriesRouter.post("/:id/convert", controller.convert)
inquiriesRouter.post("/:id/cancel", controller.cancel)
