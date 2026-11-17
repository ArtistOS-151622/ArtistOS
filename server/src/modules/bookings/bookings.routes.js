import { Router } from "express"

import * as controller from "#src/modules/bookings/bookings.controller.js"
import { chargesRouter } from "#src/modules/bookings/charges/charges.routes.js"
import { expenseCategoriesRouter } from "#src/modules/bookings/expense-categories/expense-categories.routes.js"
import { expensesRouter } from "#src/modules/bookings/expenses/expenses.routes.js"
import { paymentsRouter } from "#src/modules/bookings/payments/payments.routes.js"
import * as pdfController from "#src/modules/bookings/pdf/pdf.controller.js"
import { bookingPortfolioRouter } from "#src/modules/bookings/portfolio-tags/portfolio-tags.routes.js"
import { bookingRequestContext } from "#src/modules/bookings/request-context.js"
import { requireArtist } from "#src/middlewares/require-artist.js"

/** Mounted at /api/bookings. */
export const bookingsRouter = Router()

// Own response formats, so mounted before the JSON-auth middleware below:
bookingsRouter.get("/:id/pdf", pdfController.download) // PDF or plain-text errors
bookingsRouter.use("/:id/portfolio", bookingPortfolioRouter) // { status, message, data } envelope

// Create/update carry a request id in every error body (incl. 401), so it's set before auth.
bookingsRouter.post("/", bookingRequestContext, requireArtist, controller.create)
bookingsRouter.patch("/:id", bookingRequestContext, requireArtist, controller.update)

bookingsRouter.use(requireArtist)
bookingsRouter.get("/", controller.list)
bookingsRouter.get("/counts", controller.counts)
bookingsRouter.delete("/:id", controller.remove)
bookingsRouter.get("/:id/detail", controller.detail)
bookingsRouter.patch("/:id/discount", controller.discount)
bookingsRouter.patch("/:id/services", controller.services)
bookingsRouter.post("/:id/whatsapp-reminder", controller.whatsappReminder)
bookingsRouter.use("/:id/payments", paymentsRouter)
bookingsRouter.use("/:id/additional-charges", chargesRouter)
bookingsRouter.use("/:id/expenses", expensesRouter)
bookingsRouter.use("/:id/expense-categories", expenseCategoriesRouter)
