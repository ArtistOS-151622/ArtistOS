import { NextResponse, type NextRequest } from "next/server"
import { getArtistSession } from "@/lib/auth/session"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  const session = getArtistSession(request)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const search = searchParams.get("search")?.trim() || ""
  const startDate = searchParams.get("start_date") || null
  const endDate = searchParams.get("end_date") || null
  const sort = searchParams.get("sort") || "recent"

  const supabase = await createClient()

  // Fetch customers with their bookings, services, and payments aggregated
  let customerQuery = supabase
    .from("customers")
    .select(`
      id,
      customer_name,
      phone,
      alt_phone,
      email,
      address,
      reference_by,
      created_at,
      bookings(
        id,
        booking_date,
        status,
        discount,
        booking_services(
          quantity,
          unit_price,
          service:services(id, service_name, price)
        ),
        booking_additional_charges(id, charge_name, quantity, rate),
        booking_payments(id, payment_type, payment_method, amount, payment_date, remark)
      )
    `)
    .eq("user_id", session.id)

  if (search) {
    customerQuery = customerQuery.or(
      `customer_name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`
    )
  }

  const { data: customers, error } = await customerQuery

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // Aggregate per-customer stats
  const enriched = (customers ?? []).map((c) => {
    const bookings = (c.bookings ?? []) as any[]

    // Apply date filter on bookings for summary
    const filteredBookings = (startDate && endDate)
      ? bookings.filter(b => b.booking_date >= startDate && b.booking_date <= endDate)
      : bookings

    let total_billed = 0
    let total_paid = 0

    for (const b of filteredBookings) {
      const services = (b.booking_services ?? []) as any[]
      const charges = (b.booking_additional_charges ?? []) as any[]
      const payments = (b.booking_payments ?? []) as any[]

      const serviceTotal = services.reduce((sum: number, s: any) => {
        return sum + ((s.unit_price ?? s.service?.price ?? 0) * (s.quantity ?? 1))
      }, 0)

      const chargesTotal = charges.reduce((sum: number, ch: any) => {
        return sum + ((ch.rate ?? 0) * (ch.quantity ?? 1))
      }, 0)

      const discount = Number(b.discount ?? 0)
      const billed = serviceTotal + chargesTotal - discount
      total_billed += billed
      total_paid += payments.reduce((sum: number, p: any) => sum + Number(p.amount ?? 0), 0)
    }

    const allBookingDates = bookings.map(b => b.booking_date).filter(Boolean)
    const last_booking_date = allBookingDates.length
      ? allBookingDates.sort().reverse()[0]
      : null

    return {
      id: c.id,
      customer_name: c.customer_name,
      phone: c.phone,
      alt_phone: c.alt_phone,
      email: c.email,
      address: c.address,
      reference_by: c.reference_by,
      created_at: c.created_at,
      booking_count: filteredBookings.length,
      total_billed,
      total_paid,
      balance_due: total_billed - total_paid,
      last_booking_date,
      bookings: bookings.sort((a, b) => b.booking_date?.localeCompare(a.booking_date ?? "") ?? 0),
    }
  })

  // Sort
  let sorted = enriched
  if (sort === "most_bookings") sorted = [...enriched].sort((a, b) => b.booking_count - a.booking_count)
  else if (sort === "highest_billed") sorted = [...enriched].sort((a, b) => b.total_billed - a.total_billed)
  else if (sort === "highest_due") sorted = [...enriched].sort((a, b) => b.balance_due - a.balance_due)
  else if (sort === "name") sorted = [...enriched].sort((a, b) => a.customer_name.localeCompare(b.customer_name))
  else sorted = [...enriched].sort((a, b) => (b.last_booking_date ?? "").localeCompare(a.last_booking_date ?? ""))

  const totals = {
    total_customers: sorted.length,
    total_billed: sorted.reduce((s, c) => s + c.total_billed, 0),
    total_paid: sorted.reduce((s, c) => s + c.total_paid, 0),
    balance_due: sorted.reduce((s, c) => s + c.balance_due, 0),
  }

  return NextResponse.json({ customers: sorted, totals })
}
