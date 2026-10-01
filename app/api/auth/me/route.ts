import { NextResponse, type NextRequest } from "next/server"
import { getArtistSession } from "@/lib/auth/session"
import { createClient } from "@/lib/supabase/server"
import { enrichFile } from "@/lib/portfolio/files"

export async function GET(request: NextRequest) {
  const session = getArtistSession(request)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const supabase = await createClient()
    const { data: user } = await supabase
      .from("users")
      .select("avatar_file_id, studio_logo_file_id")
      .eq("id", session.id)
      .maybeSingle()

    let avatar_url = null
    let studio_logo_url = null

    const fileIds = [user?.avatar_file_id, user?.studio_logo_file_id].filter(Boolean) as number[]
    if (fileIds.length > 0) {
      const { data: files } = await supabase
        .from("portfolio_files")
        .select("*")
        .in("id", fileIds)
      const fileMap = new Map((files ?? []).map((f) => [f.id, enrichFile(f).public_url]))
      if (user?.avatar_file_id) avatar_url = fileMap.get(user.avatar_file_id) ?? null
      if (user?.studio_logo_file_id) studio_logo_url = fileMap.get(user.studio_logo_file_id) ?? null
    }

    return NextResponse.json({ user: { ...session, avatar_url, studio_logo_url } })
  } catch (err) {
    // Fallback to basic session if db fails
    return NextResponse.json({ user: session })
  }
}
