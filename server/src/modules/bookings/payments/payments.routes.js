import { Router } from "express"

import * as controller from "#src/modules/bookings/payments/payments.controller.js"

/** Mounted at /api/bookings/:id/payments (mergeParams; requireArtist applied by the parent). */
export const paymentsRouter = Router({ mergeParams: true })

paymentsRouter.get("/", controller.list)
paymentsRouter.post("/", controller.create)
paymentsRouter.patch("/", controller.update)
paymentsRouter.delete("/", controller.remove)
