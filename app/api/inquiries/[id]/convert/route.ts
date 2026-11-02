import { NextResponse, type NextRequest, after } from "next/server"

import { checkIsReadOnly } from "@/lib/auth/subscription"
import { getArtistSession } from "@/lib/auth/session"
import { convertInquiryToBooking } from "@/lib/inquiries/queries"
import { createClient } from "@/lib/supabase/server"
import { sendBookingNotificationWhatsApp } from "@/lib/whatsapp/booking-notifications"

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function POST(request: NextRequest, context: RouteContext) {
  const session = getArtistSession(request)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await context.params
  const inquiryId = Number(id)
  if (!Number.isFinite(inquiryId)) {
    return NextResponse.json({ error: "Invalid inquiry id." }, { status: 400 })
  }

  const supabase = await createClient()

  if (await checkIsReadOnly(supabase, session.id)) {
    return NextResponse.json({ error: "Your subscription has expired. Please upgrade to create bookings." }, { status: 403 })
  }

  const result = await convertInquiryToBooking(supabase, inquiryId, session.id)

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  // Send automated WhatsApp confirmation asynchronously in background without blocking response (~2-4s saved)
  if (result.booking_id) {
    const bookingId = result.booking_id
    after(async () => {
      try {
        await sendBookingNotificationWhatsApp(bookingId, "confirmed", supabase)
      } catch (err) {
        console.error("[WhatsApp] Failed to dispatch booking confirmation notification for converted inquiry:", err)
      }
    })
  }

  return NextResponse.json(result)
}
