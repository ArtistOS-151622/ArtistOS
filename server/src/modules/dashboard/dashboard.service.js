import { createDbClient } from "#src/integrations/supabase.js"
import { ApiError } from "#src/utils/api-error.js"

const FILLS = ["#7c3aed", "#a7d99b", "#8dccf2", "#ffd18a", "#bfc6ff", "#dfe5ee"]
const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
const TREND_DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"]

/** The app's users are in India: all "today"/"this month" logic uses IST, not the server's timezone. */
const APP_TIME_ZONE = "Asia/Kolkata"

const BOOKING_FIELDS = `
  id,
  customer_id,
  booking_date,
  start_time,
  status,
  discount,
  booking_services(
    quantity,
    unit_price,
    service:services(service_name, price)
  ),
  booking_additional_charges(
    quantity,
    rate
  )
`

const UPCOMING_FIELDS = `
  id,
  booking_date,
  start_time,
  customer:customers(customer_name, phone, email),
  booking_services(service:services(service_name))
`

function formatBookingTime(dateStr, timeStr) {
  try {
    const [year, month, day] = dateStr.split("-").map(Number)
    const [hours, minutes] = timeStr.split(":").map(Number)
    return new Date(year, month - 1, day, hours, minutes).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
  } catch {
    return `${dateStr} ${timeStr}`
  }
}

/** YYYY-MM-DD for the given instant, in IST. */
const toIstDateStr = (date) => date.toLocaleDateString("en-CA", { timeZone: APP_TIME_ZONE })

/** Year and 0-indexed month of a YYYY-MM-DD string, read directly (no timezone conversion). */
function bookingYM(dateStr) {
  const [year, month] = dateStr.split("-").map(Number)
  return { year, month: month - 1 }
}

/** Services + additional charges - discount. */
function bookingPrice(b) {
  const servicesTotal =
    b.booking_services?.reduce(
      (sum, bs) => sum + Number(bs.unit_price ?? bs.service?.price ?? 0) * Number(bs.quantity || 1),
      0
    ) || 0
  const chargesTotal =
    b.booking_additional_charges?.reduce((sum, c) => sum + Number(c.rate || 0) * Number(c.quantity || 1), 0) || 0
  return servicesTotal + chargesTotal - Number(b.discount || 0)
}

const isEarning = (b) => b.status === "completed" || b.status === "confirmed"
const uniqueClients = (list) => new Set(list.map((b) => b.customer_id)).size

function growthLabel(current, previous, firstLabel) {
  if (previous > 0) {
    const growth = ((current - previous) / previous) * 100
    return `${growth >= 0 ? "+" : ""}${growth.toFixed(0)}% this month`
  }
  return current > 0 ? firstLabel : "0% MoM"
}

