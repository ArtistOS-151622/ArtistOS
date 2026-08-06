import { NextResponse, type NextRequest } from "next/server"
import { getArtistSession } from "@/lib/auth/session"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  const session = getArtistSession(request)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const startDate = searchParams.get("start_date")
  const endDate = searchParams.get("end_date")

  if (!startDate || !endDate) {
    return NextResponse.json({ error: "start_date and end_date are required" }, { status: 400 })
  }

  const supabase = await createClient()

  const { data, error } = await supabase
    .from("bookings")
    .select("booking_date")
    .eq("user_id", session.id)
    .gte("booking_date", startDate)
    .lte("booking_date", endDate)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  // Aggregate counts by date
  const counts: Record<string, number> = {}
  for (const booking of data || []) {
    const date = booking.booking_date
    counts[date] = (counts[date] || 0) + 1
  }

  // Convert to array format for easier consumption
  const result = Object.entries(counts).map(([date, count]) => ({ date, count }))

  return NextResponse.json({ counts: result })
}
