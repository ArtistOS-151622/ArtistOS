import { NextResponse, type NextRequest } from "next/server"

import { scanDailyArtistAgenda } from "@/lib/whatsapp/daily-artist-agenda"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

/**
 * Cron endpoint triggered daily at 5:00 AM IST to send today's confirmed
 * bookings agenda to eligible artists (Free users & active Pro subscribers) via WhatsApp.
 */
export async function GET(request: NextRequest) {
  const secret = request.headers.get("authorization")?.replace("Bearer ", "")
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && secret !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createAdminClient()
    : await createClient()

  try {
    const result = await scanDailyArtistAgenda(supabase)

    return NextResponse.json({
      status: true,
      scannedArtists: result.scannedArtists,
      sent: result.sent,
      skipped: result.skipped,
      failed: result.failed,
      details: result.details,
    })
  } catch (err) {
    console.error("[Cron Daily Agenda] Execution failed:", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Daily agenda scan failed" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  return GET(request)
}
