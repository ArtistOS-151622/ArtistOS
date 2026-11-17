import { Router } from "express"

import * as controller from "#src/modules/portfolio/tickets/tickets.controller.js"

/** Mounted at /api/portfolio/tickets (auth + envelope errors applied by the parent). */
export const ticketsRouter = Router()

ticketsRouter.get("/", controller.list)
ticketsRouter.post("/", controller.create)
ticketsRouter.get("/:id/messages", controller.messages)
ticketsRouter.post("/:id/messages", controller.reply)
