import { type NextRequest } from "next/server"

import { checkIsReadOnly } from "@/lib/auth/subscription"
import { getArtistSession } from "@/lib/auth/session"
import { deleteFilesBulk } from "@/lib/portfolio/files"
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

  if (await checkIsReadOnly(supabase, session.id)) {
    return portfolioError("Your subscription has expired. Please upgrade to delete files.", 403)
  }

  try {
    const count = await deleteFilesBulk(supabase, session.id, ids.map(Number))
    return portfolioSuccess(`${count} file(s) deleted`, { count })
  } catch (err) {
    return portfolioError(err instanceof Error ? err.message : "Bulk delete failed", 500)
  }
}
