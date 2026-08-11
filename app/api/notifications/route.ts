import { NextResponse, type NextRequest } from "next/server"

import { getArtistSession } from "@/lib/auth/session"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  const session = getArtistSession(request)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from("notification_events")
    .select("id, title, body, url, created_at, read_at, status")
    .eq("user_id", session.id)
    .order("created_at", { ascending: false })
    .limit(50)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function PATCH(request: NextRequest) {
  const session = getArtistSession(request)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supabase = await createClient()
  const body = await request.json().catch(() => null)
  
  if (body?.id) {
    const { error } = await supabase
      .from("notification_events")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", session.id)
      .eq("id", body.id)
      .is("read_at", null)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  } else {
    // Mark all as read
    const { error } = await supabase
      .from("notification_events")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", session.id)
      .is("read_at", null)
      
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ status: true })
}
