import { randomUUID } from "node:crypto"

import { config } from "#src/config/env.js"
import { getPublicUrl } from "#src/integrations/r2/url.js"
import { DEFAULT_PORTFOLIO_FOLDER_NAME, STORAGE_DEFAULT_SHARE_EXPIRY_DAYS } from "#src/shared/portfolio/config.js"
import { enrichFile } from "#src/shared/portfolio/files.js"

/*
 * portfolio_folders row: { id, uuid, user_id, booking_id, course_id?, name, description,
 *   is_shared, shared_expires_at, created_by, sort_order, created_at, updated_at }
 * Listed folders also carry: file_count, total_size, share_url, preview_files
 *   ([{ id, public_url, mime_type }]) and folder_type ("course" | "reference" | "portfolio").
 */

const FOLDERS_TABLE = "portfolio_folders"
const UNIQUE_VIOLATION = "23505"
const DAY_MS = 86_400_000
/** PostgREST returns at most 1000 rows per request by default. */
const FILES_PAGE_SIZE = 1000
const PREVIEW_FILE_COUNT = 4

const firstOf = (value) => (Array.isArray(value) ? value[0] : value)

async function findFolderByName(supabase, userId, name) {
  const { data } = await supabase.from(FOLDERS_TABLE).select("*").eq("user_id", userId).ilike("name", name).maybeSingle()
  return data ?? null
}

export async function findFolderByBooking(supabase, userId, bookingId) {
  const { data } = await supabase
    .from(FOLDERS_TABLE)
    .select("*")
    .eq("user_id", userId)
    .eq("booking_id", bookingId)
    .maybeSingle()
  return data ?? null
}

/** 1-based position of the booking among the artist's bookings (used in folder names). */
async function getBookingIndex(supabase, userId, bookingId) {
  const { count } = await supabase
    .from("bookings")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .lte("id", bookingId)
  return count ?? bookingId
}

const bookingFolderName = (customerName, index) =>
  customerName ? `Booking - ${customerName} (#${index})` : `Booking #${index}`

/** The booking's reference folder, named "Booking - <customer> (#n)"; created or renamed as needed. */
export async function findOrCreateBookingFolder(supabase, userId, bookingId) {
  const [{ data: booking }, index, existing] = await Promise.all([
    supabase
      .from("bookings")
      .select("id, customer:customers(customer_name)")
      .eq("id", bookingId)
      .eq("user_id", userId)
      .maybeSingle(),
    getBookingIndex(supabase, userId, bookingId),
    findFolderByBooking(supabase, userId, bookingId),
  ])

  if (!booking) throw new Error("Booking not found or access denied")

  const customerName = firstOf(booking.customer)?.customer_name
  const name = bookingFolderName(customerName, index)

  if (existing) {
    if ((!existing.name.startsWith("Booking - ") || existing.name.startsWith("Booking #")) && customerName) {
      const { data: updated } = await supabase.from(FOLDERS_TABLE).update({ name }).eq("id", existing.id).select("*").single()
      if (updated) return updated
    }
    return existing
  }

  const { data, error } = await supabase
    .from(FOLDERS_TABLE)
    .insert({ user_id: userId, booking_id: bookingId, name, created_by: userId })
    .select("*")
    .single()

  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      const retry = await findFolderByBooking(supabase, userId, bookingId)
      if (retry) return retry
    }
    throw new Error(error.message)
  }
  return data
}

export async function findFolderByCourse(supabase, userId, courseId) {
  try {
    const { data } = await supabase
      .from(FOLDERS_TABLE)
      .select("*")
      .eq("user_id", userId)
      .eq("course_id", courseId)
      .maybeSingle()
    if (data) return data
  } catch {
    // course_id may not exist on older databases.
  }
  return null
}

/**
 * The course's folder: found by course_id (renamed to match the course), else by
 * name (then linked), else created. Tolerates databases without course_id.
 */
export async function findOrCreateCourseFolder(supabase, userId, courseId, courseName) {
  const trimmedName = courseName.trim()

  const existingByCourse = await findFolderByCourse(supabase, userId, courseId)
  if (existingByCourse) {
    if (existingByCourse.name !== trimmedName) {
      const { data: updated } = await supabase
        .from(FOLDERS_TABLE)
        .update({ name: trimmedName })
        .eq("id", existingByCourse.id)
        .select("*")
        .maybeSingle()
      if (updated) return updated
    }
    return existingByCourse
  }

  const existingByName = await findFolderByName(supabase, userId, trimmedName)
  if (existingByName) {
    try {
      const { data: updated } = await supabase
        .from(FOLDERS_TABLE)
        .update({ course_id: courseId })
        .eq("id", existingByName.id)
        .select("*")
        .maybeSingle()
      if (updated) return updated
    } catch {
      // course_id may not exist on older databases.
    }
    return existingByName
  }

  const insertPayload = { user_id: userId, name: trimmedName, created_by: userId }

  try {
    const { data, error } = await supabase
      .from(FOLDERS_TABLE)
      .insert({ ...insertPayload, course_id: courseId })
      .select("*")
      .single()

    if (!error && data) return data
    if (error?.code === UNIQUE_VIOLATION) {
      const retry = await findFolderByName(supabase, userId, trimmedName)
      if (retry) return retry
    }
  } catch {
    // Fall back to inserting without course_id.
  }

  const { data, error } = await supabase.from(FOLDERS_TABLE).insert(insertPayload).select("*").single()
  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      const retry = await findFolderByName(supabase, userId, trimmedName)
      if (retry) return retry
    }
    throw new Error(error.message)
  }
  return data
}

