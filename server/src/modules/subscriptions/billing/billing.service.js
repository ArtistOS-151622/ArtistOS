import { renderToBuffer } from "@react-pdf/renderer"

import { createDbClient } from "#src/integrations/supabase.js"
import { InvoicePdf } from "#src/modules/subscriptions/billing/invoice-pdf.js"
import { logger } from "#src/utils/logger.js"

const log = logger.child({ module: "billing" })

// Free (lifetime) accounts have no subscription row; the billing page shows this instead.
const FREE_LIFETIME_PLAN = Object.freeze({
  id: -1,
  name: "ArtistOS Lifetime (Free)",
  description:
    "Complimentary platform access for free accounts with 100 MB cloud storage and automated WhatsApp messaging.",
  amount_inr: 0,
  compare_at_amount_inr: null,
  discount_percentage: null,
  billing_period: "Lifetime",
  storage_quota_mb: 100,
  has_whatsapp_automation: true,
  features: [
    "Unlimited Platform Access",
    "100 MB Cloud Storage",
    "Automated WhatsApp Messages Active",
    "Complimentary Full Access",
  ],
  is_featured: true,
  is_active: true,
})

const storagePlanLabel = (purchase) =>
  purchase.storage_plans?.name ? `Storage: ${purchase.storage_plans.name}` : "Storage Add-on"
const storageInvoiceNumber = (purchase) => purchase.rp_order_id || purchase.rp_payment_id || `STG-${purchase.id}`

/**
 * The current subscription (still valid, pending or halted) and completed/failed payment
 * history (platform + storage, newest first). Any failure → empty result (as before).
 */
export async function getBilling(userId) {
  const supabase = createDbClient()
  try {
    const { data: user } = await supabase.from("users").select("is_free_user").eq("id", userId).single()

    let subscriptionRow
    if (user?.is_free_user) {
      subscriptionRow = {
        id: -1,
        user_id: userId,
        platform_subscription_id: -1,
        status: "active",
        current_period_start: null,
        current_period_end: null,
        next_billing_at: null,
        platform_subscriptions: { ...FREE_LIFETIME_PLAN, features: [...FREE_LIFETIME_PLAN.features] },
      }
    } else {
      const { data } = await supabase
        .from("user_subscriptions")
        .select("*, platform_subscriptions(*)")
        .eq("user_id", userId)
        .in("status", ["active", "pending", "halted", "cancelled"])
        .order("created_at", { ascending: false, nullsFirst: true })
        .limit(1)
        .maybeSingle()
      subscriptionRow = data
    }

    const endDateStr = subscriptionRow?.next_billing_at
    const subscription =
      subscriptionRow &&
      (subscriptionRow.status === "pending" ||
        subscriptionRow.status === "halted" ||
        !endDateStr ||
        new Date(endDateStr) > new Date())
        ? subscriptionRow
        : null

    // Abandoned (pending/cancelled) checkouts are kept for reconciliation but not shown.
    const { data: platformPayments } = await supabase
      .from("platform_payments")
      .select("*")
      .eq("user_id", userId)
      .neq("status", "cancelled")
      .neq("status", "pending")
    const { data: storagePurchases } = await supabase
      .from("portfolio_storage_purchases")
      .select("*, storage_plans(name)")
      .eq("user_id", userId)
      .neq("status", "cancelled")
      .neq("status", "pending")

    const payments = [
      ...(platformPayments || []).map((p) => ({
        id: `platform_${p.id}`,
        amount: p.amount,
        plan_name: p.plan_name,
        status: p.status,
        created_at: p.created_at,
        invoice_number: p.invoice_number,
        type: "platform",
      })),
      ...(storagePurchases || []).map((p) => ({
        id: `storage_${p.id}`,
        amount: p.amount,
        plan_name: storagePlanLabel(p),
        status: p.status,
        created_at: p.created_at,
        invoice_number: storageInvoiceNumber(p),
        type: "storage",
      })),
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    return { subscription: subscription || null, payments }
  } catch (err) {
    log.error({ err }, "failed to load billing info")
    return { subscription: null, payments: [] }
  }
}

/** Plain-text failures (the invoice endpoint never returned JSON). */
export class InvoiceError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

/** Invoice PDF for "platform_<id>" or "storage_<id>". → { buffer, filename } */
export async function renderInvoice(userId, invoiceId) {
  if (!invoiceId.includes("_")) throw new InvoiceError(400, "Invalid invoice ID")
  const [type, idStr] = invoiceId.split("_")
  const id = parseInt(idStr, 10)
  if (Number.isNaN(id) || (type !== "platform" && type !== "storage")) throw new InvoiceError(400, "Invalid invoice ID")

  const supabase = createDbClient()
  try {
    const { data: user } = await supabase.from("users").select("artist_name, studio_name").eq("id", userId).single()

    let invoice
    if (type === "platform") {
      const { data, error } = await supabase
        .from("platform_payments")
        .select("*")
        .eq("id", id)
        .eq("user_id", userId)
        .single()
      if (error || !data) throw new Error("Invoice not found")
      invoice = {
        invoiceNumber: data.invoice_number || `PLT-${data.id}`,
        date: data.created_at,
        planName: data.plan_name,
        status: data.status,
        amount: data.amount,
      }
    } else {
      const { data, error } = await supabase
        .from("portfolio_storage_purchases")
        .select("*, storage_plans(name)")
        .eq("id", id)
        .eq("user_id", userId)
        .single()
      if (error || !data) throw new Error("Invoice not found")
      invoice = {
        invoiceNumber: storageInvoiceNumber(data),
        date: data.created_at,
        planName: storagePlanLabel(data),
        status: data.status,
        amount: data.amount,
      }
    }

    const buffer = await renderToBuffer(InvoicePdf({ ...invoice, userName: user?.artist_name, studioName: user?.studio_name }))
    return { buffer, filename: `Invoice-${invoice.invoiceNumber}.pdf` }
  } catch (err) {
    log.error({ err }, "failed to generate invoice PDF")
    throw new InvoiceError(404, "Invoice not found or could not be generated")
  }
}
