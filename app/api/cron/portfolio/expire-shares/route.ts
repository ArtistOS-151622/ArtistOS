import { type NextRequest } from "next/server"

import { expireShares } from "@/lib/portfolio/folders"
import { portfolioError, portfolioSuccess } from "@/lib/portfolio/response"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  const secret = request.headers.get("authorization")?.replace("Bearer ", "")
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && secret !== cronSecret) {
    return portfolioError("Unauthorized", 401)
  }

  const supabase = await createClient()

  try {
    const count = await expireShares(supabase)
    return portfolioSuccess(`Expired ${count} share(s)`, { count })
  } catch (err) {
    return portfolioError(err instanceof Error ? err.message : "Cron failed", 500)
  }
}
