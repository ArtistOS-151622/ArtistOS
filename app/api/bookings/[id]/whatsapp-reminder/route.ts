import { NextResponse, type NextRequest } from "next/server"
import { getArtistSession } from "@/lib/auth/session"
import { createClient } from "@/lib/supabase/server"
import { sendBookingNotificationWhatsApp } from "@/lib/whatsapp/booking-notifications"

/**
 * Manually trigger the 1-day reminder WhatsApp message to a customer for a booking
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = getArtistSession(request)
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const id = Number((await params).id)
  if (Number.isNaN(id)) {
    return NextResponse.json({ error: "Invalid booking ID." }, { status: 400 })
  }

  const supabase = await createClient()

  // Verify ownership
  const { data: booking, error } = await supabase
    .from("bookings")
    .select("id, user_id, status")
    .eq("id", id)
    .eq("user_id", session.id)
    .maybeSingle()

  if (error || !booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 })
  }

  const result = await sendBookingNotificationWhatsApp(id, "reminder_24h", supabase)

  if (!result.success) {
    return NextResponse.json(
      {
        success: false,
        error: result.error || "Failed to send WhatsApp reminder",
      },
      { status: 400 }
    )
  }

  return NextResponse.json({
    success: true,
    bookingId: id,
    templateName: "one_day_reminder_to_customer",
  })
}
