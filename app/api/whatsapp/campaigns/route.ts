import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getArtistSession } from "@/lib/auth/session"
import { wakeWhatsAppWorker } from "@/lib/whatsapp/worker"

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Internal Error"
}

export async function GET(req: NextRequest) {
  try {
    const session = getArtistSession(req)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = await createClient()

    const { data: campaigns, error } = await supabase
      .from("broadcast_campaigns")
      .select(`
        *,
        messages:broadcast_messages(count)
      `)
      .eq("user_id", session.id)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching campaigns:", error)
      return NextResponse.json({ error: "Failed to fetch campaigns" }, { status: 500 })
    }

    return NextResponse.json({ campaigns })
  } catch (err) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = getArtistSession(req)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { name, message_template, min_delay_sec, max_delay_sec, business_hours_only, customer_ids, image_url } = body

    if (!name || !message_template || !customer_ids || !Array.isArray(customer_ids) || customer_ids.length === 0) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const supabase = await createClient()

    // 1. Create the campaign
    const { data: campaign, error: campaignError } = await supabase
      .from("broadcast_campaigns")
      .insert({
        user_id: session.id,
        name,
        message_template,
        image_url: image_url || null,
        min_delay_sec: min_delay_sec || 240,
        max_delay_sec: max_delay_sec || 300,
        business_hours_only: business_hours_only || false,
        status: "RUNNING",
      })
      .select()
      .single()

    if (campaignError || !campaign) {
      console.error("Error creating campaign:", campaignError)
      return NextResponse.json({ error: "Failed to create campaign" }, { status: 500 })
    }

    // 2. Fetch customer phone numbers
    const { data: customers, error: customerError } = await supabase
      .from("customers")
      .select("id, phone")
      .in("id", customer_ids)
      .eq("user_id", session.id)

    if (customerError || !customers) {
      return NextResponse.json({ error: "Failed to fetch customers" }, { status: 500 })
    }

    // 3. Create the message queue
    const queueData = customers
      .filter(c => c.phone) // Only queue if they have a phone number
      .map(customer => ({
        campaign_id: campaign.id,
        user_id: session.id,
        customer_id: customer.id,
        phone_number: customer.phone,
        status: "PENDING"
      }))

    if (queueData.length > 0) {
      const { error: queueError } = await supabase
        .from("broadcast_messages")
        .insert(queueData)
        
      if (queueError) {
        console.error("Error creating queue:", queueError)
        // We shouldn't fail completely here but ideally we should handle rollback or partial success
      }
    }

    void wakeWhatsAppWorker()

    return NextResponse.json({ success: true, campaign })
  } catch (err) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 })
  }
}
