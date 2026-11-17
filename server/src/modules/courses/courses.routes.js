import { Router } from "express"

import * as controller from "#src/modules/courses/courses.controller.js"
import { studentsRouter } from "#src/modules/courses/students/students.routes.js"
import { requireArtist } from "#src/middlewares/require-artist.js"
import { useEnvelopeErrors } from "#src/shared/portfolio/response.js"

/** Mounted at /api/courses. */
export const coursesRouter = Router()

// The portfolio tab uses the { status, message, data } envelope, including its 401.
coursesRouter.get("/:id/portfolio", useEnvelopeErrors, requireArtist, controller.portfolio)

coursesRouter.use(requireArtist)
// Before "/:id" so "students" isn't taken as a course id.
coursesRouter.use("/students", studentsRouter)
coursesRouter.get("/", controller.list)
coursesRouter.post("/", controller.create)
coursesRouter.get("/:id", controller.get)
coursesRouter.patch("/:id", controller.update)
coursesRouter.delete("/:id", controller.remove)
