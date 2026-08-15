import { type NextRequest } from "next/server"

import { checkIsReadOnly } from "@/lib/auth/subscription"
import { getArtistSession } from "@/lib/auth/session"
import { deleteFileRecord } from "@/lib/portfolio/files"
import { portfolioError, portfolioSuccess } from "@/lib/portfolio/response"
import { createClient } from "@/lib/supabase/server"

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = getArtistSession(request)
  if (!session) return portfolioError("Unauthorized", 401)

  const id = Number((await params).id)
  if (Number.isNaN(id)) return portfolioError("Invalid file ID", 400)

  const supabase = await createClient()

  if (await checkIsReadOnly(supabase, session.id)) {
    return portfolioError("Your subscription has expired. Please upgrade to delete files.", 403)
  }

  try {
    await deleteFileRecord(supabase, session.id, id)
    return portfolioSuccess("File deleted", { id })
  } catch (err) {
    return portfolioError(err instanceof Error ? err.message : "Delete failed", 500)
  }
}
