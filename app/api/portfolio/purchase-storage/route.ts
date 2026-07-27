import { type NextRequest } from "next/server"

import { getArtistSession } from "@/lib/auth/session"
import { createStoragePurchase } from "@/lib/portfolio/billing"
import { portfolioError, portfolioSuccess } from "@/lib/portfolio/response"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  const session = getArtistSession(request)
  if (!session) return portfolioError("Unauthorized", 401)

  const body = await request.json()
  const planId = Number(body.plan_id ?? body.plan_index)
  const quantity = Number(body.quantity ?? 1)

  if (Number.isNaN(planId)) return portfolioError("plan_id is required", 400)

  const supabase = await createClient()

  try {
    const result = await createStoragePurchase(supabase, session.id, planId, quantity)
    return portfolioSuccess("Purchase initiated", result, 201)
  } catch (err) {
    return portfolioError(err instanceof Error ? err.message : "Purchase failed", 500)
  }
}
