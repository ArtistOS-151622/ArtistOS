import { Router } from "express"

import * as sharedLinkController from "#src/modules/portfolio/shared-link.controller.js"
import { publicLimiter } from "#src/middlewares/rate-limit.js"
import { useEnvelopeErrors } from "#src/shared/portfolio/response.js"

/** Mounted at /api/public/portfolio. Unauthenticated shared-link viewer (envelope responses). */
export const publicPortfolioRouter = Router()

publicPortfolioRouter.use(useEnvelopeErrors, publicLimiter)
publicPortfolioRouter.get("/shared/:uuid", sharedLinkController.view)
