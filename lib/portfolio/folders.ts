import type { SupabaseClient } from "@supabase/supabase-js"
import { randomUUID } from "crypto"

import { STORAGE_DEFAULT_SHARE_EXPIRY_DAYS } from "@/lib/portfolio/config"
import type { PortfolioFolderRow, PortfolioFolderWithStats } from "@/lib/portfolio/types"
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
  const existing = await findFolderByBooking(supabase, userId, bookingId)
  if (existing) return existing

  const index = await getBookingIndex(supabase, userId, bookingId)
  const name = `Booking #${index}`

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

  const { data: folders, error } = await query
  if (error) throw new Error(error.message)

  const result: PortfolioFolderWithStats[] = []

  for (const folder of (folders ?? []) as PortfolioFolderRow[]) {
    const { count } = await supabase
      .from("portfolio_files")
      .select("*", { count: "exact", head: true })
      .eq("folder_id", folder.id)

    const { data: sizeData } = await supabase
      .from("portfolio_files")
      .select("file_size")
      .eq("folder_id", folder.id)

    const totalSize = (sizeData ?? []).reduce(
      (sum, f) => sum + Number((f as { file_size: number }).file_size),
      0
    )

    const fileCount = count ?? 0
    
    // Skip booking folders that have no files uploaded yet
    if (folder.booking_id !== null && fileCount === 0) {
      continue
    }

    // Fetch up to 4 preview files for folder icon 2x2 grid preview
    const { data: previewData } = await supabase
      .from("portfolio_files")
      .select("id, storage_path, mime_type")
      .eq("folder_id", folder.id)
      .order("sort_order", { ascending: true })
      .limit(4)

    const preview_files = (previewData ?? []).map((f) => ({
      id: f.id as number,
      public_url: getPublicUrl(f.storage_path as string),
      mime_type: f.mime_type as string,
    }))

    result.push({
      ...folder,
      file_count: fileCount,
      total_size: totalSize,
      preview_files,
      share_url: folder.is_shared
        ? buildShareUrl(folder.uuid)
        : null,
    })
  }

  return result
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
    update.uuid = randomUUID()
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

export async function updateFolderSortOrder(
  supabase: SupabaseClient,
  userId: number,
  orderedIds: number[]
): Promise<void> {
  for (let i = 0; i < orderedIds.length; i++) {
    await supabase
      .from("portfolio_folders")
      .update({ sort_order: i })
      .eq("id", orderedIds[i])
      .eq("user_id", userId)
  }
}

export function enrichFolderWithShareUrl(folder: PortfolioFolderRow): PortfolioFolderWithStats {
  return {
    ...folder,
    share_url: folder.is_shared ? buildShareUrl(folder.uuid) : null,
  }
}

export { getPublicUrl }
