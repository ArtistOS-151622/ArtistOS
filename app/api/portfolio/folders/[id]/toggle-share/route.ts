import { type NextRequest } from "next/server"

import { getArtistSession } from "@/lib/auth/session"
import { toggleShare, buildShareUrl } from "@/lib/portfolio/folders"
import { portfolioError, portfolioSuccess } from "@/lib/portfolio/response"
import { createClient } from "@/lib/supabase/server"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = getArtistSession(request)
  if (!session) return portfolioError("Unauthorized", 401)

  const id = Number((await params).id)
  if (Number.isNaN(id)) return portfolioError("Invalid folder ID", 400)

  const body = await request.json()
  const { is_shared, share_expires_at } = body

  if (typeof is_shared !== "boolean") {
    return portfolioError("is_shared is required", 400)
  }

  const supabase = await createClient()

  try {
    const folder = await toggleShare(
      supabase,
      session.id,
      id,
      is_shared,
      share_expires_at
    )

    return portfolioSuccess(
      is_shared ? "Sharing enabled" : "Sharing disabled",
      {
        folder,
        share_url: folder.is_shared ? buildShareUrl(folder.uuid) : null,
      }
    )
  } catch (err) {
    return portfolioError(err instanceof Error ? err.message : "Share toggle failed", 500)
  }
}