/** Everything the dashboard page shows, for the logged-in artist. */
export async function getDashboard(session) {
  const supabase = createDbClient()
  const userId = session.id

  const todayStr = toIstDateStr(new Date())
  const { year: currentYear, month: currentMonth } = bookingYM(todayStr) // month 0-indexed
  const prevMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear
  const prevMonth = currentMonth === 0 ? 12 : currentMonth // 1-indexed
  const prevMonthStr = `${prevMonthYear}-${String(prevMonth).padStart(2, "0")}-01`
  const endOfYearStr = `${currentYear}-12-31`

  const [bookingsRes, upcomingRes, totalCustomersRes, completedCountRes, cancelledCountRes] = await Promise.all([
    // Current year + previous month (for month-over-month figures).
    supabase
      .from("bookings")
      .select(BOOKING_FIELDS)
      .eq("user_id", userId)
      .gte("booking_date", prevMonthStr)
      .lte("booking_date", endOfYearStr),
    supabase
      .from("bookings")
      .select(UPCOMING_FIELDS)
      .eq("user_id", userId)
      .gte("booking_date", todayStr)
      .neq("status", "cancelled")
      .neq("status", "completed")
      .order("booking_date", { ascending: true })
      .order("start_time", { ascending: true })
      .limit(3),
    supabase.from("customers").select("id", { count: "exact", head: true }).eq("user_id", userId),
    // Lifetime completed / cancelled counts for the satisfaction rate (counts only).
    supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "completed"),
    supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "cancelled"),
  ])

  if (bookingsRes.error) throw new ApiError(500, bookingsRes.error.message || "Failed to load dashboard data")

  const bookings = bookingsRes.data ?? []
  const lm = currentMonth === 0 ? 11 : currentMonth - 1
  const ly = currentMonth === 0 ? currentYear - 1 : currentYear
  const inMonth = (year, month) => (b) => {
    const d = bookingYM(b.booking_date)
    return d.year === year && d.month === month
  }

  const currentMonthBookings = bookings.filter(inMonth(currentYear, currentMonth))
  const lastMonthBookings = bookings.filter(inMonth(ly, lm))

  // Revenue
  const sumRevenue = (list) => list.filter(isEarning).reduce((sum, b) => sum + bookingPrice(b), 0)
  const currentMonthRevenue = sumRevenue(currentMonthBookings)
  const lastMonthRevenue = sumRevenue(lastMonthBookings)
  const revenueGrowthStr = growthLabel(currentMonthRevenue, lastMonthRevenue, "New revenue this month")

  // Clients
  const currentMonthClients = uniqueClients(currentMonthBookings)
  const lastMonthClients = uniqueClients(lastMonthBookings)
  const clientsGrowthStr = growthLabel(currentMonthClients, lastMonthClients, "New clients this month")
  const totalActiveClients = totalCustomersRes.count ?? uniqueClients(bookings)

  // Bookings
  const bookingsGrowthStr = growthLabel(
    currentMonthBookings.length,
    lastMonthBookings.length,
    "First bookings this month"
  )

  // Satisfaction rate
  const completedCount = completedCountRes.count ?? 0
  const cancelledCount = cancelledCountRes.count ?? 0
  const totalEnded = completedCount + cancelledCount
  const satisfactionRate = totalEnded > 0 ? Math.round((completedCount / totalEnded) * 100) : 100

  // Monthly appointments (Jan - Dec of the current year)
  const appointmentChartData = MONTHS_SHORT.map((month, index) => {
    const monthBookings = bookings.filter(inMonth(currentYear, index))
    const countStatus = (status) => monthBookings.filter((b) => b.status === status).length
    return {
      month,
      total: monthBookings.length,
      completed: countStatus("completed"),
      confirmed: countStatus("confirmed"),
      pending: countStatus("pending"),
      cancelled: countStatus("cancelled"),
    }
  })

  // Revenue split by service (current year)
  const serviceRevenueMap = {}
  let totalRevenueSum = 0
  for (const b of bookings) {
    if (bookingYM(b.booking_date).year !== currentYear || !isEarning(b)) continue
    for (const bs of b.booking_services ?? []) {
      const price = Number(bs.unit_price ?? bs.service?.price ?? 0) * Number(bs.quantity || 1)
      const name = bs.service?.service_name || "Unknown Service"
      serviceRevenueMap[name] = (serviceRevenueMap[name] || 0) + price
      totalRevenueSum += price
    }
  }

  let revenueData = Object.entries(serviceRevenueMap)
    .map(([name, value]) => ({
      name,
      value: totalRevenueSum > 0 ? Math.round((value / totalRevenueSum) * 100) : 0,
      amount: value,
    }))
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value)
    .map((item, idx) => ({ ...item, fill: FILLS[idx % FILLS.length] }))

  if (revenueData.length === 0) {
    revenueData = [{ name: "No data available", value: 100, amount: 0, fill: "#dfe5ee" }]
  }

  // Today
  const todayBookings = bookings.filter((b) => b.booking_date === todayStr && b.status !== "cancelled")
  const countToday = (status) => todayBookings.filter((b) => b.status === status).length

  // Upcoming clients
  const upcomingClients = (upcomingRes.data ?? []).map((b) => {
    const customer = Array.isArray(b.customer) ? b.customer[0] : b.customer
    const services = b.booking_services?.map((bs) => bs.service?.service_name).filter(Boolean) || []
    return {
      id: b.id,
      name: customer?.customer_name || "Unknown Client",
      service: services.length > 0 ? services.join(", ") : "No services selected",
      time: formatBookingTime(b.booking_date, b.start_time),
      artist: session.artist_name || "Artist Studio",
      phone: customer?.phone || "",
      email: customer?.email || "",
    }
  })

  // Mini 6-day trends (0.1 instead of 0 so the sparklines still draw)
  const miniTrends = { clients: [], bookings: [], revenue: [], satisfaction: [] }
  for (let i = 5; i >= 0; i--) {
    // Step back from today's IST date with UTC arithmetic on the date string itself.
    const day = new Date(`${todayStr}T00:00:00Z`)
    day.setUTCDate(day.getUTCDate() - i)
    const label = TREND_DAY_LABELS[day.getUTCDay()]
    const dStr = day.toISOString().split("T")[0]
    const dayBookings = bookings.filter((b) => b.booking_date === dStr)

    miniTrends.clients.push({ label, value: uniqueClients(dayBookings) || 0.1 })
    miniTrends.bookings.push({ label, value: dayBookings.length || 0.1 })
    miniTrends.revenue.push({ label, value: sumRevenue(dayBookings) || 0.1 })
    miniTrends.satisfaction.push({
      label,
      value: dayBookings.filter((b) => b.status === "completed").length || 0.1,
    })
  }

  return {
    artist_name: session.artist_name || "Artist",
    today: {
      dateStr: todayStr,
      total: todayBookings.length,
      pending: countToday("pending"),
      confirmed: countToday("confirmed"),
      completed: countToday("completed"),
    },
    metrics: {
      activeClients: { value: totalActiveClients.toLocaleString(), change: clientsGrowthStr },
      newBookings: { value: `+${currentMonthBookings.length}`, change: bookingsGrowthStr },
      revenue: { value: `₹${currentMonthRevenue.toLocaleString()}`, change: revenueGrowthStr },
      satisfaction: {
        value: `${satisfactionRate}%`,
        change: `${completedCount} completed vs ${cancelledCount} cancelled`,
      },
    },
    miniTrends,
    appointmentChartData,
    revenueData,
    totalRevenueSum,
    upcomingClients,
  }
}