export async function findOrCreateDefaultPortfolioFolder(supabase, userId) {
  const existing = await findFolderByName(supabase, userId, DEFAULT_PORTFOLIO_FOLDER_NAME)
  if (existing) return existing

  const { data, error } = await supabase
    .from(FOLDERS_TABLE)
    .insert({ user_id: userId, name: DEFAULT_PORTFOLIO_FOLDER_NAME, created_by: userId })
    .select("*")
    .single()

  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      const retry = await findFolderByName(supabase, userId, DEFAULT_PORTFOLIO_FOLDER_NAME)
      if (retry) return retry
    }
    throw new Error(error.message)
  }
  return data
}

/** Every file of the artist (only stats columns), paging past the 1000-row limit. */
async function fetchAllFileStats(supabase, userId) {
  const columns = "id, folder_id, file_size, section, storage_path, mime_type"
  const baseQuery = () =>
    supabase
      .from("portfolio_files")
      .select(columns, { count: "exact" })
      .eq("user_id", userId)
      .order("sort_order", { ascending: true })
      .order("id", { ascending: true })

  const first = await baseQuery().range(0, FILES_PAGE_SIZE - 1)
  if (first.error) throw new Error(first.error.message)

  const rows = first.data ?? []
  const total = first.count ?? rows.length
  if (total <= FILES_PAGE_SIZE) return rows

  const pageStarts = []
  for (let start = FILES_PAGE_SIZE; start < total; start += FILES_PAGE_SIZE) pageStarts.push(start)
  const pages = await Promise.all(pageStarts.map((start) => baseQuery().range(start, start + FILES_PAGE_SIZE - 1)))
  for (const page of pages) {
    if (page.error) throw new Error(page.error.message)
    rows.push(...(page.data ?? []))
  }
  return rows
}

/** Renames booking folders created before the "Booking - <customer> (#n)" naming, in one batch. */
async function renameLegacyBookingFolders(supabase, userId, folders) {
  const legacy = folders.filter((f) => f.booking_id !== null && !f.name.startsWith("Booking - "))
  if (legacy.length === 0) return

  const bookingIds = legacy.map((f) => f.booking_id)
  const [bookingsRes, indexes] = await Promise.all([
    supabase.from("bookings").select("id, customer:customers(customer_name)").eq("user_id", userId).in("id", bookingIds),
    Promise.all(bookingIds.map((bookingId) => getBookingIndex(supabase, userId, bookingId))),
  ])

  const customerByBooking = new Map((bookingsRes.data ?? []).map((b) => [b.id, firstOf(b.customer)?.customer_name]))
  const indexByBooking = new Map(bookingIds.map((id, i) => [id, indexes[i]]))

  await Promise.all(
    legacy.map(async (folder) => {
      const customerName = customerByBooking.get(folder.booking_id)
      if (!customerName) return
      const newName = bookingFolderName(customerName, indexByBooking.get(folder.booking_id))
      const { error } = await supabase.from(FOLDERS_TABLE).update({ name: newName }).eq("id", folder.id)
      if (!error) folder.name = newName
    })
  )
}

/** folder_id → { count, size, sections, previews } (previews: first files by sort order). */
function collectFolderStats(files) {
  const statsByFolder = new Map()
  for (const file of files) {
    if (file.folder_id === null) continue
    let stats = statsByFolder.get(file.folder_id)
    if (!stats) {
      stats = { count: 0, size: 0, sections: new Set(), previews: [] }
      statsByFolder.set(file.folder_id, stats)
    }
    stats.count += 1
    stats.size += Number(file.file_size) || 0
    if (file.section) stats.sections.add(file.section)
    if (stats.previews.length < PREVIEW_FILE_COUNT) stats.previews.push(file)
  }
  return statsByFolder
}

function folderTypeOf(folder, stats) {
  if (folder.course_id !== null && folder.course_id !== undefined) return "course"
  if (folder.booking_id !== null && folder.booking_id !== undefined) return "reference"
  if (stats?.sections.has("course")) return "course"
  if (stats?.sections.has("reference")) return "reference"
  return "portfolio"
}

