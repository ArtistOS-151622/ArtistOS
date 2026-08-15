import { type NextRequest } from "next/server"
import sharp from "sharp"

import { checkIsReadOnly } from "@/lib/auth/subscription"
import { getArtistSession } from "@/lib/auth/session"
import {
  overwriteFileInR2,
  updateFileSizeAfterOverwrite,
} from "@/lib/portfolio/files"
import { portfolioError, portfolioSuccess } from "@/lib/portfolio/response"
import { createClient } from "@/lib/supabase/server"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = getArtistSession(request)
  if (!session) return portfolioError("Unauthorized", 401)

  const id = Number((await params).id)
  const body = await request.json()
  const quality = Math.min(100, Math.max(1, Number(body.quality ?? 80)))

  const supabase = await createClient()

  if (await checkIsReadOnly(supabase, session.id)) {
    return portfolioError("Your subscription has expired. Please upgrade to edit files.", 403)
  }

  const { data: file, error } = await supabase
    .from("portfolio_files")
    .select("*")
    .eq("id", id)
    .eq("user_id", session.id)
    .single()

  if (error || !file) return portfolioError("File not found", 404)

  if (!file.mime_type.startsWith("image/")) {
    return portfolioError("Only images can be compressed", 400)
  }

  try {
    const { createPresignedDownloadUrl } = await import("@/lib/portfolio/files")
    const url = await createPresignedDownloadUrl(file.storage_path)
    const response = await fetch(url)
    const inputBuffer = Buffer.from(await response.arrayBuffer())

    const output = await sharp(inputBuffer)
      .jpeg({ quality, mozjpeg: true })
      .toBuffer()

    await overwriteFileInR2(file.storage_path, output, "image/jpeg")
    const updated = await updateFileSizeAfterOverwrite(
      supabase,
      session.id,
      id,
      output.length,
      "image/jpeg",
      "jpeg"
    )

    return portfolioSuccess("Image compressed", { file: updated })
  } catch (err) {
    return portfolioError(err instanceof Error ? err.message : "Compress failed", 500)
  }
}
