import { NextResponse, type NextRequest } from "next/server"

import { checkIsReadOnly } from "@/lib/auth/subscription"
import { getArtistSession } from "@/lib/auth/session"
import { createClient } from "@/lib/supabase/server"

type ServiceInput = {
  service_id: number
  quantity: number
  unit_price: number
}

async function verifyBookingOwnership(supabase: Awaited<ReturnType<typeof createClient>>, bookingId: number, userId: number) {
  const { data } = await supabase
    .from("bookings")
    .select("id")
    .eq("id", bookingId)
    .eq("user_id", userId)
    .maybeSingle()
  return !!data
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = getArtistSession(request)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const bookingId = Number((await params).id)
  if (Number.isNaN(bookingId)) return NextResponse.json({ error: "Invalid booking ID." }, { status: 400 })

  const body = await request.json()
  const services = body.services as ServiceInput[]

  if (!Array.isArray(services)) {
    return NextResponse.json({ error: "Services must be an array." }, { status: 400 })
  }

  const supabase = await createClient()

  if (await checkIsReadOnly(supabase, session.id)) {
    return NextResponse.json({ error: "Your subscription has expired. Please upgrade to update booking services." }, { status: 403 })
  }

  const owns = await verifyBookingOwnership(supabase, bookingId, session.id)
  if (!owns) return NextResponse.json({ error: "Booking not found." }, { status: 404 })

  // 1. Delete existing services for this booking
  const { error: deleteError } = await supabase
    .from("booking_services")
    .delete()
    .eq("booking_id", bookingId)

  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 400 })

  // 2. Insert new services if any
  if (services.length > 0) {
    const insertData = services.map(s => ({
      booking_id: bookingId,
      service_id: s.service_id,
      quantity: Number(s.quantity) || 1,
      unit_price: Number(s.unit_price) || 0,
    }))

    const { error: insertError } = await supabase
      .from("booking_services")
      .insert(insertData)

    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
