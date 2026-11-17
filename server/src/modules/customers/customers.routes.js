import { Router } from "express"

import * as controller from "#src/modules/customers/customers.controller.js"
import { requireArtist } from "#src/middlewares/require-artist.js"

/** Mounted at /api/customers. */
export const customersRouter = Router()

customersRouter.use(requireArtist)
customersRouter.get("/", controller.list)
customersRouter.post("/", controller.create)
customersRouter.patch("/:id", controller.update)
customersRouter.delete("/:id", controller.remove)
