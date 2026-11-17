import { Router } from "express"

import * as controller from "#src/modules/profile/profile.controller.js"
import { updateProfileSchema } from "#src/modules/profile/profile.validation.js"
import { requireArtist } from "#src/middlewares/require-artist.js"
import { validate } from "#src/middlewares/validate.js"

/** Mounted at /api/profile. */
export const profileRouter = Router()

profileRouter.use(requireArtist)
profileRouter.get("/", controller.getProfile)
profileRouter.put("/", validate(updateProfileSchema), controller.updateProfile)
