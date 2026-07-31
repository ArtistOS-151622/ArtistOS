import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getArtistSession } from "@/lib/auth/session"
import { wakeWhatsAppWorker } from "@/lib/whatsapp/worker"

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Internal Error"
}

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
  } catch (err) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 })
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
  } catch (err) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 })
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
    if (body.action !== "retry_failed") {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }

    const supabase = await createClient()

    const { data: campaign, error: campaignError } = await supabase
      .from("broadcast_campaigns")
      .select("id")
      .eq("id", id)
      .eq("user_id", session.id)
      .single()

    if (campaignError || !campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 })
    }

    const { error } = await supabase
      .from("broadcast_messages")
      .update({
        status: "PENDING",
        error_message: null,
        updated_at: new Date().toISOString(),
      })
      .eq("campaign_id", id)
      .eq("user_id", session.id)
      .eq("status", "FAILED")

    if (error) {
      console.error("Error retrying failed messages:", error)
      return NextResponse.json({ error: "Failed to retry messages" }, { status: 500 })
    }

    await supabase
      .from("broadcast_campaigns")
      .update({ status: "RUNNING", updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", session.id)

    void wakeWhatsAppWorker()

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 })
  }
}
