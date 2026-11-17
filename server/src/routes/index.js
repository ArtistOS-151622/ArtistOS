import { Router } from "express"

import { authRouter } from "#src/modules/auth/auth.routes.js"
import { bookingsRouter } from "#src/modules/bookings/bookings.routes.js"
import { coursesRouter } from "#src/modules/courses/courses.routes.js"
import { customersRouter } from "#src/modules/customers/customers.routes.js"
import { publicInquiryRouter } from "#src/modules/inquiries/inquiries.public.routes.js"
import { inquiriesRouter } from "#src/modules/inquiries/inquiries.routes.js"
import { publicPortfolioRouter } from "#src/modules/portfolio/portfolio.public.routes.js"
import { portfolioRouter } from "#src/modules/portfolio/portfolio.routes.js"
import { profileRouter } from "#src/modules/profile/profile.routes.js"
import { servicesRouter } from "#src/modules/services/services.routes.js"
import {
  billingRouter,
  platformSubscriptionsRouter,
  storagePurchaseRouter,
  subscriptionStatusRouter,
} from "#src/modules/subscriptions/subscriptions.routes.js"

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
apiRouter.use("/bookings", bookingsRouter)
apiRouter.use("/inquiries", inquiriesRouter)
// Before /portfolio: storage purchases have their own response shapes and auth.
apiRouter.use("/portfolio/purchase-storage", storagePurchaseRouter)
apiRouter.use("/portfolio", portfolioRouter)
apiRouter.use("/billing", billingRouter)
apiRouter.use("/subscription-status", subscriptionStatusRouter)
apiRouter.use("/platform-subscriptions", platformSubscriptionsRouter)

// Public, unauthenticated routers.
apiRouter.use("/public/inquiry", publicInquiryRouter)
apiRouter.use("/public/portfolio", publicPortfolioRouter)

/**
 * Webhooks need the raw request body for signature verification, so app.js
 * mounts this router BEFORE the JSON body parser. Each webhook route adds
 * `express.raw({ type: "application/json" })` itself.
 */
export const webhooksRouter = Router()
