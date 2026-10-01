import { NextResponse, type NextRequest } from "next/server"
import { getArtistSession } from "@/lib/auth/session"
import { createClient } from "@/lib/supabase/server"

function formatBookingTime(dateStr: string, timeStr: string) {
  try {
    const [year, month, day] = dateStr.split("-").map(Number)
    const [hours, minutes] = timeStr.split(":").map(Number)
    const dateObj = new Date(year, month - 1, day, hours, minutes)

    const options: Intl.DateTimeFormatOptions = {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }

    return dateObj.toLocaleDateString("en-US", options)
  } catch {
    return `${dateStr} ${timeStr}`
  }
}

const fills = [
  "#7c3aed",
  "#a7d99b",
  "#8dccf2",
  "#ffd18a",
  "#bfc6ff",
  "#dfe5ee",
]

const monthsShort = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
]

export async function GET(request: NextRequest) {
  const session = getArtistSession(request)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const supabase = await createClient()

    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth() // 0-indexed: 0 = Jan, 11 = Dec

    // Date strings
    const todayStr = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" })
    const prevMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear
    const prevMonth = currentMonth === 0 ? 12 : currentMonth // 1-indexed
    const prevMonthStr = `${prevMonthYear}-${String(prevMonth).padStart(2, "0")}-01`
    const endOfYearStr = `${currentYear}-12-31`

    // Execute queries in parallel
    const [bookingsRes, upcomingRes, totalCustomersRes, satisfactionRes] = await Promise.all([
      // 1. Bookings for current year + previous month for MoM calculations
      supabase
        .from("bookings")
        .select(`
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
        `)
        .eq("user_id", session.id)
        .gte("booking_date", prevMonthStr)
        .lte("booking_date", endOfYearStr),

      // 2. Upcoming 3 clients (limit 3 directly at the database level)
      supabase
        .from("bookings")
        .select(`
          id,
          booking_date,
          start_time,
          customer:customers(customer_name, phone, email),
          booking_services(service:services(service_name))
        `)
        .eq("user_id", session.id)
        .gte("booking_date", todayStr)
        .neq("status", "cancelled")
        .neq("status", "completed")
        .order("booking_date", { ascending: true })
        .order("start_time", { ascending: true })
        .limit(3),

      // 3. Total unique customers count (head: true for 0 bytes data transfer)
      supabase
        .from("customers")
        .select("id", { count: "exact", head: true })
        .eq("user_id", session.id),

      // 4. All-time completed/cancelled bookings for lifetime satisfaction rate
      supabase
        .from("bookings")
        .select("status")
        .eq("user_id", session.id)
        .in("status", ["completed", "cancelled"]),
    ])

    if (bookingsRes.error) {
      throw new Error(bookingsRes.error.message)
    }

    const bookings = bookingsRes.data ?? []

    // Helper: calculate total revenue of a booking
    const getBookingPrice = (b: any) => {
      const servicesTotal =
        b.booking_services?.reduce(
          (sum: number, bs: any) =>
            sum + Number(bs.unit_price ?? bs.service?.price ?? 0) * Number(bs.quantity || 1),
          0,
        ) || 0
      const additionalChargesTotal =
        b.booking_additional_charges?.reduce(
          (sum: number, c: any) =>
            sum + Number(c.rate || 0) * Number(c.quantity || 1),
          0,
        ) || 0
      const discount = Number(b.discount || 0)
      return servicesTotal + additionalChargesTotal - discount
    }

    // 1. Revenue calculations
    const currentMonthRevenue = bookings
      .filter((b: any) => {
        const d = new Date(b.booking_date)
        return (
          d.getFullYear() === currentYear &&
          d.getMonth() === currentMonth &&
          (b.status === "completed" || b.status === "confirmed")
        )
      })
      .reduce((sum: number, b: any) => sum + getBookingPrice(b), 0)

    const lm = currentMonth === 0 ? 11 : currentMonth - 1
    const ly = currentMonth === 0 ? currentYear - 1 : currentYear

    const lastMonthRevenue = bookings
      .filter((b: any) => {
        const d = new Date(b.booking_date)
        return (
          d.getFullYear() === ly &&
          d.getMonth() === lm &&
          (b.status === "completed" || b.status === "confirmed")
        )
      })
      .reduce((sum: number, b: any) => sum + getBookingPrice(b), 0)

    let revenueGrowthStr = "0% MoM"
    if (lastMonthRevenue > 0) {
      const growth = ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
      revenueGrowthStr = `${growth >= 0 ? "+" : ""}${growth.toFixed(0)}% this month`
    } else if (currentMonthRevenue > 0) {
      revenueGrowthStr = "New revenue this month"
    }

    // 2. Client counts and growth
    const getActiveClients = (list: any[]) =>
      new Set(list.map((b) => b.customer_id)).size

    const currentMonthClients = getActiveClients(
      bookings.filter((b: any) => {
        const d = new Date(b.booking_date)
        return d.getFullYear() === currentYear && d.getMonth() === currentMonth
      }),
    )

    const lastMonthClients = getActiveClients(
      bookings.filter((b: any) => {
        const d = new Date(b.booking_date)
        return d.getFullYear() === ly && d.getMonth() === lm
      }),
    )

    let clientsGrowthStr = "0% MoM"
    if (lastMonthClients > 0) {
      const growth = ((currentMonthClients - lastMonthClients) / lastMonthClients) * 100
      clientsGrowthStr = `${growth >= 0 ? "+" : ""}${growth.toFixed(0)}% this month`
    } else if (currentMonthClients > 0) {
      clientsGrowthStr = "New clients this month"
    }

    // Total active clients: use total customers count or fallback to unique in bookings
    const totalActiveClients = totalCustomersRes.count ?? getActiveClients(bookings)

    // 3. New bookings count and growth
    const currentMonthBookings = bookings.filter((b: any) => {
      const d = new Date(b.booking_date)
      return d.getFullYear() === currentYear && d.getMonth() === currentMonth
    })

    const lastMonthBookings = bookings.filter((b: any) => {
      const d = new Date(b.booking_date)
      return d.getFullYear() === ly && d.getMonth() === lm
    })

    let bookingsGrowthStr = "0% MoM"
    if (lastMonthBookings.length > 0) {
      const growth =
        ((currentMonthBookings.length - lastMonthBookings.length) /
          lastMonthBookings.length) *
        100
      bookingsGrowthStr = `${growth >= 0 ? "+" : ""}${growth.toFixed(0)}% this month`
    } else if (currentMonthBookings.length > 0) {
      bookingsGrowthStr = "First bookings this month"
    }

    // 4. Satisfaction rate
    const statusData = satisfactionRes.data ?? []
    const completedCount = statusData.filter((b) => b.status === "completed").length
    const cancelledCount = statusData.filter((b) => b.status === "cancelled").length
    const totalEnded = completedCount + cancelledCount
    const satisfactionRate = totalEnded > 0 ? Math.round((completedCount / totalEnded) * 100) : 100

    // 5. Monthly appointments data (Jan - Dec of current year)
    const appointmentChartData = monthsShort.map((month, index) => {
      const monthBookings = bookings.filter((b: any) => {
        const d = new Date(b.booking_date)
        return d.getFullYear() === currentYear && d.getMonth() === index
      })
      const total = monthBookings.length
      const completed = monthBookings.filter((b: any) => b.status === "completed").length
      const confirmed = monthBookings.filter((b: any) => b.status === "confirmed").length
      const pending = monthBookings.filter((b: any) => b.status === "pending").length
      const cancelled = monthBookings.filter((b: any) => b.status === "cancelled").length
      return { month, total, completed, confirmed, pending, cancelled }
    })

    // 6. Service distribution revenue data
    const serviceRevenueMap: Record<string, number> = {}
    let totalRevenueSum = 0

    bookings.forEach((b: any) => {
      const d = new Date(b.booking_date)
      if (d.getFullYear() === currentYear && (b.status === "completed" || b.status === "confirmed")) {
        b.booking_services?.forEach((bs: any) => {
          const price = Number(bs.unit_price ?? bs.service?.price ?? 0) * Number(bs.quantity || 1)
          const name = bs.service?.service_name || "Unknown Service"
          serviceRevenueMap[name] = (serviceRevenueMap[name] || 0) + price
          totalRevenueSum += price
        })
      }
    })

    const rawRevenueData = Object.entries(serviceRevenueMap)
      .map(([name, value]) => {
        const pct = totalRevenueSum > 0 ? Math.round((value / totalRevenueSum) * 100) : 0
        return { name, value: pct, amount: value }
      })
      .filter((item) => item.value > 0)
      .sort((a, b) => b.value - a.value)

    let revenueData = rawRevenueData.map((item, idx) => ({
      ...item,
      fill: fills[idx % fills.length],
    }))

    if (revenueData.length === 0) {
      revenueData = [{ name: "No data available", value: 100, amount: 0, fill: "#dfe5ee" }]
    }

    // 7. Today's bookings
    const todayBookings = bookings.filter(
      (b: any) => b.booking_date === todayStr && b.status !== "cancelled",
    )
    const pendingToday = todayBookings.filter((b: any) => b.status === "pending").length
    const confirmedToday = todayBookings.filter((b: any) => b.status === "confirmed").length
    const completedToday = todayBookings.filter((b: any) => b.status === "completed").length

    // 8. Upcoming clients
    const upcomingClients = (upcomingRes.data ?? []).map((b: any) => {
      const customer = Array.isArray(b.customer) ? b.customer[0] : b.customer
      const services = b.booking_services?.map((bs: any) => bs.service?.service_name).filter(Boolean) || []
      return {
        name: customer?.customer_name || "Unknown Client",
        service: services.length > 0 ? services.join(", ") : "No services selected",
        time: formatBookingTime(b.booking_date, b.start_time),
        artist: session.artist_name || "Artist Studio",
        phone: customer?.phone || "",
        email: customer?.email || "",
      }
    })

    // 9. Mini 6-day trends
    const days = ["S", "M", "T", "W", "T", "F", "S"]
    const miniTrends = {
      clients: [] as { label: string; value: number }[],
      bookings: [] as { label: string; value: number }[],
      revenue: [] as { label: string; value: number }[],
      satisfaction: [] as { label: string; value: number }[],
    }

    for (let i = 5; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const label = days[d.getDay()]
      const dStr = d.toISOString().split("T")[0]

      const dayBookings = bookings.filter((b: any) => b.booking_date === dStr)

      const clientsVal = new Set(dayBookings.map((b: any) => b.customer_id)).size
      const bookingsVal = dayBookings.length
      const revenueVal = dayBookings
        .filter((b: any) => b.status === "completed" || b.status === "confirmed")
        .reduce((sum: number, b: any) => sum + getBookingPrice(b), 0)
      const compVal = dayBookings.filter((b: any) => b.status === "completed").length

      miniTrends.clients.push({ label, value: clientsVal || 0.1 })
      miniTrends.bookings.push({ label, value: bookingsVal || 0.1 })
      miniTrends.revenue.push({ label, value: revenueVal || 0.1 })
      miniTrends.satisfaction.push({ label, value: compVal || 0.1 })
    }

    return NextResponse.json({
      artist_name: session.artist_name || "Artist",
      today: {
        dateStr: todayStr,
        total: todayBookings.length,
        pending: pendingToday,
        confirmed: confirmedToday,
        completed: completedToday,
      },
      metrics: {
        activeClients: {
          value: totalActiveClients.toLocaleString(),
          change: clientsGrowthStr,
        },
        newBookings: {
          value: `+${currentMonthBookings.length}`,
          change: bookingsGrowthStr,
        },
        revenue: {
          value: `₹${currentMonthRevenue.toLocaleString()}`,
          change: revenueGrowthStr,
        },
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
    })
  } catch (error: any) {
    console.error("Dashboard data load error:", error)
    return NextResponse.json(
      { error: error?.message || "Failed to load dashboard data" },
      { status: 500 },
    )
  }
}
