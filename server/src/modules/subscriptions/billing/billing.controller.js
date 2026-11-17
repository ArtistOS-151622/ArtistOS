import { getArtistSession } from "#src/middlewares/require-artist.js"
import { getBilling, InvoiceError, renderInvoice } from "#src/modules/subscriptions/billing/billing.service.js"
import { createDbClient } from "#src/integrations/supabase.js"
import { getUserPlanFeatures } from "#src/shared/subscription/plan-features.js"

export async function billing(req, res) {
  res.json(await getBilling(req.artist.id))
}

/** GET /api/billing/invoice/:id. PDF or plain-text errors, so it checks auth itself. */
export async function invoice(req, res) {
  try {
    const artist = getArtistSession(req)
    if (!artist) throw new InvoiceError(401, "Unauthorized")
    const { buffer, filename } = await renderInvoice(artist.id, req.params.id)
    res.set({ "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${filename}"` })
    res.send(buffer)
  } catch (err) {
    if (!(err instanceof InvoiceError)) throw err
    res.status(err.status).type("text/plain").send(err.message)
  }
}

/** GET /api/subscription-status: the plan/trial summary the app shell polls. */
export async function status(req, res) {
  let features
  try {
    features = await getUserPlanFeatures(createDbClient(), req.artist.id)
  } catch (err) {
    req.log.error({ err }, "failed to check subscription status")
    res.status(500).json({ error: "Internal server error" })
    return
  }
  res.set("Cache-Control", "no-store").json({
    trialDaysLeft: features.trialDaysLeft,
    isTrialExpired: features.isReadOnly && !features.hasActiveSub,
    hasActiveSub: features.hasActiveSub,
    isReadOnly: features.isReadOnly,
    subscriptionStatus: features.subscriptionStatus,
    daysSinceSignup: features.daysSinceSignup,
    planTier: features.planTier,
    planName: features.planName,
    billingPeriod: features.billingPeriod,
    hasWhatsAppAutomation: features.hasWhatsAppAutomation,
    storageQuotaMb: features.storageQuotaMb,
    storageQuotaBytes: features.storageQuotaBytes,
  })
}
