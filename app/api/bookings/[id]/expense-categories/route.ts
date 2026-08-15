import { NextResponse, type NextRequest } from "next/server"

import { checkIsReadOnly } from "@/lib/auth/subscription"
import { getArtistSession } from "@/lib/auth/session"
import { createClient } from "@/lib/supabase/server"

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
    return NextResponse.json({ error: "Your subscription has expired. Please upgrade to update expense categories." }, { status: 403 })
  }

  const owns = await verifyBookingOwnership(supabase, bookingId, session.id)
  if (!owns) return NextResponse.json({ error: "Booking not found." }, { status: 404 })

  const { data, error } = await supabase
    .from("booking_expense_categories")
    .select("id, category_name, created_at")
    .eq("booking_id", bookingId)
    .eq("user_id", session.id)
    .order("created_at", { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ categories: data ?? [] })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = getArtistSession(request)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const bookingId = Number((await params).id)
  if (Number.isNaN(bookingId)) return NextResponse.json({ error: "Invalid booking ID." }, { status: 400 })

  const body = (await request.json()) as { category_name?: string }

  if (!body.category_name?.trim())
    return NextResponse.json({ error: "Category name is required." }, { status: 400 })

  const supabase = await createClient()

  const owns = await verifyBookingOwnership(supabase, bookingId, session.id)
  if (!owns) return NextResponse.json({ error: "Booking not found." }, { status: 404 })

  const { data, error } = await supabase
    .from("booking_expense_categories")
    .insert({
      user_id: session.id,
      booking_id: bookingId,
      category_name: body.category_name.trim(),
    })
    .select("id, category_name, created_at")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ category: data }, { status: 201 })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = getArtistSession(request)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const bookingId = Number((await params).id)
  if (Number.isNaN(bookingId)) return NextResponse.json({ error: "Invalid booking ID." }, { status: 400 })

  const body = (await request.json()) as { categoryId?: number | string; category_name?: string }

  const categoryId = Number(body.categoryId)
  if (Number.isNaN(categoryId)) return NextResponse.json({ error: "Invalid category ID." }, { status: 400 })
  if (!body.category_name?.trim()) return NextResponse.json({ error: "Category name is required." }, { status: 400 })

  const supabase = await createClient()

  if (await checkIsReadOnly(supabase, session.id)) {
    return NextResponse.json({ error: "Your subscription has expired. Please upgrade to update expense categories." }, { status: 403 })
  }

  const { data, error } = await supabase
    .from("booking_expense_categories")
    .update({ category_name: body.category_name.trim() })
    .eq("id", categoryId)
    .eq("booking_id", bookingId)
    .eq("user_id", session.id)
    .select("id, category_name, created_at")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  if (!data) return NextResponse.json({ error: "Category not found." }, { status: 404 })

  return NextResponse.json({ category: data })
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
  const categoryId = Number(searchParams.get("categoryId"))
  if (Number.isNaN(categoryId)) return NextResponse.json({ error: "Invalid category ID." }, { status: 400 })

  const supabase = await createClient()

  if (await checkIsReadOnly(supabase, session.id)) {
    return NextResponse.json({ error: "Your subscription has expired. Please upgrade to update expense categories." }, { status: 403 })
  }

  const { error } = await supabase
    .from("booking_expense_categories")
    .delete()
    .eq("id", categoryId)
    .eq("booking_id", bookingId)
    .eq("user_id", session.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ success: true })
}
