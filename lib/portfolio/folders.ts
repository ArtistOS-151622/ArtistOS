import type { SupabaseClient } from "@supabase/supabase-js"
import { randomUUID } from "crypto"

import { STORAGE_DEFAULT_SHARE_EXPIRY_DAYS } from "@/lib/portfolio/config"
import { enrichFile } from "@/lib/portfolio/files"
import type {
  PortfolioFileRow,
  PortfolioFileWithUrl,
  PortfolioFolderRow,
  PortfolioFolderWithStats,
} from "@/lib/portfolio/types"
import { getPublicUrl } from "@/lib/r2/url"

export async function findFolderByName(
  supabase: SupabaseClient,
  userId: number,
  name: string
): Promise<PortfolioFolderRow | null> {
  const { data } = await supabase
    .from("portfolio_folders")
    .select("*")
    .eq("user_id", userId)
    .ilike("name", name)
    .maybeSingle()

  return (data as PortfolioFolderRow) ?? null
}

export async function findFolderByBooking(
  supabase: SupabaseClient,
  userId: number,
  bookingId: number
): Promise<PortfolioFolderRow | null> {
  const { data } = await supabase
    .from("portfolio_folders")
    .select("*")
    .eq("user_id", userId)
    .eq("booking_id", bookingId)
    .maybeSingle()

  return (data as PortfolioFolderRow) ?? null
}

export async function getBookingIndex(
  supabase: SupabaseClient,
  userId: number,
  bookingId: number
): Promise<number> {
  const { count } = await supabase
    .from("bookings")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .lte("id", bookingId)

  return count ?? bookingId
}

export async function findOrCreateBookingFolder(
  supabase: SupabaseClient,
  userId: number,
  bookingId: number
): Promise<PortfolioFolderRow> {
  // These three reads are independent: run them together instead of one after another
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

  if (!booking) {
    throw new Error("Booking not found or access denied")
  }

  const customer = Array.isArray(booking.customer) ? booking.customer[0] : booking.customer
  const customerName = (customer as { customer_name?: string } | null)?.customer_name
  const name = customerName ? `Booking - ${customerName} (#${index})` : `Booking #${index}`

  if (existing) {
    if ((!existing.name.startsWith("Booking - ") || existing.name.startsWith("Booking #")) && customerName) {
      const { data: updated } = await supabase
        .from("portfolio_folders")
        .update({ name })
        .eq("id", existing.id)
        .select("*")
        .single()
      if (updated) return updated as PortfolioFolderRow
    }
    return existing
  }

  const { data, error } = await supabase
    .from("portfolio_folders")
    .insert({
      user_id: userId,
      booking_id: bookingId,
      name,
      created_by: userId,
    })
    .select("*")
    .single()

  if (error) {
    if (error.code === "23505") {
      const retry = await findFolderByBooking(supabase, userId, bookingId)
      if (retry) return retry
    }
    throw new Error(error.message)
  }

  return data as PortfolioFolderRow
}

export async function findFolderByCourse(
  supabase: SupabaseClient,
  userId: number,
  courseId: number
): Promise<PortfolioFolderRow | null> {
  try {
    const { data } = await supabase
      .from("portfolio_folders")
      .select("*")
      .eq("user_id", userId)
      .eq("course_id", courseId)
      .maybeSingle()
    if (data) return data as PortfolioFolderRow
  } catch {
    // Column might not exist yet
  }
  return null
}

