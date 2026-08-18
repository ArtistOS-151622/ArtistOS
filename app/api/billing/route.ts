import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getArtistSession } from "@/lib/auth/session"

type PlatformPaymentRow = {
  id: number
  amount: number
  plan_name: string | null
  status: string
  created_at: string
  invoice_number: string | null
}

type StoragePurchaseRow = {
  id: number
  amount: number
  status: string
  created_at: string
  rp_order_id: string | null
  rp_payment_id: string | null
  storage_plans?: { name?: string | null } | null
}

export async function GET(request: NextRequest) {
  const session = getArtistSession(request)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supabase = await createClient()

  try {
    const userId = session.id

    // Get user's active/pending/halted/cancelled subscription (if any)
    const { data: subscriptionRow } = await supabase
      .from("user_subscriptions")
      .select("*, platform_subscriptions(*)")
      .eq("user_id", userId)
      .in("status", ["active", "pending", "halted", "cancelled"])
      .order("created_at", { ascending: false, nullsFirst: true })
      .limit(1)
      .maybeSingle()
    const endDateStr = subscriptionRow?.next_billing_at
    const subscription =
      subscriptionRow &&
      (subscriptionRow.status === "pending" || subscriptionRow.status === "halted" || !endDateStr || new Date(endDateStr) > new Date())
        ? subscriptionRow
        : null

    // Get payment history (platform subscription payments)
    const { data: platformPayments } = await supabase
      .from("platform_payments")
      .select("*")
      .eq("user_id", userId)

    // Get storage purchases
    const { data: storagePurchases } = await supabase
      .from("portfolio_storage_purchases")
      .select("*, storage_plans(name)")
      .eq("user_id", userId)

    // Format and combine payments
    const formattedPlatformPayments = ((platformPayments || []) as PlatformPaymentRow[]).map((p) => ({
      id: `platform_${p.id}`,
      amount: p.amount,
      plan_name: p.plan_name,
      status: p.status,
      created_at: p.created_at,
      invoice_number: p.invoice_number,
      type: "platform"
    }))

    const formattedStoragePurchases = ((storagePurchases || []) as StoragePurchaseRow[]).map((p) => ({
      id: `storage_${p.id}`,
      amount: p.amount,
      plan_name: p.storage_plans?.name ? `Storage: ${p.storage_plans.name}` : "Storage Add-on",
      status: p.status,
      created_at: p.created_at,
      invoice_number: p.rp_order_id || p.rp_payment_id || `STG-${p.id}`,
      type: "storage"
    }))

    const allPayments = [...formattedPlatformPayments, ...formattedStoragePurchases].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )

    return NextResponse.json({
      subscription: subscription || null,
      payments: allPayments
    })
  } catch (error) {
    console.error("Error fetching billing info:", error)
    return NextResponse.json({ subscription: null, payments: [] })
  }
}
