import { NextResponse, type NextRequest } from "next/server"
import { getArtistSession } from "@/lib/auth/session"
import { createClient } from "@/lib/supabase/server"

type CustomerRef = { id: number; customer_name: string; phone: string | null; email: string | null }
type BookingServiceRef = {
  quantity: number | null
  unit_price: number | null
  service: { id: number; service_name: string; price: number | null } | null
}
type ChargeRef = { id: number; charge_name: string; quantity: number | null; rate: number | null }
type PaymentRef = { id: number; amount: number | string | null; payment_type: string; payment_date: string }

type BookingRef = {
  id: number
  booking_date: string
  status: string
  discount: number | string | null
  customer: CustomerRef | null
  booking_services: BookingServiceRef[] | null
  booking_additional_charges: ChargeRef[] | null
}

type PaymentRow = {
  id: number
  payment_type: string
  payment_method: string
  amount: number | string
  payment_date: string
  remark: string | null
  created_at: string
  booking: BookingRef | null
}

type BookingWithPayments = BookingRef & { booking_payments: PaymentRef[] | null }

const BOOKING_FIELDS = `
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
`

/** Services + additional charges - discount. */
function totalBilled(booking: BookingRef | null) {
  const serviceTotal = (booking?.booking_services ?? []).reduce(
    (sum, s) => sum + (s.unit_price ?? s.service?.price ?? 0) * (s.quantity ?? 1),
    0,
  )
  const chargesTotal = (booking?.booking_additional_charges ?? []).reduce(
    (sum, c) => sum + (c.rate ?? 0) * (c.quantity ?? 1),
    0,
  )
  return serviceTotal + chargesTotal - Number(booking?.discount ?? 0)
}

function serviceNames(booking: BookingRef | null) {
  return (booking?.booking_services ?? []).map((s) => s.service?.service_name ?? "").filter(Boolean)
}

/** Same search rule for payments and pending bookings: customer name or a service name. */
function matchesSearch(search: string, customerName: string, services: string[]) {
  if (!search) return true
  const needle = search.toLowerCase()
  return customerName.toLowerCase().includes(needle) || services.some((s) => s.toLowerCase().includes(needle))
}

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
      booking:bookings(${BOOKING_FIELDS})
    `)
    .eq("user_id", session.id)
    .order("payment_date", { ascending: false })

  if (startDate && endDate) {
    paymentQuery = paymentQuery.gte("payment_date", startDate).lte("payment_date", endDate)
  }
  if (paymentType !== "all") {
    paymentQuery = paymentQuery.eq("payment_type", paymentType)
  }

  // Bookings with a balance due. Needed in both views: the "Pending" stat card
  // and the tab badge always show its total and count.
  const pendingQuery = supabase
    .from("bookings")
    .select(`${BOOKING_FIELDS}, booking_payments(id, amount, payment_type, payment_date)`)
    .eq("user_id", session.id)
    .neq("status", "cancelled")
    .order("booking_date", { ascending: false })

  // The two queries are independent: run them together (was one after the other)
  const [paymentsRes, pendingRes] = await Promise.all([paymentQuery, pendingQuery])

  if (paymentsRes.error) return NextResponse.json({ error: paymentsRes.error.message }, { status: 400 })
  if (pendingRes.error) return NextResponse.json({ error: pendingRes.error.message }, { status: 400 })

  const payments = ((paymentsRes.data ?? []) as unknown as PaymentRow[])
    .map((p) => {
      const booking = p.booking
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
        customer_name: booking?.customer?.customer_name ?? "",
        customer_phone: booking?.customer?.phone ?? "",
        customer_email: booking?.customer?.email ?? "",
        services: serviceNames(booking),
        total_billed: totalBilled(booking),
      }
    })
    .filter((p) => matchesSearch(search, p.customer_name, p.services))

  const pendingBookings = ((pendingRes.data ?? []) as unknown as BookingWithPayments[])
    .map((b) => {
      const pmts = b.booking_payments ?? []
      const total_billed = totalBilled(b)
      const total_paid = pmts.reduce((sum, p) => sum + Number(p.amount ?? 0), 0)
      return {
        booking_id: b.id,
        booking_date: b.booking_date,
        booking_status: b.status,
        customer_name: b.customer?.customer_name ?? "",
        customer_phone: b.customer?.phone ?? "",
        customer_email: b.customer?.email ?? "",
        services: serviceNames(b),
        total_billed,
        total_paid,
        balance_due: total_billed - total_paid,
        payments: pmts,
      }
    })
    .filter((b) => b.balance_due > 0 && matchesSearch(search, b.customer_name, b.services))

  const sumAmounts = (list: typeof payments) => list.reduce((s, p) => s + p.amount, 0)

  const totals = {
    total_collected: sumAmounts(payments),
    total_advance: sumAmounts(payments.filter((p) => p.payment_type === "Advance")),
    total_installment: sumAmounts(payments.filter((p) => p.payment_type === "Installment")),
    total_final: sumAmounts(payments.filter((p) => p.payment_type === "Final Payment")),
    total_pending: pendingBookings.reduce((s, b) => s + b.balance_due, 0),
    pending_count: pendingBookings.length,
  }

  return NextResponse.json({
    payments,
    // The full list is only shown in the "pending" view; the other view uses just the totals
    pending_bookings: view === "pending" ? pendingBookings : [],
    totals,
  })
}
