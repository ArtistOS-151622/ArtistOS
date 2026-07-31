import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getArtistSession } from "@/lib/auth/session"

export async function GET(req: NextRequest) {
  try {
    const session = getArtistSession(req)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = await createClient()

    const { data: devices, error } = await supabase
      .from("whatsapp_devices")
      .select("*")
      .eq("user_id", session.id)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching devices:", error)
      return NextResponse.json({ error: "Failed to fetch devices" }, { status: 500 })
    }

    return NextResponse.json({ devices })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal Error" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = getArtistSession(req)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { name } = body

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }

    const supabase = await createClient()

    const { data: device, error } = await supabase
      .from("whatsapp_devices")
      .insert({
        user_id: session.id,
        name,
        session_status: "DISCONNECTED",
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating device:", error)
      return NextResponse.json({ error: "Failed to create device" }, { status: 500 })
    }

    return NextResponse.json({ device })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal Error" }, { status: 500 })
  }
}
