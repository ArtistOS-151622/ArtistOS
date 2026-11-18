import { Router } from "express"

import { createDbClient, createPreferredClient } from "#src/integrations/supabase.js"
import { isPushConfigured } from "#src/integrations/web-push.js"
import { requireCron } from "#src/middlewares/require-cron.js"
import { dispatchPendingNotifications } from "#src/shared/notifications/dispatcher.js"
import { scanBookingReminders } from "#src/shared/notifications/producers/booking-reminders.js"
import { scanCustomerWhatsAppReminders } from "#src/shared/notifications/whatsapp/booking.js"
import { scanDailyArtistAgenda } from "#src/shared/notifications/whatsapp/daily-agenda.js"
import { expireShares } from "#src/shared/portfolio/folders.js"
import { portfolioError, sendPortfolio, useEnvelopeErrors } from "#src/shared/portfolio/response.js"
import { ApiError, serviceUnavailable } from "#src/utils/api-error.js"
import { queryParam } from "#src/utils/request.js"

/*
 * Scheduled jobs (GitHub Actions → Authorization: Bearer CRON_SECRET). Thin entry
 * points: auth, then the shared services. Response bodies match the Next.js routes;
 * unlike them, a missing CRON_SECRET refuses every call (requireCron fails closed).
 */

const failure = (err, fallback) => new ApiError(500, err instanceof Error ? err.message : fallback, { cause: err })

/** Producer + auto-dispatch: 2h/10m artist push reminders, 24h customer WhatsApp reminders, then drain the queue. */
async function scanBookings(_req, res) {
  const supabase = createPreferredClient()
  try {
    const scanResult = await scanBookingReminders(supabase)
    const whatsAppReminders = await scanCustomerWhatsAppReminders(supabase)
    const dispatched = await dispatchPendingNotifications(supabase)

    res.json({
      status: true,
      enqueued: scanResult.enqueued,
      skipped: scanResult.skipped,
      enqueued2h: scanResult.enqueued2h,
      enqueued10m: scanResult.enqueued10m,
      whatsAppReminders,
      dispatched,
    })
  } catch (err) {
    throw failure(err, "Scan failed")
  }
}

/** Drains notification_events and delivers pushes. */
async function dispatch(_req, res) {
  if (!isPushConfigured()) throw serviceUnavailable("Push notifications are not configured")
  try {
    res.json({ status: true, ...(await dispatchPendingNotifications(createPreferredClient())) })
  } catch (err) {
    throw failure(err, "Dispatch failed")
  }
}

/** Daily, 5:00 AM IST: today's confirmed bookings to each eligible artist via WhatsApp. `?date=` overrides the day. */
async function dailyAgenda(req, res) {
  try {
    const result = await scanDailyArtistAgenda(createPreferredClient(), queryParam(req, "date") || undefined)
    res.json({
      status: true,
      scannedArtists: result.scannedArtists,
      sent: result.sent,
      skipped: result.skipped,
      failed: result.failed,
      details: result.details,
    })
  } catch (err) {
    throw failure(err, "Daily agenda scan failed")
  }
}

/** Un-shares expired portfolio folders. Portfolio envelope responses, including the 401. */
async function expirePortfolioShares(_req, res) {
  let count
  try {
    count = await expireShares(createDbClient())
  } catch (err) {
    throw portfolioError(err instanceof Error ? err.message : "Cron failed", 500)
  }
  sendPortfolio(res, `Expired ${count} share(s)`, { count })
}

/** Mounted at /api/cron. */
export const cronRouter = Router()

cronRouter.get("/portfolio/expire-shares", useEnvelopeErrors, requireCron, expirePortfolioShares)

cronRouter.use("/notifications", requireCron)
cronRouter.get("/notifications/scan-bookings", scanBookings)
cronRouter.post("/notifications/scan-bookings", scanBookings)
cronRouter.get("/notifications/dispatch", dispatch)
cronRouter.get("/notifications/daily-agenda", dailyAgenda)
cronRouter.post("/notifications/daily-agenda", dailyAgenda)
