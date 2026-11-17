import { Router } from "express"

import * as controller from "#src/modules/bookings/expense-categories/expense-categories.controller.js"

/** Mounted at /api/bookings/:id/expense-categories (mergeParams; requireArtist applied by the parent). */
export const expenseCategoriesRouter = Router({ mergeParams: true })

expenseCategoriesRouter.get("/", controller.list)
expenseCategoriesRouter.post("/", controller.create)
expenseCategoriesRouter.patch("/", controller.update)
expenseCategoriesRouter.delete("/", controller.remove)