export async function findOrCreateCourseFolder(
  supabase: SupabaseClient,
  userId: number,
  courseId: number,
  courseName: string
): Promise<PortfolioFolderRow> {
  const trimmedName = courseName.trim()

  // 1. Try finding by course_id first
  const existingByCourse = await findFolderByCourse(supabase, userId, courseId)
  if (existingByCourse) {
    if (existingByCourse.name !== trimmedName) {
      const { data: updated } = await supabase
        .from("portfolio_folders")
        .update({ name: trimmedName })
        .eq("id", existingByCourse.id)
        .select("*")
        .maybeSingle()
      if (updated) return updated as PortfolioFolderRow
    }
    return existingByCourse
  }

  // 2. Try finding by exact name
  const existingByName = await findFolderByName(supabase, userId, trimmedName)
  if (existingByName) {
    try {
      const { data: updated } = await supabase
        .from("portfolio_folders")
        .update({ course_id: courseId })
        .eq("id", existingByName.id)
        .select("*")
        .maybeSingle()
      if (updated) return updated as PortfolioFolderRow
    } catch {
      // Ignore if course_id column is not in DB yet
    }
    return existingByName
  }

  // 3. Insert new folder with course_id
  const insertPayload: Record<string, any> = {
    user_id: userId,
    name: trimmedName,
    created_by: userId,
  }

  try {
    const { data, error } = await supabase
      .from("portfolio_folders")
      .insert({ ...insertPayload, course_id: courseId })
      .select("*")
      .single()

    if (!error && data) return data as PortfolioFolderRow
    if (error && error.code === "23505") {
      const retry = await findFolderByName(supabase, userId, trimmedName)
      if (retry) return retry
    }
  } catch {
    // Fallback if course_id column not present
  }

  const { data, error } = await supabase
    .from("portfolio_folders")
    .insert(insertPayload)
    .select("*")
    .single()

  if (error) {
    if (error.code === "23505") {
      const retry = await findFolderByName(supabase, userId, trimmedName)
      if (retry) return retry
    }
    throw new Error(error.message)
  }

  return data as PortfolioFolderRow
}

export async function findOrCreateDefaultPortfolioFolder(
  supabase: SupabaseClient,
  userId: number
): Promise<PortfolioFolderRow> {
  const existing = await findFolderByName(supabase, userId, "My Portfolio")
  if (existing) return existing

  const { data, error } = await supabase
    .from("portfolio_folders")
    .insert({
      user_id: userId,
      name: "My Portfolio",
      created_by: userId,
    })
    .select("*")
    .single()

  if (error) {
    if (error.code === "23505") {
      const retry = await findFolderByName(supabase, userId, "My Portfolio")
      if (retry) return retry
    }
    throw new Error(error.message)
  }

  return data as PortfolioFolderRow
}

/** Supabase/PostgREST returns at most 1000 rows per request by default. */
const FILES_PAGE_SIZE = 1000
const PREVIEW_FILE_COUNT = 4

type FolderFileStatsRow = {
  id: number
  folder_id: number | null
  file_size: number | string | null
  section: string | null
  storage_path: string
  mime_type: string
}

/**
 * Loads every portfolio file of the artist (only the columns needed for folder stats),
 * paging past the 1000-row limit. Most artists fit in the first page.
 */
async function fetchAllFileStats(supabase: SupabaseClient, userId: number): Promise<FolderFileStatsRow[]> {
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

  const rows = (first.data ?? []) as FolderFileStatsRow[]
  const total = first.count ?? rows.length
  if (total <= FILES_PAGE_SIZE) return rows

  // Remaining pages are independent: fetch them together
  const pageStarts: number[] = []
  for (let start = FILES_PAGE_SIZE; start < total; start += FILES_PAGE_SIZE) pageStarts.push(start)
  const pages = await Promise.all(pageStarts.map((start) => baseQuery().range(start, start + FILES_PAGE_SIZE - 1)))
  for (const page of pages) {
    if (page.error) throw new Error(page.error.message)
    rows.push(...((page.data ?? []) as FolderFileStatsRow[]))
  }
  return rows
}

/**
 * Legacy booking folders were created before the "Booking - <customer> (#n)" naming.
 * Renames them in one batch. Once renamed, later loads skip this entirely.
 */
