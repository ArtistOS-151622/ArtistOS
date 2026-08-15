import { type NextRequest } from "next/server"

import { checkIsReadOnly } from "@/lib/auth/subscription"
import { getArtistSession } from "@/lib/auth/session"
import {
  findOrCreateBookingFolder,
  findOrCreateDefaultPortfolioFolder,
} from "@/lib/portfolio/folders"
import {
  createPresignedUploadUrl,
  prepareUploadKey,
  validateUpload,
} from "@/lib/portfolio/files"
import { getOrCreateQuota as fetchQuota, QuotaService } from "@/lib/portfolio/quota"
import { portfolioError, portfolioSuccess } from "@/lib/portfolio/response"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  const session = getArtistSession(request)
  if (!session) return portfolioError("Unauthorized", 401)

  const body = await request.json()
  const {
    folder_id,
    booking_id,
    file_name,
    mime_type,
    size_bytes,
    section,
  } = body

  if (!file_name || !mime_type || !size_bytes) {
    return portfolioError("file_name, mime_type, and size_bytes are required", 400)
  }

  const validationError = validateUpload(mime_type, Number(size_bytes))
  if (validationError) return portfolioError(validationError, 400)

  const supabase = await createClient()

  if (await checkIsReadOnly(supabase, session.id)) {
    return portfolioError("Your subscription has expired. Please upgrade to upload files.", 403)
  }

  try {
    const quotaRow = await fetchQuota(supabase, session.id)
    const quota = QuotaService.fromRow(quotaRow)
    const check = quota.canUpload(Number(size_bytes))
    if (!check.allowed) return portfolioError(check.reason ?? "Upload blocked", 402)

    let folderId = folder_id ? Number(folder_id) : null

    if (!folderId && booking_id) {
      const folder = await findOrCreateBookingFolder(
        supabase,
        session.id,
        Number(booking_id)
      )
      folderId = folder.id
    }

    if (!folderId) {
      const folder = await findOrCreateDefaultPortfolioFolder(supabase, session.id)
      folderId = folder.id
    }

    const { data: folderCheck } = await supabase
      .from("portfolio_folders")
      .select("id")
      .eq("id", folderId)
      .eq("user_id", session.id)
      .maybeSingle()

    if (!folderCheck) return portfolioError("Folder not found", 404)

    const { key, extension } = prepareUploadKey(session.id, folderId, file_name)
    const presignedUrl = await createPresignedUploadUrl(key, mime_type, Number(size_bytes))

    return portfolioSuccess("Presigned URL generated", {
      presigned_url: presignedUrl,
      storage_path: key,
      folder_id: folderId,
      extension,
      section: section ?? null,
      requires_server_upload: mime_type === "image/heic" || mime_type === "image/heif",
    })
  } catch (err) {
    return portfolioError(err instanceof Error ? err.message : "Presign failed", 500)
  }
}
