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

    if (user?.avatar_file_id) {
      const { data: file } = await supabase.from("portfolio_files").select("*").eq("id", user.avatar_file_id).maybeSingle()
      if (file) avatar_url = enrichFile(file).public_url
    }

    if (user?.studio_logo_file_id) {
      const { data: file } = await supabase.from("portfolio_files").select("*").eq("id", user.studio_logo_file_id).maybeSingle()
      if (file) studio_logo_url = enrichFile(file).public_url
    }

    return NextResponse.json({ user: { ...session, avatar_url, studio_logo_url } })
  } catch (err) {
    // Fallback to basic session if db fails
    return NextResponse.json({ user: session })
  }
}