async function renameLegacyBookingFolders(
  supabase: SupabaseClient,
  userId: number,
  folders: PortfolioFolderRow[]
): Promise<void> {
  const legacy = folders.filter((f) => f.booking_id !== null && !f.name.startsWith("Booking - "))
  if (legacy.length === 0) return

  const bookingIds = legacy.map((f) => f.booking_id as number)
  const [bookingsRes, indexes] = await Promise.all([
    supabase
      .from("bookings")
      .select("id, customer:customers(customer_name)")
      .eq("user_id", userId)
      .in("id", bookingIds),
    Promise.all(bookingIds.map((bookingId) => getBookingIndex(supabase, userId, bookingId))),
  ])

  const customerByBooking = new Map(
    ((bookingsRes.data ?? []) as { id: number; customer: { customer_name?: string } | { customer_name?: string }[] | null }[])
      .map((b) => {
        const customer = Array.isArray(b.customer) ? b.customer[0] : b.customer
        return [b.id, customer?.customer_name] as const
      })
  )
  const indexByBooking = new Map(bookingIds.map((id, i) => [id, indexes[i]]))

  await Promise.all(
    legacy.map(async (folder) => {
      const customerName = customerByBooking.get(folder.booking_id as number)
      if (!customerName) return
      const newName = `Booking - ${customerName} (#${indexByBooking.get(folder.booking_id as number)})`
      const { error } = await supabase.from("portfolio_folders").update({ name: newName }).eq("id", folder.id)
      if (!error) folder.name = newName
    })
  )
}

export async function listFolders(
  supabase: SupabaseClient,
  userId: number,
  options?: { search?: string; sort?: string }
): Promise<PortfolioFolderWithStats[]> {
  let query = supabase
    .from("portfolio_folders")
    .select("*")
    .eq("user_id", userId)

  if (options?.search) {
    query = query.or(`name.ilike.%${options.search}%,description.ilike.%${options.search}%`)
  }

  const sort = options?.sort ?? "default"
  if (sort === "az") query = query.order("name", { ascending: true })
  else if (sort === "za") query = query.order("name", { ascending: false })
  else if (sort === "latest") query = query.order("created_at", { ascending: false })
  else query = query.order("sort_order", { ascending: true }).order("name", { ascending: true })

  // Folders and the artist's files don't depend on each other: load them together.
  // Stats are then computed in memory instead of 4+ queries per folder.
  const [foldersRes, files] = await Promise.all([query, fetchAllFileStats(supabase, userId)])
  if (foldersRes.error) throw new Error(foldersRes.error.message)

  const statsByFolder = collectFolderStats(files)

  // Skip empty booking folders that have 0 files
  const visibleFolders = ((foldersRes.data ?? []) as PortfolioFolderRow[]).filter(
    (folder) => folder.booking_id === null || (statsByFolder.get(folder.id)?.count ?? 0) > 0
  )

  await renameLegacyBookingFolders(supabase, userId, visibleFolders)

  return visibleFolders.map((folder) => withFolderStats(folder, statsByFolder.get(folder.id)))
}

type FolderStats = { count: number; size: number; sections: Set<string>; previews: FolderFileStatsRow[] }

/** Groups files by folder: count, total size, sections and the first preview files. */
function collectFolderStats(files: FolderFileStatsRow[]): Map<number, FolderStats> {
  const statsByFolder = new Map<number, FolderStats>()
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
    // files are ordered by sort_order, so the first ones seen are the previews
    if (stats.previews.length < PREVIEW_FILE_COUNT) stats.previews.push(file)
  }
  return statsByFolder
}

function withFolderStats(folder: PortfolioFolderRow, stats: FolderStats | undefined): PortfolioFolderWithStats {
  let folderType: "course" | "reference" | "portfolio" = "portfolio"
  if (folder.course_id !== null && folder.course_id !== undefined) {
    folderType = "course"
  } else if (folder.booking_id !== null && folder.booking_id !== undefined) {
    folderType = "reference"
  } else if (stats?.sections.has("course")) {
    folderType = "course"
  } else if (stats?.sections.has("reference")) {
    folderType = "reference"
  }

  return {
    ...folder,
    file_count: stats?.count ?? 0,
    total_size: stats?.size ?? 0,
    preview_files: (stats?.previews ?? []).map((f) => ({
      id: f.id,
      public_url: getPublicUrl(f.storage_path),
      mime_type: f.mime_type,
    })),
    folder_type: folderType,
    share_url: folder.is_shared ? buildShareUrl(folder.uuid) : null,
  }
}

