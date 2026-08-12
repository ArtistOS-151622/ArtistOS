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
  const sort = searchParams.get("sort") || "most_used"

  const supabase = await createClient()

  // Fetch all services with their usage via booking_services
  const { data: services, error } = await supabase
    .from("services")
    .select(`
      id,
      service_name,
      duration_minutes,
      price,
      created_at,
      booking_services(
        quantity,
        unit_price,
        booking:bookings(
          id,
          booking_date,
          status,
          customer:customers(id, customer_name, phone)
        )
      )
    `)
    .eq("user_id", session.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  const enriched = (services ?? []).map((svc) => {
    const usages = (svc.booking_services ?? []) as any[]

    // Filter by date range if provided
    const filteredUsages = (startDate && endDate)
      ? usages.filter(u => {
          const d = u.booking?.booking_date
          return d && d >= startDate && d <= endDate
        })
      : usages

    const usage_count = filteredUsages.length
    const total_revenue = filteredUsages.reduce((sum: number, u: any) => {
      return sum + ((u.unit_price ?? svc.price ?? 0) * (u.quantity ?? 1))
    }, 0)

    const recentBookings = filteredUsages
      .filter((u: any) => u.booking)
      .map((u: any) => ({
        booking_id: u.booking.id,
        booking_date: u.booking.booking_date,
        status: u.booking.status,
        quantity: u.quantity ?? 1,
        unit_price: u.unit_price ?? svc.price,
        customer_name: u.booking.customer?.customer_name ?? "Unknown",
        customer_phone: u.booking.customer?.phone ?? "",
      }))
      .sort((a: any, b: any) => b.booking_date?.localeCompare(a.booking_date ?? "") ?? 0)

    return {
      id: svc.id,
      service_name: svc.service_name,
      duration_minutes: svc.duration_minutes,
      price: svc.price,
      created_at: svc.created_at,
      usage_count,
      total_revenue,
      avg_price: usage_count > 0 ? total_revenue / usage_count : Number(svc.price),
      recent_bookings: recentBookings,
    }
  })

  // Apply search filter
  const filtered = search
    ? enriched.filter(s => s.service_name.toLowerCase().includes(search.toLowerCase()))
    : enriched

  // Sort
  let sorted = filtered
  if (sort === "most_revenue") sorted = [...filtered].sort((a, b) => b.total_revenue - a.total_revenue)
  else if (sort === "name") sorted = [...filtered].sort((a, b) => a.service_name.localeCompare(b.service_name))
  else if (sort === "price_high") sorted = [...filtered].sort((a, b) => Number(b.price) - Number(a.price))
  else sorted = [...filtered].sort((a, b) => b.usage_count - a.usage_count)

  const totals = {
    total_services: sorted.length,
    total_usage: sorted.reduce((s, svc) => s + svc.usage_count, 0),
    total_revenue: sorted.reduce((s, svc) => s + svc.total_revenue, 0),
  }

  return NextResponse.json({ services: sorted, totals })
}
