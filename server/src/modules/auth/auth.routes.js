import { Router } from "express"

import * as controller from "#src/modules/auth/auth.controller.js"
import { registerProfileSchema, sendOtpSchema, verifyOtpSchema } from "#src/modules/auth/auth.validation.js"
import { authLimiter } from "#src/middlewares/rate-limit.js"
import { requireArtist } from "#src/middlewares/require-artist.js"
import { validate } from "#src/middlewares/validate.js"

/** Mounted at /api/auth. */
export const authRouter = Router()

authRouter.post("/otp/send", authLimiter, validate(sendOtpSchema), controller.sendOtp)
authRouter.post("/otp/verify", authLimiter, validate(verifyOtpSchema), controller.verifyOtp)
authRouter.post("/register-profile", authLimiter, validate(registerProfileSchema), controller.registerProfile)
authRouter.post("/logout", controller.logout)
authRouter.get("/me", requireArtist, controller.me)
