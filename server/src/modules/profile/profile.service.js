import { createDbClient } from "#src/integrations/supabase.js"
import { getFileUrlsById } from "#src/shared/portfolio/files.js"
import { getOrCreateQuota, QuotaService } from "#src/shared/portfolio/quota.js"
import { badRequest, notFound } from "#src/utils/api-error.js"
import { createArtistToken } from "#src/utils/session-token.js"

const PROFILE_COLUMNS = "id, phone, artist_name, studio_name, email, address, google_maps_url"

/** → { profile: { ...user, avatar_url, studio_logo_url }, storage: quotaInfo } */
export async function getProfile(userId) {
  const supabase = createDbClient()

  // Independent: load together. A quota failure is only raised after the user
  // checks, so a missing user is still a 404 and a user query error a 400.
  const [{ data: user, error }, quota] = await Promise.all([
    supabase
      .from("users")
      .select(`${PROFILE_COLUMNS}, avatar_file_id, studio_logo_file_id`)
      .eq("id", userId)
      .maybeSingle(),
    getOrCreateQuota(supabase, userId).then(
      (row) => ({ row, error: null }),
      (quotaError) => ({ row: null, error: quotaError })
    ),
  ])

  if (error) throw badRequest(error.message)
  if (!user) throw notFound("User not found")
  if (quota.error || !quota.row) throw quota.error ?? new Error("Failed to load storage quota")

  const urls = await getFileUrlsById(supabase, [user.avatar_file_id, user.studio_logo_file_id])

  return {
    profile: {
      ...user,
      avatar_url: (user.avatar_file_id && urls.get(user.avatar_file_id)) ?? null,
      studio_logo_url: (user.studio_logo_file_id && urls.get(user.studio_logo_file_id)) ?? null,
    },
    storage: QuotaService.fromRow(quota.row).getQuotaInfo(),
  }
}

/**
 * Updates the editable profile fields and re-issues the session token, so the
 * topbar's artist/studio name updates immediately. → { token, body }
 */
export async function updateProfile(userId, { artist_name, studio_name, email, address, google_maps_url }) {
  const { data, error } = await createDbClient()
    .from("users")
    .update({ artist_name, studio_name, email, address, google_maps_url })
    .eq("id", userId)
    .select(PROFILE_COLUMNS)
    .maybeSingle()

  if (error) throw badRequest(error.message)
  if (!data) throw notFound("User not found or update failed")

  const token = createArtistToken({
    id: data.id,
    phone: data.phone,
    artist_name: data.artist_name,
    studio_name: data.studio_name,
  })
  return { token, body: { success: true, profile: data, token } }
}
