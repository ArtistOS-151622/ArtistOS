import { Router } from "express"

import * as controller from "#src/modules/courses/students/students.controller.js"

/** Mounted at /api/courses/students (requireArtist is applied by the courses router). */
export const studentsRouter = Router()

studentsRouter.get("/", controller.list)
studentsRouter.post("/", controller.create)
studentsRouter.get("/:id", controller.get)
studentsRouter.patch("/:id", controller.update)
studentsRouter.delete("/:id", controller.remove)
