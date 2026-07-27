import { NextResponse, type NextRequest } from "next/server"

import { getArtistSession } from "@/lib/auth/session"
import { createClient } from "@/lib/supabase/server"

type PaymentInput = {
  payment_type?: string
  payment_method?: string
  amount?: number | string
  payment_date?: string
  remark?: string
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = getArtistSession(request)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const bookingId = Number((await params).id)
  if (Number.isNaN(bookingId)) return NextResponse.json({ error: "Invalid booking ID." }, { status: 400 })

  const supabase = await createClient()

  const owns = await verifyBookingOwnership(supabase, bookingId, session.id)
  if (!owns) return NextResponse.json({ error: "Booking not found." }, { status: 404 })

  const { data, error } = await supabase
    .from("booking_payments")
    .select("id, payment_type, payment_method, amount, payment_date, remark, created_at")
    .eq("booking_id", bookingId)
    .eq("user_id", session.id)
    .order("payment_date", { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ payments: data ?? [] })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = getArtistSession(request)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const bookingId = Number((await params).id)
  if (Number.isNaN(bookingId)) return NextResponse.json({ error: "Invalid booking ID." }, { status: 400 })

  const body = (await request.json()) as PaymentInput

  const validTypes = ["Advance", "Installment", "Final Payment"]
  const validMethods = ["UPI", "Cash", "Check", "Bank Transfer"]

  if (!body.payment_type || !validTypes.includes(body.payment_type))
    return NextResponse.json({ error: "Invalid payment type." }, { status: 400 })
  if (!body.payment_method || !validMethods.includes(body.payment_method))
    return NextResponse.json({ error: "Invalid payment method." }, { status: 400 })
  
  const amount = Number(body.amount)
  if (!Number.isFinite(amount) || amount <= 0)
    return NextResponse.json({ error: "Amount must be a positive number." }, { status: 400 })
  if (!body.payment_date)
    return NextResponse.json({ error: "Payment date is required." }, { status: 400 })

  const supabase = await createClient()

  const owns = await verifyBookingOwnership(supabase, bookingId, session.id)
  if (!owns) return NextResponse.json({ error: "Booking not found." }, { status: 404 })

  const { data, error } = await supabase
    .from("booking_payments")
    .insert({
      user_id: session.id,
      booking_id: bookingId,
      payment_type: body.payment_type,
      payment_method: body.payment_method,
      amount,
      payment_date: body.payment_date,
      remark: body.remark?.trim() || null,
    })
    .select("id, payment_type, payment_method, amount, payment_date, remark, created_at")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ payment: data }, { status: 201 })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = getArtistSession(request)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const bookingId = Number((await params).id)
  if (Number.isNaN(bookingId)) return NextResponse.json({ error: "Invalid booking ID." }, { status: 400 })

  const body = (await request.json()) as PaymentInput & { paymentId?: number | string }
  const paymentId = Number(body.paymentId)
  if (Number.isNaN(paymentId)) return NextResponse.json({ error: "Invalid payment ID." }, { status: 400 })

  const validTypes = ["Advance", "Installment", "Final Payment"]
  const validMethods = ["UPI", "Cash", "Check", "Bank Transfer"]

  if (!body.payment_type || !validTypes.includes(body.payment_type))
    return NextResponse.json({ error: "Invalid payment type." }, { status: 400 })
  if (!body.payment_method || !validMethods.includes(body.payment_method))
    return NextResponse.json({ error: "Invalid payment method." }, { status: 400 })

  const amount = Number(body.amount)
  if (!Number.isFinite(amount) || amount <= 0)
    return NextResponse.json({ error: "Amount must be a positive number." }, { status: 400 })
  if (!body.payment_date)
    return NextResponse.json({ error: "Payment date is required." }, { status: 400 })

  const supabase = await createClient()

  const { data, error } = await supabase
    .from("booking_payments")
    .update({
      payment_type: body.payment_type,
      payment_method: body.payment_method,
      amount,
      payment_date: body.payment_date,
      remark: body.remark?.trim() || null,
    })
    .eq("id", paymentId)
    .eq("booking_id", bookingId)
    .eq("user_id", session.id)
    .select("id, payment_type, payment_method, amount, payment_date, remark, created_at")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  if (!data) return NextResponse.json({ error: "Payment not found." }, { status: 404 })

  return NextResponse.json({ payment: data })
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
  const paymentId = Number(searchParams.get("paymentId"))
  if (Number.isNaN(paymentId)) return NextResponse.json({ error: "Invalid payment ID." }, { status: 400 })

  const supabase = await createClient()

  const { error } = await supabase
    .from("booking_payments")
    .delete()
    .eq("id", paymentId)
    .eq("booking_id", bookingId)
    .eq("user_id", session.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ success: true })
}
