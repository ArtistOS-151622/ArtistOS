import { type NextRequest } from "next/server"

import { checkIsReadOnly } from "@/lib/auth/subscription"
import { getArtistSession } from "@/lib/auth/session"
import { confirmFileUpload } from "@/lib/portfolio/files"
import { portfolioError, portfolioSuccess } from "@/lib/portfolio/response"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  const session = getArtistSession(request)
  if (!session) return portfolioError("Unauthorized", 401)

  const body = await request.json()
  const {
    folder_id,
    storage_path,
    original_name,
    mime_type,
    extension,
    file_size,
    section,
    set_as_avatar,
  } = body

  if (!folder_id || !storage_path || !original_name || !mime_type || !file_size) {
    return portfolioError("Missing required upload fields", 400)
  }

  const supabase = await createClient()

  if (await checkIsReadOnly(supabase, session.id)) {
    return portfolioError("Your subscription has expired. Please upgrade to upload files.", 403)
  }

  try {
    const file = await confirmFileUpload(supabase, {
      userId: session.id,
      folderId: Number(folder_id),
      storagePath: storage_path,
      originalName: original_name,
      mimeType: mime_type,
      extension: extension ?? "bin",
      fileSize: Number(file_size),
      section: section ?? null,
    })

    if (set_as_avatar) {
      await supabase
        .from("users")
        .update({ avatar_file_id: file.id })
        .eq("id", session.id)
    }

    return portfolioSuccess("File uploaded", { file }, 201)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Confirm failed"
    const status = message.includes("quota") || message.includes("expired") ? 402 : 500
    return portfolioError(message, status)
  }
}
