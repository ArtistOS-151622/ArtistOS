import { type NextRequest } from "next/server"

import { checkIsReadOnly } from "@/lib/auth/subscription"
import { getArtistSession } from "@/lib/auth/session"
import { listFolders } from "@/lib/portfolio/folders"
import { listFilesInFolder } from "@/lib/portfolio/files"
import { portfolioError, portfolioSuccess } from "@/lib/portfolio/response"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  const session = getArtistSession(request)
  if (!session) return portfolioError("Unauthorized", 401)

  const { searchParams } = new URL(request.url)
  const folderId = searchParams.get("folder_id")
  const search = searchParams.get("search") ?? undefined
  const sort = searchParams.get("sort") ?? undefined
  const section = searchParams.get("section")

  const supabase = await createClient()

  try {
    if (folderId) {
      const files = await listFilesInFolder(
        supabase,
        session.id,
        Number(folderId),
        section
      )
      return portfolioSuccess("Files loaded", { files })
    }

    const folders = await listFolders(supabase, session.id, { search, sort })
    return portfolioSuccess("Folders loaded", { folders })
  } catch (err) {
    return portfolioError(err instanceof Error ? err.message : "Failed to load", 500)
  }
}

export async function POST(request: NextRequest) {
  const session = getArtistSession(request)
  if (!session) return portfolioError("Unauthorized", 401)

  const body = await request.json()
  const { name, description, booking_id } = body

  if (!name?.trim()) return portfolioError("Folder name is required", 400)

  const supabase = await createClient()

  if (await checkIsReadOnly(supabase, session.id)) {
    return portfolioError("Your subscription has expired. Please upgrade to create portfolio folders.", 403)
  }

  const { data: existing } = await supabase
    .from("portfolio_folders")
    .select("id")
    .eq("user_id", session.id)
    .ilike("name", name.trim())
    .maybeSingle()

  if (existing) return portfolioError("A folder with this name already exists", 400)

  if (booking_id) {
    const { data: bookingFolder } = await supabase
      .from("portfolio_folders")
      .select("id")
      .eq("user_id", session.id)
      .eq("booking_id", booking_id)
      .maybeSingle()

    if (bookingFolder) {
      return portfolioError("A folder already exists for this booking", 400)
    }
  }

  const { data, error } = await supabase
    .from("portfolio_folders")
    .insert({
      user_id: session.id,
      name: name.trim(),
      description: description?.trim() || null,
      booking_id: booking_id ?? null,
      created_by: session.id,
    })
    .select("*")
    .single()

  if (error) return portfolioError(error.message, 400)
  return portfolioSuccess("Folder created", { folder: data }, 201)
}
