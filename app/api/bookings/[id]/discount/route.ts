import { NextResponse, type NextRequest } from "next/server"

import { checkIsReadOnly } from "@/lib/auth/subscription"
import { getArtistSession } from "@/lib/auth/session"
import { createClient } from "@/lib/supabase/server"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = getArtistSession(request)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const bookingId = Number((await params).id)
  if (Number.isNaN(bookingId)) return NextResponse.json({ error: "Invalid booking ID." }, { status: 400 })

  const body = await request.json()
  const discount = Number(body.discount)

  if (Number.isNaN(discount) || discount < 0) {
    return NextResponse.json({ error: "Discount must be a positive number." }, { status: 400 })
  }

  const supabase = await createClient()

  if (await checkIsReadOnly(supabase, session.id)) {
    return NextResponse.json({ error: "Your subscription has expired. Please upgrade to update booking discounts." }, { status: 403 })
  }

  const { data, error } = await supabase
    .from("bookings")
    .update({ discount })
    .eq("id", bookingId)
    .eq("user_id", session.id)
    .select("id, discount")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  if (!data) return NextResponse.json({ error: "Booking not found." }, { status: 404 })

  return NextResponse.json({ success: true, discount: data.discount })
}
