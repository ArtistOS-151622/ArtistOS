import { Router } from "express"

/**
 * Module routers are mounted here as they are ported (phase 3), e.g.
 *   apiRouter.use("/bookings", bookingsRouter)
 *
 * Public, unauthenticated routers (`<module>.public.routes.js`) mount under
 * "/public" with `publicLimiter`; everything else uses `requireArtist` (or
 * `requireAdmin` for /admin) inside its own router.
 */
export const apiRouter = Router()

/**
 * Webhooks need the raw request body for signature verification, so app.js
 * mounts this router BEFORE the JSON body parser. Each webhook route adds
 * `express.raw({ type: "application/json" })` itself.
 */
export const webhooksRouter = Router()
