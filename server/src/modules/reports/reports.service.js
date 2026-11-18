import { createDbClient } from "#src/integrations/supabase.js"
import { badRequest } from "#src/utils/api-error.js"

/*
 * Report aggregates for the Reports page. Rows are loaded per artist and summed
 * here (same as the Next.js routes). Query errors are 400 { error }, as before.
 */

const CUSTOMER_FIELDS = `
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
`

const SERVICE_FIELDS = `
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
`

const PAYMENT_BOOKING_FIELDS = `
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

const inRange = (date, startDate, endDate) => Boolean(date) && date >= startDate && date <= endDate
const byDateDesc = (a, b) => b.booking_date?.localeCompare(a.booking_date ?? "") ?? 0

/** Services + additional charges - discount. */
function totalBilled(booking) {
  const serviceTotal = (booking?.booking_services ?? []).reduce(
    (sum, s) => sum + (s.unit_price ?? s.service?.price ?? 0) * (s.quantity ?? 1),
    0
  )
  const chargesTotal = (booking?.booking_additional_charges ?? []).reduce(
    (sum, c) => sum + (c.rate ?? 0) * (c.quantity ?? 1),
    0
  )
  return serviceTotal + chargesTotal - Number(booking?.discount ?? 0)
}

const serviceNames = (booking) =>
  (booking?.booking_services ?? []).map((s) => s.service?.service_name ?? "").filter(Boolean)

/** Same rule for payments and pending bookings: customer name or a service name. */
function matchesSearch(search, customerName, services) {
  if (!search) return true
  const needle = search.toLowerCase()
  return customerName.toLowerCase().includes(needle) || services.some((s) => s.toLowerCase().includes(needle))
}

const CUSTOMER_SORTS = {
  __proto__: null,
  most_bookings: (a, b) => b.booking_count - a.booking_count,
  highest_billed: (a, b) => b.total_billed - a.total_billed,
  highest_due: (a, b) => b.balance_due - a.balance_due,
  name: (a, b) => a.customer_name.localeCompare(b.customer_name),
}
const recentFirst = (a, b) => (b.last_booking_date ?? "").localeCompare(a.last_booking_date ?? "")

/** sort: most_bookings | highest_billed | highest_due | name | default most recent booking. */
export async function customersReport(userId, { search, startDate, endDate, sort }) {
  let query = createDbClient().from("customers").select(CUSTOMER_FIELDS).eq("user_id", userId)
  if (search) {
    query = query.or(`customer_name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`)
  }

  const { data: customers, error } = await query
  if (error) throw badRequest(error.message)

  const enriched = (customers ?? []).map((c) => {
    const bookings = c.bookings ?? []
    const filteredBookings =
      startDate && endDate ? bookings.filter((b) => b.booking_date >= startDate && b.booking_date <= endDate) : bookings

    let total_billed = 0
    let total_paid = 0
    for (const b of filteredBookings) {
      total_billed += totalBilled(b)
      total_paid += (b.booking_payments ?? []).reduce((sum, p) => sum + Number(p.amount ?? 0), 0)
    }

    const allBookingDates = bookings.map((b) => b.booking_date).filter(Boolean)
    const last_booking_date = allBookingDates.length ? allBookingDates.sort().reverse()[0] : null

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
      bookings: bookings.sort(byDateDesc),
    }
  })

  const sorted = [...enriched].sort(CUSTOMER_SORTS[sort] ?? recentFirst)

  return {
    customers: sorted,
    totals: {
      total_customers: sorted.length,
      total_billed: sorted.reduce((s, c) => s + c.total_billed, 0),
      total_paid: sorted.reduce((s, c) => s + c.total_paid, 0),
      balance_due: sorted.reduce((s, c) => s + c.balance_due, 0),
    },
  }
}

const SERVICE_SORTS = {
  __proto__: null,
  most_revenue: (a, b) => b.total_revenue - a.total_revenue,
  name: (a, b) => a.service_name.localeCompare(b.service_name),
  price_high: (a, b) => Number(b.price) - Number(a.price),
}
const mostUsed = (a, b) => b.usage_count - a.usage_count

/** sort: most_revenue | name | price_high | default most used. */
export async function servicesReport(userId, { search, startDate, endDate, sort }) {
  const { data: services, error } = await createDbClient()
    .from("services")
    .select(SERVICE_FIELDS)
    .eq("user_id", userId)
  if (error) throw badRequest(error.message)

  const enriched = (services ?? []).map((svc) => {
    const usages = svc.booking_services ?? []
    const filteredUsages =
      startDate && endDate ? usages.filter((u) => inRange(u.booking?.booking_date, startDate, endDate)) : usages

    const usage_count = filteredUsages.length
    const total_revenue = filteredUsages.reduce((sum, u) => sum + (u.unit_price ?? svc.price ?? 0) * (u.quantity ?? 1), 0)

    const recent_bookings = filteredUsages
      .filter((u) => u.booking)
      .map((u) => ({
        booking_id: u.booking.id,
        booking_date: u.booking.booking_date,
        status: u.booking.status,
        quantity: u.quantity ?? 1,
        unit_price: u.unit_price ?? svc.price,
        customer_name: u.booking.customer?.customer_name ?? "Unknown",
        customer_phone: u.booking.customer?.phone ?? "",
      }))
      .sort(byDateDesc)

    return {
      id: svc.id,
      service_name: svc.service_name,
      duration_minutes: svc.duration_minutes,
      price: svc.price,
      created_at: svc.created_at,
      usage_count,
      total_revenue,
      avg_price: usage_count > 0 ? total_revenue / usage_count : Number(svc.price),
      recent_bookings,
    }
  })

  const filtered = search
    ? enriched.filter((s) => s.service_name.toLowerCase().includes(search.toLowerCase()))
    : enriched
  const sorted = [...filtered].sort(SERVICE_SORTS[sort] ?? mostUsed)

  return {
    services: sorted,
    totals: {
      total_services: sorted.length,
      total_usage: sorted.reduce((s, svc) => s + svc.usage_count, 0),
      total_revenue: sorted.reduce((s, svc) => s + svc.total_revenue, 0),
    },
  }
}

/** paymentType: "all" or a payment_type value. view: "pending" also returns the pending-bookings list. */
export async function paymentsReport(userId, { search, startDate, endDate, paymentType, view }) {
  const supabase = createDbClient()

  let paymentQuery = supabase
    .from("booking_payments")
    .select(
      `
      id,
      payment_type,
      payment_method,
      amount,
      payment_date,
      remark,
      created_at,
      booking:bookings(${PAYMENT_BOOKING_FIELDS})
    `
    )
    .eq("user_id", userId)
    .order("payment_date", { ascending: false })

  if (startDate && endDate) paymentQuery = paymentQuery.gte("payment_date", startDate).lte("payment_date", endDate)
  if (paymentType !== "all") paymentQuery = paymentQuery.eq("payment_type", paymentType)

  // Bookings with a balance due. Needed in both views: the "Pending" stat card and
  // the tab badge always show its total and count.
  const pendingQuery = supabase
    .from("bookings")
    .select(`${PAYMENT_BOOKING_FIELDS}, booking_payments(id, amount, payment_type, payment_date)`)
    .eq("user_id", userId)
    .neq("status", "cancelled")
    .order("booking_date", { ascending: false })

  const [paymentsRes, pendingRes] = await Promise.all([paymentQuery, pendingQuery])
  if (paymentsRes.error) throw badRequest(paymentsRes.error.message)
  if (pendingRes.error) throw badRequest(pendingRes.error.message)

  const payments = (paymentsRes.data ?? [])
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

  const pendingBookings = (pendingRes.data ?? [])
    .map((b) => {
      const pmts = b.booking_payments ?? []
      const billed = totalBilled(b)
      const paid = pmts.reduce((sum, p) => sum + Number(p.amount ?? 0), 0)
      return {
        booking_id: b.id,
        booking_date: b.booking_date,
        booking_status: b.status,
        customer_name: b.customer?.customer_name ?? "",
        customer_phone: b.customer?.phone ?? "",
        customer_email: b.customer?.email ?? "",
        services: serviceNames(b),
        total_billed: billed,
        total_paid: paid,
        balance_due: billed - paid,
        payments: pmts,
      }
    })
    .filter((b) => b.balance_due > 0 && matchesSearch(search, b.customer_name, b.services))

  const sumAmounts = (list) => list.reduce((s, p) => s + p.amount, 0)
  const ofType = (type) => payments.filter((p) => p.payment_type === type)

  return {
    payments,
    // The full list is only shown in the "pending" view; the other view uses just the totals.
    pending_bookings: view === "pending" ? pendingBookings : [],
    totals: {
      total_collected: sumAmounts(payments),
      total_advance: sumAmounts(ofType("Advance")),
      total_installment: sumAmounts(ofType("Installment")),
      total_final: sumAmounts(ofType("Final Payment")),
      total_pending: pendingBookings.reduce((s, b) => s + b.balance_due, 0),
      pending_count: pendingBookings.length,
    },
  }
}
