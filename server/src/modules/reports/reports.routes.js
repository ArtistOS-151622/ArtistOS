import { Router } from "express"

import * as controller from "#src/modules/reports/reports.controller.js"
import { requireArtist } from "#src/middlewares/require-artist.js"

/** Mounted at /api/reports. */
export const reportsRouter = Router()

reportsRouter.use(requireArtist)
reportsRouter.get("/customers", controller.customers)
reportsRouter.get("/services", controller.services)
reportsRouter.get("/payments", controller.payments)
