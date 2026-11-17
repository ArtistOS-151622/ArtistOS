import { createDbClient } from "#src/integrations/supabase.js"
import { listFilesInFolder } from "#src/shared/portfolio/files.js"
import { buildShareUrl, findFolderByBooking, findOrCreateBookingFolder } from "#src/shared/portfolio/folders.js"
import { portfolioError } from "#src/shared/portfolio/response.js"
import { checkIsReadOnly } from "#src/shared/subscription/read-only.js"

async function bookingExists(supabase, userId, bookingId) {
  const { data, error } = await supabase
    .from("bookings")
    .select("id")
    .eq("id", bookingId)
    .eq("user_id", userId)
    .maybeSingle()
  return !error && Boolean(data)
}

/**
 * The booking's reference folder and files, split into reference/delivery sections.
 * Read-only artists only see an existing folder; others get one created.
 */
export async function getBookingPortfolio(userId, bookingId) {
  const supabase = createDbClient()
  if (!(await bookingExists(supabase, userId, bookingId))) throw portfolioError("Booking not found", 404)

  try {
    const folder = (await checkIsReadOnly(supabase, userId))
      ? await findFolderByBooking(supabase, userId, bookingId)
      : await findOrCreateBookingFolder(supabase, userId, bookingId)

    if (!folder) return { folder: null, reference_files: [], delivery_files: [], files: [] }

    const files = await listFilesInFolder(supabase, userId, folder.id, null, true)
    return {
      folder: {
        ...folder,
        share_url: folder.is_shared ? buildShareUrl(folder.uuid) : null,
        file_count: files.length,
        total_size: files.reduce((sum, f) => sum + Number(f.file_size), 0),
      },
      reference_files: files.filter((f) => f.section === "reference"),
      delivery_files: files.filter((f) => f.section === "delivery"),
      files,
    }
  } catch (err) {
    throw portfolioError(err instanceof Error ? err.message : "Failed to load portfolio", 500)
  }
}

/** Ensures the booking's folder exists. → { folder } */
export async function createBookingFolder(userId, bookingId) {
  const supabase = createDbClient()
  if (await checkIsReadOnly(supabase, userId)) {
    throw portfolioError("Your subscription has expired. Please upgrade to create booking folders.", 403)
  }
  const { data: booking } = await supabase
    .from("bookings")
    .select("id")
    .eq("id", bookingId)
    .eq("user_id", userId)
    .maybeSingle()
  if (!booking) throw portfolioError("Booking not found", 404)

  try {
    return { folder: await findOrCreateBookingFolder(supabase, userId, bookingId) }
  } catch (err) {
    throw portfolioError(err instanceof Error ? err.message : "Failed to create folder", 500)
  }
}
