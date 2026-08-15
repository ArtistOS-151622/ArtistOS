import { NextResponse, type NextRequest } from "next/server"
import { checkIsReadOnly } from "@/lib/auth/subscription"
import { getArtistSession } from "@/lib/auth/session"
import { createClient } from "@/lib/supabase/server"
import { getR2Client, getR2BucketName } from "@/lib/r2/client"
import { PutObjectCommand } from "@aws-sdk/client-s3"

export async function POST(req: NextRequest) {
  try {
    const session = getArtistSession(req)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = await createClient()
    if (await checkIsReadOnly(supabase, session.id)) {
      return NextResponse.json({ error: "Your subscription has expired. Please upgrade to upload template images." }, { status: 403 })
    }

    const formData = await req.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Validate: image only, max 5MB
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Only image files are allowed" }, { status: 400 })
    }
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "Image must be under 5MB" }, { status: 400 })
    }

    const ext = file.name.split(".").pop() || "jpg"
    const key = `broadcasts/${session.id}/${Date.now()}.${ext}`

    const r2 = getR2Client()
    const bucket = getR2BucketName()

    const buffer = Buffer.from(await file.arrayBuffer())

    await r2.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ContentType: file.type,
      })
    )

    // Build public URL using the R2 public domain
    const publicDomain = process.env.R2_PUBLIC_URL?.replace(/\/$/, "")
    if (!publicDomain) {
      return NextResponse.json({ error: "R2_PUBLIC_URL not configured" }, { status: 500 })
    }

    const url = `${publicDomain}/${key}`
    return NextResponse.json({ url })
  } catch (err: unknown) {
    console.error("Broadcast image upload error:", err)
    return NextResponse.json({ error: err instanceof Error ? err.message : "Upload failed" }, { status: 500 })
  }
}
