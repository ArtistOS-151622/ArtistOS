import { Router } from "express"

import * as controller from "#src/modules/bookings/charges/charges.controller.js"

/** Mounted at /api/bookings/:id/additional-charges (mergeParams; requireArtist applied by the parent). */
export const chargesRouter = Router({ mergeParams: true })

chargesRouter.post("/", controller.create)
chargesRouter.patch("/", controller.update)
chargesRouter.delete("/", controller.remove)
