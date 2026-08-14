import { type NextRequest } from "next/server"
import { getArtistSession } from "@/lib/auth/session"
import { createPlatformPurchase } from "@/lib/platform-billing"
import { portfolioError, portfolioSuccess } from "@/lib/portfolio/response"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(request: NextRequest) {
  const session = getArtistSession(request)
  if (!session) return portfolioError("Unauthorized", 401)

  const body = await request.json()
  const planId = Number(body.plan_id)

  if (Number.isNaN(planId)) return portfolioError("plan_id is required", 400)

  const supabase = createAdminClient()

  try {
    const result = await createPlatformPurchase(supabase, session.id, planId)
    return portfolioSuccess("Purchase initiated", result, 201)
  } catch (err) {
    return portfolioError(err instanceof Error ? err.message : "Purchase failed", 500)
  }
}
