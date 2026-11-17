import { Router } from "express"

import * as authController from "#src/modules/admin/admin-auth.controller.js"
import * as controller from "#src/modules/admin/admin.controller.js"
import { authLimiter } from "#src/middlewares/rate-limit.js"
import { requireAdmin } from "#src/middlewares/require-admin.js"

/** Mounted at /api/admin. Everything except login requires the signed admin session. */
export const adminRouter = Router()

adminRouter.post("/login", authLimiter, authController.login)

adminRouter.use(requireAdmin)
adminRouter.post("/logout", authController.logout)

adminRouter.get("/stats", controller.stats)
adminRouter.get("/payments", controller.payments)
adminRouter.get("/storage", controller.storage)

adminRouter.get("/settings", controller.getSettings)
adminRouter.post("/settings", controller.updateSettings)

adminRouter.get("/platform-subscriptions", controller.listPlans)
adminRouter.post("/platform-subscriptions", controller.createPlan)
adminRouter.put("/platform-subscriptions/:id", controller.updatePlan)
adminRouter.delete("/platform-subscriptions/:id", controller.deletePlan)

adminRouter.get("/storage-plans", controller.listStoragePlans)
adminRouter.post("/storage-plans", controller.updateStoragePlan)

adminRouter.get("/tickets", controller.listTickets)
adminRouter.put("/tickets/:id", controller.setTicketStatus)
adminRouter.get("/tickets/:id/messages", controller.ticketMessages)
adminRouter.post("/tickets/:id/messages", controller.replyToTicket)

adminRouter.get("/users", controller.listUsers)
adminRouter.patch("/users", controller.updateUser)
adminRouter.delete("/users", controller.deleteUser)
adminRouter.post("/users/delete-otp", controller.sendDeleteOtp)
