import { type NextRequest } from "next/server"

import { getArtistSession } from "@/lib/auth/session"
import { getActivePlans } from "@/lib/portfolio/billing"
import { getOrCreateQuota, QuotaService } from "@/lib/portfolio/quota"
import { portfolioError, portfolioSuccess } from "@/lib/portfolio/response"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  const session = getArtistSession(request)
  if (!session) return portfolioError("Unauthorized", 401)

  const supabase = await createClient()

  try {
    // Quota, plan list and purchase history are independent: load them together
    const [quotaRow, plans, { data: subscriptions }] = await Promise.all([
      getOrCreateQuota(supabase, session.id),
      getActivePlans(supabase),
      supabase
        .from("portfolio_storage_purchases")
        .select("*")
        .eq("user_id", session.id)
        .order("created_at", { ascending: false })
        .limit(10),
    ])
    const quota = QuotaService.fromRow(quotaRow)

    return portfolioSuccess("Storage info loaded", {
      quota: quota.getQuotaInfo(),
      plans,
      purchases: subscriptions ?? [],
    })
  } catch (err) {
    return portfolioError(err instanceof Error ? err.message : "Failed to load storage info", 500)
  }
}
