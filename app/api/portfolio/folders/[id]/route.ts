import { type NextRequest } from "next/server"

import { getArtistSession } from "@/lib/auth/session"
import { deleteFilesBulk, listFilesInFolder } from "@/lib/portfolio/files"
import { deleteFromR2 } from "@/lib/portfolio/files"
import { decrementUsage } from "@/lib/portfolio/quota"
import { portfolioError, portfolioSuccess } from "@/lib/portfolio/response"
import { createClient } from "@/lib/supabase/server"

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = getArtistSession(request)
  if (!session) return portfolioError("Unauthorized", 401)

  const id = Number((await params).id)
  if (Number.isNaN(id)) return portfolioError("Invalid folder ID", 400)

  const body = await request.json()
  const { name, description } = body

  const supabase = await createClient()

  if (name) {
    const { data: duplicate } = await supabase
      .from("portfolio_folders")
      .select("id")
      .eq("user_id", session.id)
      .ilike("name", name.trim())
      .neq("id", id)
      .maybeSingle()

    if (duplicate) return portfolioError("A folder with this name already exists", 400)
  }

  const update: Record<string, unknown> = {}
  if (name) update.name = name.trim()
  if (description !== undefined) update.description = description?.trim() || null

  const { data, error } = await supabase
    .from("portfolio_folders")
    .update(update)
    .eq("id", id)
    .eq("user_id", session.id)
    .select("*")
    .single()

  if (error) return portfolioError(error.message, 400)
  return portfolioSuccess("Folder updated", { folder: data })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = getArtistSession(request)
  if (!session) return portfolioError("Unauthorized", 401)

  const id = Number((await params).id)
  if (Number.isNaN(id)) return portfolioError("Invalid folder ID", 400)

  const supabase = await createClient()

  try {
    const files = await listFilesInFolder(supabase, session.id, id)
    if (files.length) {
      await deleteFromR2(files.map((f) => f.storage_path))
      const totalSize = files.reduce((s, f) => s + f.file_size, 0)
      await supabase.from("portfolio_files").delete().eq("folder_id", id).eq("user_id", session.id)
      await decrementUsage(supabase, session.id, totalSize)
    }

    const { error } = await supabase
      .from("portfolio_folders")
      .delete()
      .eq("id", id)
      .eq("user_id", session.id)

    if (error) return portfolioError(error.message, 400)
    return portfolioSuccess("Folder deleted", { id })
  } catch (err) {
    return portfolioError(err instanceof Error ? err.message : "Delete failed", 500)
  }
}
