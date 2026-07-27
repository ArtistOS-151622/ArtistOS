import { type NextRequest } from "next/server"

import { getArtistSession } from "@/lib/auth/session"
import { createPresignedDownloadUrl } from "@/lib/portfolio/files"
import { portfolioError, portfolioSuccess } from "@/lib/portfolio/response"
import { createClient } from "@/lib/supabase/server"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = getArtistSession(request)
  if (!session) return portfolioError("Unauthorized", 401)

  const id = Number((await params).id)
  const supabase = await createClient()

  const { data: file, error } = await supabase
    .from("portfolio_files")
    .select("*")
    .eq("id", id)
    .eq("user_id", session.id)
    .single()

  if (error || !file) return portfolioError("File not found", 404)

  try {
    const downloadUrl = await createPresignedDownloadUrl(file.storage_path)
    return portfolioSuccess("Download URL generated", {
      download_url: downloadUrl,
      file,
    })
  } catch (err) {
    return portfolioError(err instanceof Error ? err.message : "Download failed", 500)
  }
}
