import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { enrichFile } from "@/lib/portfolio/files"
import { getOrCreateQuota, QuotaService } from "@/lib/portfolio/quota"
import { GOOGLE_MAPS_URL_ERROR, isGoogleMapsUrl } from "@/lib/validation/google-maps-url"
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

    // The user row and the storage quota are independent: load them together.
    // A quota failure is captured and only surfaced after the user checks below,
    // so a missing user still returns 404 / a user query error still returns 400.
    const [{ data, error }, quotaResult] = await Promise.all([
      supabase
        .from("users")
        .select("id, phone, artist_name, studio_name, email, address, google_maps_url, avatar_file_id, studio_logo_file_id")
        .eq("id", session.id)
        .maybeSingle(),
      getOrCreateQuota(supabase, session.id).then(
        (row) => ({ row, error: null as unknown }),
        (quotaError: unknown) => ({ row: null, error: quotaError }),
      ),
    ])

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    if (!data) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    if (quotaResult.error || !quotaResult.row) throw quotaResult.error ?? new Error("Internal Server Error")

    // Avatar and studio logo lookups are independent: load them together
    const fileUrl = async (fileId: number | null) => {
      if (!fileId) return null
      const { data: file } = await supabase
        .from("portfolio_files")
        .select("*")
        .eq("id", fileId)
        .maybeSingle()
      return file ? enrichFile(file).public_url : null
    }
    const [avatar_url, studio_logo_url] = await Promise.all([
      fileUrl(data.avatar_file_id),
      fileUrl(data.studio_logo_file_id),
    ])

    const quota = QuotaService.fromRow(quotaResult.row).getQuotaInfo()

    return NextResponse.json({
      profile: { ...data, avatar_url, studio_logo_url },
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
    const { artist_name, studio_name, email, address, google_maps_url } = body

    if (!artist_name || !studio_name || !address) {
      return NextResponse.json(
        { error: "Artist name, studio name, and address are required" },
        { status: 400 }
      )
    }

    const mapsUrl = google_maps_url?.trim() || null
    if (mapsUrl && !isGoogleMapsUrl(mapsUrl)) {
      return NextResponse.json({ error: GOOGLE_MAPS_URL_ERROR }, { status: 400 })
    }

    const supabase = await createClient()

    const { data, error } = await supabase
      .from("users")
      .update({
        artist_name,
        studio_name,
        email,
        address,
        google_maps_url: mapsUrl,
      })
      .eq("id", session.id)
      .select("id, phone, artist_name, studio_name, email, address, google_maps_url")
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
