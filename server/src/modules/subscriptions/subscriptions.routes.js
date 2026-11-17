import { Router } from "express"

import * as billingController from "#src/modules/subscriptions/billing/billing.controller.js"
import * as platformController from "#src/modules/subscriptions/platform/platform.controller.js"
import * as storageController from "#src/modules/subscriptions/storage/storage-purchase.controller.js"
import { requireArtist } from "#src/middlewares/require-artist.js"
import { useEnvelopeErrors } from "#src/shared/portfolio/response.js"

/*
 * Each endpoint keeps the response shape it always had, including for 401s:
 *   /api/billing, /api/subscription-status     → { error }
 *   /api/billing/invoice/:id                   → PDF or plain text
 *   purchase / verify                          → { status, message, data } envelope
 *   failed / cancel                            → { status, message }
 */

/** Mounted at /api/billing. */
export const billingRouter = Router()
billingRouter.get("/invoice/:id", billingController.invoice)
billingRouter.get("/", requireArtist, billingController.billing)

/** Mounted at /api/subscription-status. */
export const subscriptionStatusRouter = Router()
subscriptionStatusRouter.get("/", requireArtist, billingController.status)

/** Mounted at /api/platform-subscriptions. */
export const platformSubscriptionsRouter = Router()
platformSubscriptionsRouter.get("/", platformController.listPlans)
platformSubscriptionsRouter.post("/purchase", useEnvelopeErrors, requireArtist, platformController.purchase)
platformSubscriptionsRouter.post("/verify", useEnvelopeErrors, requireArtist, platformController.verify)
platformSubscriptionsRouter.post("/failed", platformController.failed)
platformSubscriptionsRouter.post("/cancel", platformController.cancel)

/** Mounted at /api/portfolio/purchase-storage (before the portfolio router, which would wrap it). */
export const storagePurchaseRouter = Router()
storagePurchaseRouter.post("/", useEnvelopeErrors, requireArtist, storageController.purchase)
storagePurchaseRouter.post("/verify", useEnvelopeErrors, requireArtist, storageController.verify)
storagePurchaseRouter.post("/failed", storageController.failed)
storagePurchaseRouter.post("/cancel", storageController.cancel)