function withFolderStats(folder, stats) {
  return {
    ...folder,
    file_count: stats?.count ?? 0,
    total_size: stats?.size ?? 0,
    preview_files: (stats?.previews ?? []).map((f) => ({
      id: f.id,
      public_url: getPublicUrl(f.storage_path),
      mime_type: f.mime_type,
    })),
    folder_type: folderTypeOf(folder, stats),
    share_url: folder.is_shared ? buildShareUrl(folder.uuid) : null,
  }
}

/**
 * The artist's folders with stats. options: { search?, sort?: "az" | "za" | "latest" | "default" }.
 * Empty booking folders are hidden.
 */
export async function listFolders(supabase, userId, options) {
  let query = supabase.from(FOLDERS_TABLE).select("*").eq("user_id", userId)

  if (options?.search) {
    query = query.or(`name.ilike.%${options.search}%,description.ilike.%${options.search}%`)
  }

  const sort = options?.sort ?? "default"
  if (sort === "az") query = query.order("name", { ascending: true })
  else if (sort === "za") query = query.order("name", { ascending: false })
  else if (sort === "latest") query = query.order("created_at", { ascending: false })
  else query = query.order("sort_order", { ascending: true }).order("name", { ascending: true })

  const [foldersRes, files] = await Promise.all([query, fetchAllFileStats(supabase, userId)])
  if (foldersRes.error) throw new Error(foldersRes.error.message)

  const statsByFolder = collectFolderStats(files)
  const visibleFolders = (foldersRes.data ?? []).filter(
    (folder) => folder.booking_id === null || (statsByFolder.get(folder.id)?.count ?? 0) > 0
  )

  await renameLegacyBookingFolders(supabase, userId, visibleFolders)
  return visibleFolders.map((folder) => withFolderStats(folder, statsByFolder.get(folder.id)))
}

/**
 * One folder (same shape as listFolders) plus its files, in a single query.
 * Returns null when missing or not the artist's. Empty booking folders are returned.
 */
export async function getFolderWithFiles(supabase, userId, uuid) {
  const { data, error } = await supabase
    .from(FOLDERS_TABLE)
    .select("*, portfolio_files(*)")
    .eq("user_id", userId)
    .eq("uuid", uuid)
    .eq("portfolio_files.user_id", userId)
    .order("sort_order", { referencedTable: "portfolio_files", ascending: true })
    .order("created_at", { referencedTable: "portfolio_files", ascending: true })
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) return null

  const { portfolio_files: fileRows, ...folder } = data
  const rows = fileRows ?? []

  await renameLegacyBookingFolders(supabase, userId, [folder])

  const stats = collectFolderStats(
    rows.map((f) => ({
      id: f.id,
      folder_id: f.folder_id,
      file_size: f.file_size,
      section: f.section,
      storage_path: f.storage_path,
      mime_type: f.mime_type,
    }))
  ).get(folder.id)

  return { folder: withFolderStats(folder, stats), files: rows.map(enrichFile) }
}

export function buildShareUrl(uuid) {
  return `${config.appUrl}/portfolio/shared/${uuid}`
}

/** Enables (with expiry, default STORAGE_DEFAULT_SHARE_EXPIRY_DAYS) or disables sharing. */
export async function toggleShare(supabase, userId, folderId, enable, expiresAt) {
  const update = enable
    ? {
        is_shared: true,
        shared_expires_at: (expiresAt
          ? new Date(expiresAt)
          : new Date(Date.now() + STORAGE_DEFAULT_SHARE_EXPIRY_DAYS * DAY_MS)
        ).toISOString(),
      }
    : { is_shared: false, shared_expires_at: null }

  const { data, error } = await supabase
    .from(FOLDERS_TABLE)
    .update(update)
    .eq("id", folderId)
    .eq("user_id", userId)
    .select("*")
    .single()

  if (error) throw new Error(error.message)
  return data
}

/** A shared, unexpired folder by its public uuid, or null. */
export async function findSharedFolderByUuid(supabase, uuid) {
  const { data } = await supabase.from(FOLDERS_TABLE).select("*").eq("uuid", uuid).eq("is_shared", true).maybeSingle()
  if (!data) return null
  if (data.shared_expires_at && new Date(data.shared_expires_at) < new Date()) return null
  return data
}

/** Cron: un-shares expired folders and rotates their uuid so old links die. Returns the count. */
export async function expireShares(supabase) {
  const { data: expired } = await supabase
    .from(FOLDERS_TABLE)
    .select("id")
    .eq("is_shared", true)
    .not("shared_expires_at", "is", null)
    .lt("shared_expires_at", new Date().toISOString())

  if (!expired?.length) return 0

  for (const row of expired) {
    await supabase
      .from(FOLDERS_TABLE)
      .update({ is_shared: false, shared_expires_at: null, uuid: randomUUID() })
      .eq("id", row.id)
  }
  return expired.length
}

export { getPublicUrl }
