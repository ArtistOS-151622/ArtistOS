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
  const paymentType = searchParams.get("payment_type") || "all"
  const view = searchParams.get("view") || "all" // "all" | "pending"

  const supabase = await createClient()

  // Fetch all payments with full booking + customer + service details
  let paymentQuery = supabase
    .from("booking_payments")
    .select(`
      id,
      payment_type,
      payment_method,
      amount,
      payment_date,
      remark,
      created_at,
      booking:bookings(
        id,
        booking_date,
        status,
        discount,
        customer:customers(id, customer_name, phone, email),
        booking_services(
          quantity,
          unit_price,
          service:services(id, service_name, price)
        ),
        booking_additional_charges(id, charge_name, quantity, rate)
      )
    `)
    .eq("user_id", session.id)
    .order("payment_date", { ascending: false })

  if (startDate && endDate) {
    paymentQuery = paymentQuery.gte("payment_date", startDate).lte("payment_date", endDate)
  }

  if (paymentType !== "all") {
    paymentQuery = paymentQuery.eq("payment_type", paymentType)
  }

  const { data: payments, error: paymentError } = await paymentQuery

  if (paymentError) return NextResponse.json({ error: paymentError.message }, { status: 400 })

  // Enrich with billed total + balance per booking
  const enrichedPayments = (payments ?? []).map((p) => {
    const booking = p.booking as any
    const services = (booking?.booking_services ?? []) as any[]
    const charges = (booking?.booking_additional_charges ?? []) as any[]

    const serviceTotal = services.reduce((sum: number, s: any) =>
      sum + ((s.unit_price ?? s.service?.price ?? 0) * (s.quantity ?? 1)), 0)
    const chargesTotal = charges.reduce((sum: number, c: any) =>
      sum + ((c.rate ?? 0) * (c.quantity ?? 1)), 0)
    const discount = Number(booking?.discount ?? 0)
    const total_billed = serviceTotal + chargesTotal - discount

    const serviceNames = services.map((s: any) => s.service?.service_name ?? "").filter(Boolean)

    // Filter by search on customer name
    const customerName = booking?.customer?.customer_name ?? ""

    return {
      id: p.id,
      payment_type: p.payment_type,
      payment_method: p.payment_method,
      amount: Number(p.amount),
      payment_date: p.payment_date,
      remark: p.remark,
      created_at: p.created_at,
      booking_id: booking?.id,
      booking_date: booking?.booking_date,
      booking_status: booking?.status,
      customer_name: customerName,
      customer_phone: booking?.customer?.phone ?? "",
      customer_email: booking?.customer?.email ?? "",
      services: serviceNames,
      total_billed,
    }
  })

  // Apply search filter
  const filtered = search
    ? enrichedPayments.filter(p =>
        p.customer_name.toLowerCase().includes(search.toLowerCase()) ||
        p.services.some(s => s.toLowerCase().includes(search.toLowerCase()))
      )
    : enrichedPayments

  // Build pending bookings report: bookings where total_paid < total_billed
  // Need to query bookings separately for pending view
  let pendingBookings: any[] = []
  if (view === "pending" || !search) {
    const { data: allBookings } = await supabase
      .from("bookings")
      .select(`
        id,
        booking_date,
        status,
        discount,
        customer:customers(id, customer_name, phone, email),
        booking_services(
          quantity,
          unit_price,
          service:services(id, service_name, price)
        ),
        booking_additional_charges(id, charge_name, quantity, rate),
        booking_payments(id, amount, payment_type, payment_date)
      `)
      .eq("user_id", session.id)
      .neq("status", "cancelled")
      .order("booking_date", { ascending: false })

    pendingBookings = (allBookings ?? [])
      .map((b: any) => {
        const services = (b.booking_services ?? []) as any[]
        const charges = (b.booking_additional_charges ?? []) as any[]
        const pmts = (b.booking_payments ?? []) as any[]

        const serviceTotal = services.reduce((sum: number, s: any) =>
          sum + ((s.unit_price ?? s.service?.price ?? 0) * (s.quantity ?? 1)), 0)
        const chargesTotal = charges.reduce((sum: number, c: any) =>
          sum + ((c.rate ?? 0) * (c.quantity ?? 1)), 0)
        const discount = Number(b.discount ?? 0)
        const total_billed = serviceTotal + chargesTotal - discount
        const total_paid = pmts.reduce((sum: number, p: any) => sum + Number(p.amount ?? 0), 0)
        const balance_due = total_billed - total_paid

        return {
          booking_id: b.id,
          booking_date: b.booking_date,
          booking_status: b.status,
          customer_name: b.customer?.customer_name ?? "",
          customer_phone: b.customer?.phone ?? "",
          customer_email: b.customer?.email ?? "",
          services: services.map((s: any) => s.service?.service_name ?? "").filter(Boolean),
          total_billed,
          total_paid,
          balance_due,
          payments: pmts,
        }
      })
      .filter((b: any) => b.balance_due > 0)
  }

  const totals = {
    total_collected: filtered.reduce((s, p) => s + p.amount, 0),
    total_advance: filtered.filter(p => p.payment_type === "Advance").reduce((s, p) => s + p.amount, 0),
    total_installment: filtered.filter(p => p.payment_type === "Installment").reduce((s, p) => s + p.amount, 0),
    total_final: filtered.filter(p => p.payment_type === "Final Payment").reduce((s, p) => s + p.amount, 0),
    total_pending: pendingBookings.reduce((s, b) => s + b.balance_due, 0),
    pending_count: pendingBookings.length,
  }

  return NextResponse.json({
    payments: filtered,
    pending_bookings: pendingBookings,
    totals,
  })
}
