import { Router } from "express"

import * as controller from "#src/modules/inquiries/inquiries.controller.js"
import { publicLimiter } from "#src/middlewares/rate-limit.js"

/** Mounted at /api/public/inquiry. Unauthenticated: the artist is identified by the form code. */
export const publicInquiryRouter = Router()

publicInquiryRouter.use(publicLimiter)
publicInquiryRouter.get("/f/:code", controller.getPublicForm)
publicInquiryRouter.post("/f/:code", controller.submitPublicInquiry)
