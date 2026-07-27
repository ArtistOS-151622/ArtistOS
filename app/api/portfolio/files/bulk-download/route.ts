import { createRequire } from "module"
import { type NextRequest } from "next/server"
import { PassThrough } from "stream"
import type { Archiver } from "archiver"

import { GetObjectCommand } from "@aws-sdk/client-s3"

const require = createRequire(import.meta.url)
const createArchive = require("archiver") as (
  format: string,
  options?: { zlib?: { level?: number } }
) => import("archiver").Archiver

import { getArtistSession } from "@/lib/auth/session"
import { getR2BucketName, getR2Client } from "@/lib/r2/client"
import { portfolioError } from "@/lib/portfolio/response"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  const session = getArtistSession(request)
  if (!session) return portfolioError("Unauthorized", 401)

  const body = await request.json()
  const { ids } = body

  if (!Array.isArray(ids) || ids.length === 0) {
    return portfolioError("ids array is required", 400)
  }

  const supabase = await createClient()
  const { data: files, error } = await supabase
    .from("portfolio_files")
    .select("*")
    .eq("user_id", session.id)
    .in("id", ids)

  if (error || !files?.length) return portfolioError("Files not found", 404)

  const client = getR2Client()
  const bucket = getR2BucketName()
  const archive = createArchive("zip", { zlib: { level: 5 } })
  const passthrough = new PassThrough()

  archive.pipe(passthrough)

  for (const file of files) {
    const response = await client.send(
      new GetObjectCommand({ Bucket: bucket, Key: file.storage_path })
    )
    const bodyStream = response.Body
    if (bodyStream) {
      const bytes = await bodyStream.transformToByteArray()
      archive.append(Buffer.from(bytes), { name: file.original_name })
    }
  }

  void archive.finalize()

  const chunks: Buffer[] = []
  for await (const chunk of passthrough) {
    chunks.push(Buffer.from(chunk))
  }
  const buffer = Buffer.concat(chunks)

  return new Response(buffer, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="portfolio-files.zip"`,
    },
  })
}
