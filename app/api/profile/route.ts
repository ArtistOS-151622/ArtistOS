import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { enrichFile } from "@/lib/portfolio/files"
import { getOrCreateQuota, QuotaService } from "@/lib/portfolio/quota"
import {
  createArtistToken,
  getArtistSession,
  SESSION_MAX_AGE_SECONDS,
} from "@/lib/auth/session"

export async function GET(request: NextRequest) {
  try {
    const session = getArtistSession(request)
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const supabase = await createClient()

    const { data, error } = await supabase
      .from("users")
      .select("id, phone, artist_name, studio_name, email, address, avatar_file_id")
      .eq("id", session.id)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    if (!data) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    let avatar_url: string | null = null
    if (data.avatar_file_id) {
      const { data: avatarFile } = await supabase
        .from("portfolio_files")
        .select("*")
        .eq("id", data.avatar_file_id)
        .maybeSingle()

      if (avatarFile) avatar_url = enrichFile(avatarFile).public_url
    }

    const quotaRow = await getOrCreateQuota(supabase, session.id)
    const quota = QuotaService.fromRow(quotaRow).getQuotaInfo()

    return NextResponse.json({
      profile: { ...data, avatar_url },
      storage: quota,
    })
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal Server Error" },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = getArtistSession(request)
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await request.json()

    // Extract the allowed fields to update. Note: 'phone' is strictly excluded.
    const { artist_name, studio_name, email, address } = body

    if (!artist_name || !studio_name || !address) {
      return NextResponse.json(
        { error: "Artist name, studio name, and address are required" },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const { data, error } = await supabase
      .from("users")
      .update({
        artist_name,
        studio_name,
        email,
        address,
      })
      .eq("id", session.id)
      .select("id, phone, artist_name, studio_name, email, address")
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    if (!data) {
      return NextResponse.json({ error: "User not found or update failed" }, { status: 404 })
    }

    // Re-issue the session cookie so the UI topbar updates instantly
    const newSessionData = {
      id: data.id,
      phone: data.phone,
      artist_name: data.artist_name,
      studio_name: data.studio_name,
    }

    const token = createArtistToken(newSessionData)
    const response = NextResponse.json({ success: true, profile: data, token })

    response.cookies.set("artist_session", token, {
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: SESSION_MAX_AGE_SECONDS,
    })

    return response
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal Server Error" },
      { status: 500 }
    )
  }
}
