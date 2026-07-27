import { type NextRequest } from "next/server"

import { getArtistSession } from "@/lib/auth/session"
import { getActivePlans, getGlobalGstRate } from "@/lib/portfolio/billing"
import { getOrCreateQuota, QuotaService } from "@/lib/portfolio/quota"
import { portfolioError, portfolioSuccess } from "@/lib/portfolio/response"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  const session = getArtistSession(request)
  if (!session) return portfolioError("Unauthorized", 401)

  const supabase = await createClient()

  try {
    const quotaRow = await getOrCreateQuota(supabase, session.id)
    const quota = QuotaService.fromRow(quotaRow)
    const plans = await getActivePlans(supabase)

    const { data: subscriptions } = await supabase
      .from("portfolio_storage_purchases")
      .select("*")
      .eq("user_id", session.id)
      .order("created_at", { ascending: false })
      .limit(10)

    const gstRate = await getGlobalGstRate(supabase)

    return portfolioSuccess("Storage info loaded", {
      quota: quota.getQuotaInfo(),
      plans,
      gstRate,
      purchases: subscriptions ?? [],
    })
  } catch (err) {
    return portfolioError(err instanceof Error ? err.message : "Failed to load storage info", 500)
  }
}
