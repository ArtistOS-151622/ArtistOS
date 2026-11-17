import { createDbClient } from "#src/integrations/supabase.js"
import { deleteFromR2, listFilesInFolder } from "#src/shared/portfolio/files.js"
import { buildShareUrl, getFolderWithFiles, listFolders, toggleShare } from "#src/shared/portfolio/folders.js"
import { decrementUsage } from "#src/shared/portfolio/quota.js"
import { portfolioError } from "#src/shared/portfolio/response.js"
import { checkIsReadOnly } from "#src/shared/subscription/read-only.js"

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const trimmed = (value) => (typeof value === "string" ? value.trim() : "")

async function assertWritable(supabase, userId, message) {
  if (await checkIsReadOnly(supabase, userId)) throw portfolioError(message, 403)
}

/** Unexpected failures keep their message (500), as the Next.js routes did. */
async function orFail(fallback, work) {
  try {
    return await work()
  } catch (err) {
    if (err?.envelope) throw err
    throw portfolioError(err instanceof Error ? err.message : fallback, 500)
  }
}

/**
 * GET /api/portfolio/folders, one of three shapes:
 *   ?uuid=…      → one folder with stats and files ("Folder loaded")
 *   ?folder_id=… → that folder's files, optionally one ?section ("Files loaded")
 *   otherwise    → folder list (?search, ?sort) ("Folders loaded")
 * → [message, data]
 */
export async function getFolders(userId, { uuid, folderId, section, search, sort }) {
  const supabase = createDbClient()
  return orFail("Failed to load", async () => {
    if (uuid) {
      // The column is a Postgres uuid: a malformed value would be a 500, not a 404.
      if (!UUID_PATTERN.test(uuid)) throw portfolioError("Folder not found", 404)
      const result = await getFolderWithFiles(supabase, userId, uuid)
      if (!result) throw portfolioError("Folder not found", 404)
      return ["Folder loaded", result]
    }
    if (folderId) {
      return ["Files loaded", { files: await listFilesInFolder(supabase, userId, Number(folderId), section, true) }]
    }
    return ["Folders loaded", { folders: await listFolders(supabase, userId, { search, sort }) }]
  })
}

export async function createFolder(userId, { name, description, booking_id }) {
  const folderName = trimmed(name)
  if (!folderName) throw portfolioError("Folder name is required", 400)

  const supabase = createDbClient()
  await assertWritable(supabase, userId, "Your subscription has expired. Please upgrade to create portfolio folders.")

  const { data: existing } = await supabase
    .from("portfolio_folders")
    .select("id")
    .eq("user_id", userId)
    .ilike("name", folderName)
    .maybeSingle()
  if (existing) throw portfolioError("A folder with this name already exists", 400)

  if (booking_id) {
    const { data: bookingFolder } = await supabase
      .from("portfolio_folders")
      .select("id")
      .eq("user_id", userId)
      .eq("booking_id", booking_id)
      .maybeSingle()
    if (bookingFolder) throw portfolioError("A folder already exists for this booking", 400)
  }

  const { data, error } = await supabase
    .from("portfolio_folders")
    .insert({
      user_id: userId,
      name: folderName,
      description: trimmed(description) || null,
      booking_id: booking_id ?? null,
      created_by: userId,
    })
    .select("*")
    .single()
  if (error) throw portfolioError(error.message, 400)
  return { folder: data }
}

export async function updateFolder(userId, id, { name, description }) {
  const supabase = createDbClient()
  await assertWritable(supabase, userId, "Your subscription has expired. Please upgrade to update portfolio folders.")

  if (name) {
    const { data: duplicate } = await supabase
      .from("portfolio_folders")
      .select("id")
      .eq("user_id", userId)
      .ilike("name", trimmed(name))
      .neq("id", id)
      .maybeSingle()
    if (duplicate) throw portfolioError("A folder with this name already exists", 400)
  }

  const update = {}
  if (name) update.name = trimmed(name)
  if (description !== undefined) update.description = trimmed(description) || null

  const { data, error } = await supabase
    .from("portfolio_folders")
    .update(update)
    .eq("id", id)
    .eq("user_id", userId)
    .select("*")
    .single()
  if (error) throw portfolioError(error.message, 400)
  return { folder: data }
}

/** Deletes the folder and its files (R2 objects, rows, storage usage). */
export async function deleteFolder(userId, id) {
  const supabase = createDbClient()
  await assertWritable(supabase, userId, "Your subscription has expired. Please upgrade to delete portfolio folders.")

  return orFail("Delete failed", async () => {
    const files = await listFilesInFolder(supabase, userId, id)
    if (files.length) {
      await deleteFromR2(files.map((f) => f.storage_path))
      const totalSize = files.reduce((sum, f) => sum + Number(f.file_size), 0)
      await supabase.from("portfolio_files").delete().eq("folder_id", id).eq("user_id", userId)
      await decrementUsage(supabase, userId, totalSize)
    }

    const { error } = await supabase.from("portfolio_folders").delete().eq("id", id).eq("user_id", userId)
    if (error) throw portfolioError(error.message, 400)
    return { id }
  })
}

export async function setSharing(userId, id, { is_shared, share_expires_at }) {
  if (typeof is_shared !== "boolean") throw portfolioError("is_shared is required", 400)

  const supabase = createDbClient()
  await assertWritable(supabase, userId, "Your subscription has expired. Please upgrade to update sharing.")

  return orFail("Share toggle failed", async () => {
    const folder = await toggleShare(supabase, userId, id, is_shared, share_expires_at)
    return [
      is_shared ? "Sharing enabled" : "Sharing disabled",
      { folder, share_url: folder.is_shared ? buildShareUrl(folder.uuid) : null },
    ]
  })
}
