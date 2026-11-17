import { Router } from "express"

import * as controller from "#src/modules/portfolio/folders/folders.controller.js"

/** Mounted at /api/portfolio/folders (auth + envelope errors applied by the parent). */
export const foldersRouter = Router()

foldersRouter.get("/", controller.list)
foldersRouter.post("/", controller.create)
foldersRouter.put("/:id", controller.update)
foldersRouter.delete("/:id", controller.remove)
foldersRouter.post("/:id/toggle-share", controller.toggleShare)
