import { createAdminClient } from "#src/integrations/supabase.js"
import { enrichFile, fileUrl } from "#src/shared/portfolio/files.js"
import { findSharedFolderByUuid } from "#src/shared/portfolio/folders.js"
import { portfolioError } from "#src/shared/portfolio/response.js"

/**
 * Public view of a shared folder: the folder, its owner (name + avatar) and files.
 * Uses the service-role client (no artist session). Unknown or expired → 404.
 */
export async function getSharedPortfolio(uuid) {
  const supabase = createAdminClient()
  try {
    const folder = await findSharedFolderByUuid(supabase, uuid)
    if (!folder) throw portfolioError("Share link not found or expired", 404)

    const loadOwner = async () => {
      const { data: owner } = await supabase
        .from("users")
        .select("id, artist_name, studio_name, avatar_file_id")
        .eq("id", folder.user_id)
        .single()

      let avatarUrl = null
      if (owner?.avatar_file_id) {
        const { data: avatarFile } = await supabase
          .from("portfolio_files")
          .select("*")
          .eq("id", owner.avatar_file_id)
          .maybeSingle()
        avatarUrl = fileUrl(avatarFile)
      }
      return { owner, avatarUrl }
    }

    const [{ owner, avatarUrl }, { data: files }] = await Promise.all([
      loadOwner(),
      supabase.from("portfolio_files").select("*").eq("folder_id", folder.id).order("sort_order", { ascending: true }),
    ])

    return {
      folder,
      owner: owner ? { artist_name: owner.artist_name, studio_name: owner.studio_name, avatar_url: avatarUrl } : null,
      unavailable: false,
      subscription_status: "active",
      files: (files ?? []).map(enrichFile),
    }
  } catch (err) {
    if (err?.envelope) throw err
    throw portfolioError(err instanceof Error ? err.message : "Failed to load share", 500)
  }
}
