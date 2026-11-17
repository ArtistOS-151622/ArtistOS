import { Router } from "express"

import { filesRouter } from "#src/modules/portfolio/files/files.routes.js"
import { foldersRouter } from "#src/modules/portfolio/folders/folders.routes.js"
import * as storageController from "#src/modules/portfolio/storage/storage.controller.js"
import { ticketsRouter } from "#src/modules/portfolio/tickets/tickets.routes.js"
import { requireArtist } from "#src/middlewares/require-artist.js"
import { useEnvelopeErrors } from "#src/shared/portfolio/response.js"

/**
 * Mounted at /api/portfolio. Every response uses the { status, message, data }
 * envelope, including 401s. Storage purchase routes live in the subscriptions module.
 */
export const portfolioRouter = Router()

portfolioRouter.use(useEnvelopeErrors, requireArtist)
portfolioRouter.use("/folders", foldersRouter)
portfolioRouter.use("/files", filesRouter)
portfolioRouter.use("/tickets", ticketsRouter)
portfolioRouter.get("/storage-info", storageController.info)
