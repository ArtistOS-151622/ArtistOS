import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getArtistSession } from "@/lib/auth/session"

export async function GET(
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

    const { data: campaign, error } = await supabase
      .from("broadcast_campaigns")
      .select(`
        *,
        messages:broadcast_messages (
          id,
          status,
          created_at,
          sent_at,
          error_message,
          customers (
            customer_name,
            phone
          )
        )
      `)
      .eq("id", id)
      .eq("user_id", session.id)
      .single()

    if (error || !campaign) {
      console.error("Error fetching campaign details:", error)
      return NextResponse.json({ error: "Failed to fetch campaign details" }, { status: 500 })
    }

    return NextResponse.json({ campaign })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal Error" }, { status: 500 })
  }
}

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
      .from("broadcast_campaigns")
      .delete()
      .eq("id", id)
      .eq("user_id", session.id)

    if (error) {
      console.error("Error deleting campaign:", error)
      return NextResponse.json({ error: "Failed to delete campaign" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal Error" }, { status: 500 })
  }
}
