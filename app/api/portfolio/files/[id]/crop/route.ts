import { type NextRequest } from "next/server"
import sharp from "sharp"

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
  const formData = await request.formData()
  const image = formData.get("image")

  if (!(image instanceof Blob)) {
    return portfolioError("image file is required", 400)
  }

  const supabase = await createClient()
  const { data: file, error } = await supabase
    .from("portfolio_files")
    .select("*")
    .eq("id", id)
    .eq("user_id", session.id)
    .single()

  if (error || !file) return portfolioError("File not found", 404)

  try {
    const buffer = Buffer.from(await image.arrayBuffer())
    const output = await sharp(buffer).jpeg({ quality: 90 }).toBuffer()

    await overwriteFileInR2(file.storage_path, output, "image/jpeg")
    const updated = await updateFileSizeAfterOverwrite(
      supabase,
      session.id,
      id,
      output.length,
      "image/jpeg",
      "jpeg"
    )

    return portfolioSuccess("Image cropped", { file: updated })
  } catch (err) {
    return portfolioError(err instanceof Error ? err.message : "Crop failed", 500)
  }
}
