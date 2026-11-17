import { Router } from "express"

import * as controller from "#src/modules/bookings/expenses/expenses.controller.js"

/** Mounted at /api/bookings/:id/expenses (mergeParams; requireArtist applied by the parent). */
export const expensesRouter = Router({ mergeParams: true })

expensesRouter.get("/", controller.list)
expensesRouter.post("/", controller.create)
expensesRouter.patch("/", controller.update)
expensesRouter.delete("/", controller.remove)
