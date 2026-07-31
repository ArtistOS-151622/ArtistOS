import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getArtistSession } from "@/lib/auth/session"

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const session = getArtistSession(req)

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = await createClient()

    const { error } = await supabase
      .from("whatsapp_devices")
      .delete()
      .eq("id", id)
      .eq("user_id", session.id)

    if (error) {
      console.error("Error deleting device:", error)
      return NextResponse.json({ error: "Failed to delete device" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal Error" }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const session = getArtistSession(req)
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const supabase = await createClient()

    const { error } = await supabase
      .from("whatsapp_devices")
      .update(body)
      .eq("id", id)
      .eq("user_id", session.id)

    if (error) {
      console.error("Error updating device:", error)
      return NextResponse.json({ error: "Failed to update device" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal Error" }, { status: 500 })
  }
}
