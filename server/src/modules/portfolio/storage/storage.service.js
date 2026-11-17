import { createDbClient } from "#src/integrations/supabase.js"
import { getOrCreateQuota, QuotaService } from "#src/shared/portfolio/quota.js"
import { portfolioError } from "#src/shared/portfolio/response.js"

const RECENT_PURCHASES = 10

/** → { quota, plans (active storage plans), purchases (latest 10) } */
export async function getStorageInfo(userId) {
  const supabase = createDbClient()
  try {
    const [quotaRow, plansRes, { data: purchases }] = await Promise.all([
      getOrCreateQuota(supabase, userId),
      supabase.from("storage_plans").select("*").eq("is_active", true).order("sort_order", { ascending: true }),
      supabase
        .from("portfolio_storage_purchases")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(RECENT_PURCHASES),
    ])
    if (plansRes.error) throw new Error(plansRes.error.message)

    return {
      quota: QuotaService.fromRow(quotaRow).getQuotaInfo(),
      plans: plansRes.data ?? [],
      purchases: purchases ?? [],
    }
  } catch (err) {
    throw portfolioError(err instanceof Error ? err.message : "Failed to load storage info", 500)
  }
}
