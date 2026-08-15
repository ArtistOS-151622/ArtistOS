import { type NextRequest } from "next/server"

import { checkIsReadOnly } from "@/lib/auth/subscription"
import { getArtistSession } from "@/lib/auth/session"
import { renameFile } from "@/lib/portfolio/files"
import { portfolioError, portfolioSuccess } from "@/lib/portfolio/response"
import { createClient } from "@/lib/supabase/server"

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = getArtistSession(request)
  if (!session) return portfolioError("Unauthorized", 401)

  const id = Number((await params).id)
  const body = await request.json()
  const { original_name } = body

  if (!original_name?.trim()) return portfolioError("original_name is required", 400)

  const supabase = await createClient()

  if (await checkIsReadOnly(supabase, session.id)) {
    return portfolioError("Your subscription has expired. Please upgrade to rename files.", 403)
  }

  try {
    const file = await renameFile(supabase, session.id, id, original_name.trim())
    return portfolioSuccess("File renamed", { file })
  } catch (err) {
    return portfolioError(err instanceof Error ? err.message : "Rename failed", 500)
  }
}
