import { type NextRequest } from "next/server"

import { getArtistSession } from "@/lib/auth/session"
import { updateFolderSortOrder } from "@/lib/portfolio/folders"
import { portfolioError, portfolioSuccess } from "@/lib/portfolio/response"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  const session = getArtistSession(request)
  if (!session) return portfolioError("Unauthorized", 401)

  const body = await request.json()
  const { ids } = body

  if (!Array.isArray(ids) || ids.length === 0) {
    return portfolioError("ids array is required", 400)
  }

  const supabase = await createClient()

  try {
    await updateFolderSortOrder(
      supabase,
      session.id,
      ids.map(Number)
    )
    return portfolioSuccess("Folders reordered", { ids })
  } catch (err) {
    return portfolioError(err instanceof Error ? err.message : "Reorder failed", 500)
  }
}
