import { Router } from "express"

import { authRouter } from "#src/modules/auth/auth.routes.js"
import { coursesRouter } from "#src/modules/courses/courses.routes.js"
import { customersRouter } from "#src/modules/customers/customers.routes.js"
import { profileRouter } from "#src/modules/profile/profile.routes.js"
import { servicesRouter } from "#src/modules/services/services.routes.js"

/**
 * Every module router, mounted under /api. Paths match the old Next.js routes
 * exactly (e.g. /api/auth/otp/send). Each router applies its own auth.
 */
export const apiRouter = Router()

apiRouter.use("/auth", authRouter)
apiRouter.use("/profile", profileRouter)
apiRouter.use("/customers", customersRouter)
apiRouter.use("/services", servicesRouter)
apiRouter.use("/courses", coursesRouter)

/**
 * Webhooks need the raw request body for signature verification, so app.js
 * mounts this router BEFORE the JSON body parser. Each webhook route adds
 * `express.raw({ type: "application/json" })` itself.
 */
export const webhooksRouter = Router()
