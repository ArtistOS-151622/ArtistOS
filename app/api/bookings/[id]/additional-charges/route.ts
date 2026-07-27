import { NextResponse, type NextRequest } from "next/server"

import { getArtistSession } from "@/lib/auth/session"
import { createClient } from "@/lib/supabase/server"

type AdditionalChargeInput = {
  chargeId?: number | string
  charge_name: string
  quantity: number
  rate: number
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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = getArtistSession(request)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const bookingId = Number((await params).id)
  if (Number.isNaN(bookingId)) return NextResponse.json({ error: "Invalid booking ID." }, { status: 400 })

  const body = (await request.json()) as AdditionalChargeInput

  if (!body.charge_name?.trim())
    return NextResponse.json({ error: "Charge name is required." }, { status: 400 })
  if (Number(body.quantity) < 1)
    return NextResponse.json({ error: "Quantity must be at least 1." }, { status: 400 })
  if (Number(body.rate) < 0)
    return NextResponse.json({ error: "Rate cannot be negative." }, { status: 400 })

  const supabase = await createClient()

  const owns = await verifyBookingOwnership(supabase, bookingId, session.id)
  if (!owns) return NextResponse.json({ error: "Booking not found." }, { status: 404 })

  const { data, error } = await supabase
    .from("booking_additional_charges")
    .insert({
      user_id: session.id,
      booking_id: bookingId,
      charge_name: body.charge_name.trim(),
      quantity: Number(body.quantity),
      rate: Number(body.rate),
    })
    .select("id, charge_name, quantity, rate")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ charge: data }, { status: 201 })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = getArtistSession(request)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const bookingId = Number((await params).id)
  if (Number.isNaN(bookingId)) return NextResponse.json({ error: "Invalid booking ID." }, { status: 400 })

  const body = (await request.json()) as AdditionalChargeInput
  const chargeId = Number(body.chargeId)
  if (Number.isNaN(chargeId)) return NextResponse.json({ error: "Invalid charge ID." }, { status: 400 })

  if (!body.charge_name?.trim())
    return NextResponse.json({ error: "Charge name is required." }, { status: 400 })
  if (Number(body.quantity) < 1)
    return NextResponse.json({ error: "Quantity must be at least 1." }, { status: 400 })
  if (Number(body.rate) < 0)
    return NextResponse.json({ error: "Rate cannot be negative." }, { status: 400 })

  const supabase = await createClient()

  const { data, error } = await supabase
    .from("booking_additional_charges")
    .update({
      charge_name: body.charge_name.trim(),
      quantity: Number(body.quantity),
      rate: Number(body.rate),
    })
    .eq("id", chargeId)
    .eq("booking_id", bookingId)
    .eq("user_id", session.id)
    .select("id, charge_name, quantity, rate")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  if (!data) return NextResponse.json({ error: "Charge not found." }, { status: 404 })

  return NextResponse.json({ charge: data })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = getArtistSession(request)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const bookingId = Number((await params).id)
  if (Number.isNaN(bookingId)) return NextResponse.json({ error: "Invalid booking ID." }, { status: 400 })

  const { searchParams } = new URL(request.url)
  const chargeId = Number(searchParams.get("chargeId"))
  if (Number.isNaN(chargeId)) return NextResponse.json({ error: "Invalid charge ID." }, { status: 400 })

  const supabase = await createClient()

  const { error } = await supabase
    .from("booking_additional_charges")
    .delete()
    .eq("id", chargeId)
    .eq("booking_id", bookingId)
    .eq("user_id", session.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ success: true })
}
