import { NextResponse, type NextRequest } from "next/server"

import { checkIsReadOnly } from "@/lib/auth/subscription"
import { getArtistSession } from "@/lib/auth/session"
import { bookingBelongsToUser } from "@/lib/bookings/guards"
import { createClient } from "@/lib/supabase/server"

type ServiceInput = {
  service_id: number
  quantity: number
  unit_price: number
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
  if (services.some((service) => !Number.isInteger(Number(service.quantity)) || Number(service.quantity) < 1)) {
    return NextResponse.json({ error: "Service quantity must be a whole number of at least 1." }, { status: 400 })
  }

  const rows = services.map((s) => ({
    booking_id: bookingId,
    service_id: Number(s.service_id),
    quantity: Number(s.quantity) || 1,
    unit_price: Number(s.unit_price) || 0,
  }))
  const serviceIds = rows.map((r) => r.service_id)
  if (serviceIds.some((sid) => !Number.isInteger(sid))) {
    return NextResponse.json({ error: "One or more selected services are invalid." }, { status: 400 })
  }
  // booking_services has PRIMARY KEY (booking_id, service_id)
  if (new Set(serviceIds).size !== serviceIds.length) {
    return NextResponse.json({ error: "Each service can only be added once. Use quantity instead." }, { status: 400 })
  }

  const supabase = await createClient()

  // ── 1. Independent checks in parallel ────────────────────────────────────
  const [isReadOnly, owns, ownedServicesRes] = await Promise.all([
    checkIsReadOnly(supabase, session.id),
    bookingBelongsToUser(supabase, bookingId, session.id),
    serviceIds.length > 0
      ? supabase.from("services").select("id").eq("user_id", session.id).in("id", serviceIds)
      : Promise.resolve({ data: [] as { id: number }[], error: null }),
  ])

  if (isReadOnly) {
    return NextResponse.json({ error: "Your subscription has expired. Please upgrade to update booking services." }, { status: 403 })
  }
  if (!owns) return NextResponse.json({ error: "Booking not found." }, { status: 404 })
  if (ownedServicesRes.error) return NextResponse.json({ error: ownedServicesRes.error.message }, { status: 400 })
  if ((ownedServicesRes.data ?? []).length !== serviceIds.length) {
    return NextResponse.json({ error: "One or more selected services are invalid." }, { status: 400 })
  }

  // ── 2. Sync in parallel: upsert the kept/new rows, delete the removed ones ─
  // These touch different rows, and a failure never leaves the booking with
  // no services (unlike the old delete-all-then-insert).
  let removeQuery = supabase.from("booking_services").delete().eq("booking_id", bookingId)
  if (serviceIds.length > 0) {
    removeQuery = removeQuery.not("service_id", "in", `(${serviceIds.join(",")})`)
  }

  const [upsertRes, removeRes] = await Promise.all([
    rows.length > 0
      ? supabase.from("booking_services").upsert(rows, { onConflict: "booking_id,service_id" })
      : Promise.resolve({ error: null }),
    removeQuery,
  ])

  const writeError = upsertRes.error ?? removeRes.error
  if (writeError) return NextResponse.json({ error: writeError.message }, { status: 400 })

  return NextResponse.json({ success: true })
}
