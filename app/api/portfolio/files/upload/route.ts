import { type NextRequest } from "next/server"

import { checkIsReadOnly } from "@/lib/auth/subscription"
import { getArtistSession } from "@/lib/auth/session"
import {
  findOrCreateBookingFolder,
  findOrCreateDefaultPortfolioFolder,
} from "@/lib/portfolio/folders"
import {
  confirmFileUpload,
  overwriteFileInR2,
  prepareUploadKey,
  validateUpload,
} from "@/lib/portfolio/files"
import { getOrCreateQuota as fetchQuota, QuotaService } from "@/lib/portfolio/quota"
import { portfolioError, portfolioSuccess } from "@/lib/portfolio/response"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  const session = getArtistSession(request)
  if (!session) return portfolioError("Unauthorized", 401)

  const formData = await request.formData()
  const file = formData.get("file")
  const folderIdValue = formData.get("folder_id")
  const bookingIdValue = formData.get("booking_id")
  const sectionValue = formData.get("section")
  const setAsAvatar = formData.get("set_as_avatar") === "true"
  const setAsStudioLogo = formData.get("set_as_studio_logo") === "true"

  if (!(file instanceof File)) return portfolioError("file is required", 400)

  const mimeType = file.type || "application/octet-stream"
  const validationError = validateUpload(mimeType, file.size)
  if (validationError) return portfolioError(validationError, 400)

  const supabase = await createClient()

  if (await checkIsReadOnly(supabase, session.id)) {
    return portfolioError("Your subscription has expired. Please upgrade to upload files.", 403)
  }

  try {
    const quotaRow = await fetchQuota(supabase, session.id)
    const quota = QuotaService.fromRow(quotaRow)
    const check = quota.canUpload(file.size)
    if (!check.allowed) return portfolioError(check.reason ?? "Upload blocked", 402)

    let folderId = folderIdValue ? Number(folderIdValue) : null
    const bookingId = bookingIdValue ? Number(bookingIdValue) : null

    if (!folderId && bookingId) {
      const folder = await findOrCreateBookingFolder(supabase, session.id, bookingId)
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

    const { key, extension } = prepareUploadKey(session.id, folderId, file.name)
    const buffer = Buffer.from(await file.arrayBuffer())

    await overwriteFileInR2(key, buffer, mimeType)

    const uploaded = await confirmFileUpload(supabase, {
      userId: session.id,
      folderId,
      storagePath: key,
      originalName: file.name,
      mimeType,
      extension,
      fileSize: file.size,
      section: sectionValue ? String(sectionValue) : null,
    })

    if (setAsAvatar) {
      await supabase
        .from("users")
        .update({ avatar_file_id: uploaded.id })
        .eq("id", session.id)
    }

    if (setAsStudioLogo) {
      await supabase
        .from("users")
        .update({ studio_logo_file_id: uploaded.id })
        .eq("id", session.id)
    }

    return portfolioSuccess("File uploaded", { file: uploaded }, 201)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed"
    const status = message.includes("quota") || message.includes("expired") ? 402 : 500
    return portfolioError(message, status)
  }
}
