import { Router } from "express"

import * as controller from "#src/modules/bookings/portfolio-tags/portfolio-tags.controller.js"
import { requireArtist } from "#src/middlewares/require-artist.js"
import { useEnvelopeErrors } from "#src/shared/portfolio/response.js"

/** Mounted at /api/bookings/:id/portfolio. Envelope responses ({ status, message, data }), incl. 401. */
export const bookingPortfolioRouter = Router({ mergeParams: true })

bookingPortfolioRouter.use(useEnvelopeErrors, requireArtist)
bookingPortfolioRouter.get("/", controller.get)
bookingPortfolioRouter.post("/", controller.create)
