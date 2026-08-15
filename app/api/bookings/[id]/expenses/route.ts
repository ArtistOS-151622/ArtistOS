import { NextResponse, type NextRequest } from "next/server"

import { checkIsReadOnly } from "@/lib/auth/subscription"
import { getArtistSession } from "@/lib/auth/session"
import { createClient } from "@/lib/supabase/server"

type ExpenseInput = {
  expense_name?: string
  amount?: number | string
  expense_date?: string
  description?: string
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

  if (await checkIsReadOnly(supabase, session.id)) {
    return NextResponse.json({ error: "Your subscription has expired. Please upgrade to update booking expenses." }, { status: 403 })
  }

  const owns = await verifyBookingOwnership(supabase, bookingId, session.id)
  if (!owns) return NextResponse.json({ error: "Booking not found." }, { status: 404 })

  const { data, error } = await supabase
    .from("booking_expenses")
    .select("id, expense_name, amount, expense_date, description, created_at")
    .eq("booking_id", bookingId)
    .eq("user_id", session.id)
    .order("expense_date", { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ expenses: data ?? [] })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = getArtistSession(request)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const bookingId = Number((await params).id)
  if (Number.isNaN(bookingId)) return NextResponse.json({ error: "Invalid booking ID." }, { status: 400 })

  const body = (await request.json()) as ExpenseInput

  if (!body.expense_name?.trim())
    return NextResponse.json({ error: "Expense name is required." }, { status: 400 })

  const amount = Number(body.amount)
  if (!Number.isFinite(amount) || amount <= 0)
    return NextResponse.json({ error: "Amount must be a positive number." }, { status: 400 })
  if (!body.expense_date)
    return NextResponse.json({ error: "Expense date is required." }, { status: 400 })

  const supabase = await createClient()

  const owns = await verifyBookingOwnership(supabase, bookingId, session.id)
  if (!owns) return NextResponse.json({ error: "Booking not found." }, { status: 404 })

  const { data, error } = await supabase
    .from("booking_expenses")
    .insert({
      user_id: session.id,
      booking_id: bookingId,
      expense_name: body.expense_name.trim(),
      amount,
      expense_date: body.expense_date,
      description: body.description?.trim() || null,
    })
    .select("id, expense_name, amount, expense_date, description, created_at")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ expense: data }, { status: 201 })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = getArtistSession(request)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const bookingId = Number((await params).id)
  if (Number.isNaN(bookingId)) return NextResponse.json({ error: "Invalid booking ID." }, { status: 400 })

  const body = (await request.json()) as ExpenseInput & { expenseId?: number | string }
  const expenseId = Number(body.expenseId)
  if (Number.isNaN(expenseId)) return NextResponse.json({ error: "Invalid expense ID." }, { status: 400 })

  if (!body.expense_name?.trim())
    return NextResponse.json({ error: "Expense name is required." }, { status: 400 })

  const amount = Number(body.amount)
  if (!Number.isFinite(amount) || amount <= 0)
    return NextResponse.json({ error: "Amount must be a positive number." }, { status: 400 })
  if (!body.expense_date)
    return NextResponse.json({ error: "Expense date is required." }, { status: 400 })

  const supabase = await createClient()

  if (await checkIsReadOnly(supabase, session.id)) {
    return NextResponse.json({ error: "Your subscription has expired. Please upgrade to update booking expenses." }, { status: 403 })
  }

  const { data, error } = await supabase
    .from("booking_expenses")
    .update({
      expense_name: body.expense_name.trim(),
      amount,
      expense_date: body.expense_date,
      description: body.description?.trim() || null,
    })
    .eq("id", expenseId)
    .eq("booking_id", bookingId)
    .eq("user_id", session.id)
    .select("id, expense_name, amount, expense_date, description, created_at")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  if (!data) return NextResponse.json({ error: "Expense not found." }, { status: 404 })

  return NextResponse.json({ expense: data })
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
  const expenseId = Number(searchParams.get("expenseId"))
  if (Number.isNaN(expenseId)) return NextResponse.json({ error: "Invalid expense ID." }, { status: 400 })

  const supabase = await createClient()

  if (await checkIsReadOnly(supabase, session.id)) {
    return NextResponse.json({ error: "Your subscription has expired. Please upgrade to update booking expenses." }, { status: 403 })
  }

  const { error } = await supabase
    .from("booking_expenses")
    .delete()
    .eq("id", expenseId)
    .eq("booking_id", bookingId)
    .eq("user_id", session.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ success: true })
}
