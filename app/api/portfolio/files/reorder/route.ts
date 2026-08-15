import { type NextRequest } from "next/server"

import { checkIsReadOnly } from "@/lib/auth/subscription"
import { getArtistSession } from "@/lib/auth/session"
import { updateFileSortOrder } from "@/lib/portfolio/files"
import { portfolioError, portfolioSuccess } from "@/lib/portfolio/response"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  const session = getArtistSession(request)
  if (!session) return portfolioError("Unauthorized", 401)

  const body = await request.json()
  const { ids, folder_id } = body

  if (!Array.isArray(ids) || !folder_id) {
    return portfolioError("ids and folder_id are required", 400)
  }

  const supabase = await createClient()

  if (await checkIsReadOnly(supabase, session.id)) {
    return portfolioError("Your subscription has expired. Please upgrade to reorder files.", 403)
  }

  try {
    await updateFileSortOrder(
      supabase,
      session.id,
      Number(folder_id),
      ids.map(Number)
    )
    return portfolioSuccess("Files reordered", { ids })
  } catch (err) {
    return portfolioError(err instanceof Error ? err.message : "Reorder failed", 500)
  }
}
