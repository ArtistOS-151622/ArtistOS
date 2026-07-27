import { type NextRequest } from "next/server"

import { findSharedFolderByUuid } from "@/lib/portfolio/folders"
import { enrichFile } from "@/lib/portfolio/files"
import { getOrCreateQuota, QuotaService } from "@/lib/portfolio/quota"
import { portfolioError, portfolioSuccess } from "@/lib/portfolio/response"
import { createClient } from "@/lib/supabase/server"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ uuid: string }> }
) {
  const uuid = (await params).uuid
  const supabase = await createClient()

  try {
    const folder = await findSharedFolderByUuid(supabase, uuid)
    if (!folder) return portfolioError("Share link not found or expired", 404)

    const { data: owner } = await supabase
      .from("users")
      .select("id, artist_name, studio_name, avatar_file_id")
      .eq("id", folder.user_id)
      .single()

    const quotaRow = await getOrCreateQuota(supabase, folder.user_id)
    const status = QuotaService.fromRow(quotaRow).getSubscriptionStatus()
    const unavailable = status === "grace" || status === "expired"

    let avatarUrl: string | null = null
    if (owner?.avatar_file_id) {
      const { data: avatarFile } = await supabase
        .from("portfolio_files")
        .select("*")
        .eq("id", owner.avatar_file_id)
        .maybeSingle()

      if (avatarFile) avatarUrl = enrichFile(avatarFile).public_url
    }

    const { data: files } = await supabase
      .from("portfolio_files")
      .select("*")
      .eq("folder_id", folder.id)
      .order("sort_order", { ascending: true })

    return portfolioSuccess("Shared portfolio loaded", {
      folder,
      owner: owner
        ? {
            artist_name: owner.artist_name,
            studio_name: owner.studio_name,
            avatar_url: avatarUrl,
          }
        : null,
      unavailable,
      subscription_status: status,
      files: unavailable ? [] : (files ?? []).map((f) => enrichFile(f)),
    })
  } catch (err) {
    return portfolioError(err instanceof Error ? err.message : "Failed to load share", 500)
  }
}