/**
 * One folder (same shape as listFolders) plus its files, in a single query:
 * files are embedded through the portfolio_files.folder_id foreign key.
 * Returns null when the folder doesn't exist or belongs to another artist.
 * Unlike listFolders, an empty booking folder is still returned, so deleting
 * its last file leaves the page on an empty folder instead of "not found".
 */
export async function getFolderWithFiles(
  supabase: SupabaseClient,
  userId: number,
  uuid: string
): Promise<{ folder: PortfolioFolderWithStats; files: PortfolioFileWithUrl[] } | null> {
  const { data, error } = await supabase
    .from("portfolio_folders")
    .select("*, portfolio_files(*)")
    .eq("user_id", userId)
    .eq("uuid", uuid)
    // Same ownership rule as listFilesInFolder: only this artist's files.
    .eq("portfolio_files.user_id", userId)
    .order("sort_order", { referencedTable: "portfolio_files", ascending: true })
    .order("created_at", { referencedTable: "portfolio_files", ascending: true })
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) return null

  const { portfolio_files: fileRows, ...folderRow } = data as PortfolioFolderRow & {
    portfolio_files: PortfolioFileRow[] | null
  }
  const rows = fileRows ?? []
  const folder = folderRow as PortfolioFolderRow

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

export function buildShareUrl(uuid: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  return `${base.replace(/\/$/, "")}/portfolio/shared/${uuid}`
}

export async function toggleShare(
  supabase: SupabaseClient,
  userId: number,
  folderId: number,
  enable: boolean,
  expiresAt?: string | null
): Promise<PortfolioFolderRow> {
  const update: Record<string, unknown> = {}

  if (enable) {
    const expiry = expiresAt
      ? new Date(expiresAt)
      : new Date(Date.now() + STORAGE_DEFAULT_SHARE_EXPIRY_DAYS * 86400000)

    update.is_shared = true
    update.shared_expires_at = expiry.toISOString()
  } else {
    update.is_shared = false
    update.shared_expires_at = null
  }

  const { data, error } = await supabase
    .from("portfolio_folders")
    .update(update)
    .eq("id", folderId)
    .eq("user_id", userId)
    .select("*")
    .single()

  if (error) throw new Error(error.message)
  return data as PortfolioFolderRow
}

export async function findSharedFolderByUuid(
  supabase: SupabaseClient,
  uuid: string
): Promise<PortfolioFolderRow | null> {
  const { data } = await supabase
    .from("portfolio_folders")
    .select("*")
    .eq("uuid", uuid)
    .eq("is_shared", true)
    .maybeSingle()

  if (!data) return null

  const folder = data as PortfolioFolderRow
  if (folder.shared_expires_at && new Date(folder.shared_expires_at) < new Date()) {
    return null
  }

  return folder
}

export async function expireShares(supabase: SupabaseClient): Promise<number> {
  const now = new Date().toISOString()

  const { data: expired } = await supabase
    .from("portfolio_folders")
    .select("id")
    .eq("is_shared", true)
    .not("shared_expires_at", "is", null)
    .lt("shared_expires_at", now)

  if (!expired?.length) return 0

  for (const row of expired) {
    await supabase
      .from("portfolio_folders")
      .update({
        is_shared: false,
        shared_expires_at: null,
        uuid: randomUUID(),
      })
      .eq("id", row.id)
  }

  return expired.length
}

export function enrichFolderWithShareUrl(folder: PortfolioFolderRow): PortfolioFolderWithStats {
  return {
    ...folder,
    share_url: folder.is_shared ? buildShareUrl(folder.uuid) : null,
  }
}

export { getPublicUrl }
