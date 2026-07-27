import { type NextRequest } from "next/server"

import { getArtistSession } from "@/lib/auth/session"
import { portfolioError, portfolioSuccess } from "@/lib/portfolio/response"
import { createClient } from "@/lib/supabase/server"

export async function PATCH(request: NextRequest) {
  const session = getArtistSession(request)
  if (!session) return portfolioError("Unauthorized", 401)

  const body = await request.json()
  const { type, view } = body

  if (!["folder", "file"].includes(type) || !["largeGrid", "grid", "list"].includes(view)) {
    return portfolioError("Invalid view preference", 400)
  }

  const supabase = await createClient()
  const column = type === "folder" ? "folder_view" : "file_view"

  const { error } = await supabase
    .from("portfolio_storage_quotas")
    .update({ [column]: view })
    .eq("user_id", session.id)

  if (error) return portfolioError(error.message, 400)
  return portfolioSuccess("View preference saved", { type, view })
}
