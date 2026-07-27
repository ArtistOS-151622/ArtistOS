"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  CalendarDays,
  CircleDollarSign,
  Command,
  HeartHandshake,
  MoreVertical,
  Phone,
  TrendingUp,
  UsersRound,
} from "lucide-react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
} from "recharts"

import { PageHeader } from "@/components/common/dashboard/dashboard-header-context"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { Separator } from "@/components/ui/separator"
import { AppLoader } from "@/components/common/shared/app-loader"

const appointmentChartConfig = {
  total: {
    label: "Total",
    color: "#e9edf4",
  },
  completed: {
    label: "Completed",
    color: "#a9d99b",
  },
} satisfies ChartConfig

const miniChartConfig = {
  value: {
    label: "Activity",
    color: "#a9d99b",
  },
} satisfies ChartConfig

const revenueChartConfig = {
  value: {
    label: "Revenue",
  },
} satisfies ChartConfig

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
      hour12: true
    }
    
    return dateObj.toLocaleDateString("en-US", options)
  } catch {
    return `${dateStr} ${timeStr}`
  }
}

export default function DashboardPage() {
  const [bookings, setBookings] = useState<any[]>([])
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    async function loadDashboardData() {
      try {
        setLoading(true)
        setError("")

        // Fetch user profile info
        const profileRes = await fetch("/api/auth/me")
        if (profileRes.ok) {
          const profileData = await profileRes.json()
          setProfile(profileData?.user || null)
        }

        // Fetch bookings for the current year
        const currentYear = new Date().getFullYear()
        const start = `${currentYear - 1}-01-01`
        const end = `${currentYear + 1}-12-31`
        
        const bookingsRes = await fetch(`/api/bookings?start_date=${start}&end_date=${end}`)
        if (!bookingsRes.ok) {
          throw new Error("Failed to load dashboard data.")
        }
        
        const bookingsData = await bookingsRes.json()
        setBookings(bookingsData.bookings || [])
      } catch (err: any) {
        setError(err.message || "An error occurred while loading dashboard data.")
      } finally {
        setLoading(false)
      }
    }

    void loadDashboardData()
  }, [])

  if (loading) {
    return (
      <>
        <PageHeader title="Dashboard" />
        <AppLoader label="Loading your dashboard..." className="min-h-[52vh] rounded-[2rem] bg-white/45" />
      </>
    )
  }

  if (error) {
    return (
      <>
        <PageHeader title="Dashboard" />
        <div className="flex h-96 flex-col items-center justify-center rounded-2xl bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-red-500">{error}</p>
          <Button onClick={() => window.location.reload()} className="mt-4">
            Try again
          </Button>
        </div>
      </>
    )
  }

  // Calculate dynamic stats
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth()

  const getBookingPrice = (b: any) => {
    const servicesTotal = b.services?.reduce((sum: number, s: any) => sum + (Number(s.price || 0) * Number(s.quantity || 1)), 0) || 0
    const additionalChargesTotal = b.additional_charges?.reduce((sum: number, c: any) => sum + (Number(c.rate || 0) * Number(c.quantity || 1)), 0) || 0
    const discount = b.discount || 0
    return servicesTotal + additionalChargesTotal - discount
  }

  // 1. Revenue this month
  const currentMonthRevenue = bookings
    .filter((b: any) => {
      const d = new Date(b.booking_date)
      return d.getFullYear() === currentYear && d.getMonth() === currentMonth && (b.status === "completed" || b.status === "confirmed")
    })
    .reduce((sum: number, b: any) => sum + getBookingPrice(b), 0)

  const lastMonthRevenue = bookings
    .filter((b: any) => {
      const d = new Date(b.booking_date)
      const lm = currentMonth === 0 ? 11 : currentMonth - 1
      const ly = currentMonth === 0 ? currentYear - 1 : currentYear
      return d.getFullYear() === ly && d.getMonth() === lm && (b.status === "completed" || b.status === "confirmed")
    })
    .reduce((sum: number, b: any) => sum + getBookingPrice(b), 0)

  let revenueGrowthStr = "0% MoM"
  if (lastMonthRevenue > 0) {
    const growth = ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
    revenueGrowthStr = `${growth >= 0 ? "+" : ""}${growth.toFixed(0)}% this month`
  } else if (currentMonthRevenue > 0) {
    revenueGrowthStr = "New revenue this month"
  }

  // 2. Active Clients
  const getActiveClients = (list: any[]) => new Set(list.map((b) => b.customer_id)).size
  
  const currentMonthClients = getActiveClients(
    bookings.filter((b: any) => {
      const d = new Date(b.booking_date)
      return d.getFullYear() === currentYear && d.getMonth() === currentMonth
    })
  )
  const lastMonthClients = getActiveClients(
    bookings.filter((b: any) => {
      const d = new Date(b.booking_date)
      const lm = currentMonth === 0 ? 11 : currentMonth - 1
      const ly = currentMonth === 0 ? currentYear - 1 : currentYear
      return d.getFullYear() === ly && d.getMonth() === lm
    })
  )

  let clientsGrowthStr = "0% MoM"
  if (lastMonthClients > 0) {
    const growth = ((currentMonthClients - lastMonthClients) / lastMonthClients) * 100
    clientsGrowthStr = `${growth >= 0 ? "+" : ""}${growth.toFixed(0)}% this month`
  } else if (currentMonthClients > 0) {
    clientsGrowthStr = "New clients this month"
  }

  // 3. New Bookings (current month)
  const currentMonthBookings = bookings.filter((b: any) => {
    const d = new Date(b.booking_date)
    return d.getFullYear() === currentYear && d.getMonth() === currentMonth
  })
  const lastMonthBookings = bookings.filter((b: any) => {
    const d = new Date(b.booking_date)
    const lm = currentMonth === 0 ? 11 : currentMonth - 1
    const ly = currentMonth === 0 ? currentYear - 1 : currentYear
    return d.getFullYear() === ly && d.getMonth() === lm
  })

  let bookingsGrowthStr = "0% MoM"
  if (lastMonthBookings.length > 0) {
    const growth = ((currentMonthBookings.length - lastMonthBookings.length) / lastMonthBookings.length) * 100
    bookingsGrowthStr = `${growth >= 0 ? "+" : ""}${growth.toFixed(0)}% this month`
  } else if (currentMonthBookings.length > 0) {
    bookingsGrowthStr = "First bookings this month"
  }

  // 4. Client Satisfaction
  const completed = bookings.filter((b: any) => b.status === "completed").length
  const canceled = bookings.filter((b: any) => b.status === "canceled").length
  const totalEnded = completed + canceled
  const satisfactionRate = totalEnded > 0 ? Math.round((completed / totalEnded) * 100) : 100

  const metrics = [
    { title: "Active clients", value: getActiveClients(bookings).toLocaleString(), change: clientsGrowthStr, icon: UsersRound, iconBg: "bg-[#f3e8ff] text-[#7c3aed]" },
    { title: "New bookings", value: `+${currentMonthBookings.length}`, change: bookingsGrowthStr, icon: CalendarDays, iconBg: "bg-[#e0f2fe] text-[#0284c7]" },
    { title: "Revenue", value: `₹${currentMonthRevenue.toLocaleString()}`, change: revenueGrowthStr, icon: CircleDollarSign, iconBg: "bg-[#dcfce7] text-[#16a34a]" },
    { title: "Client satisfaction", value: `${satisfactionRate}%`, change: `${completed} completed vs ${canceled} canceled`, icon: HeartHandshake, iconBg: "bg-[#ffe4e6] text-[#e11d48]" },
  ]

  // Monthly appointments data
  const monthsShort = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  const appointmentChartData = monthsShort.map((month, index) => {
    const monthBookings = bookings.filter((b: any) => {
      const d = new Date(b.booking_date)
      return d.getFullYear() === currentYear && d.getMonth() === index
    })
    const total = monthBookings.length
    const completed = monthBookings.filter((b: any) => b.status === "completed" || b.status === "confirmed").length
    return { month, total, completed }
  })

  // Service distribution revenue data
  const serviceRevenueMap: Record<string, number> = {}
  let totalRevenueSum = 0

  bookings.forEach((b: any) => {
    if (b.status === "completed" || b.status === "confirmed") {
      b.services?.forEach((s: any) => {
        const price = Number(s.price || 0)
        const name = s.service_name || "Unknown Service"
        serviceRevenueMap[name] = (serviceRevenueMap[name] || 0) + price
        totalRevenueSum += price
      })
    }
  })

  const fills = ["#7c3aed", "#a7d99b", "#8dccf2", "#ffd18a", "#bfc6ff", "#dfe5ee"]
  let revenueData = Object.entries(serviceRevenueMap).map(([name, value], idx) => {
    const pct = totalRevenueSum > 0 ? Math.round((value / totalRevenueSum) * 100) : 0
    return {
      name,
      value: pct,
      fill: fills[idx % fills.length]
    }
  }).filter(item => item.value > 0)

  if (revenueData.length === 0) {
    revenueData = [
      { name: "No data available", value: 100, fill: "#dfe5ee" }
    ]
  }

  // Get upcoming 3 clients/bookings (status pending or confirmed, booking_date in future/today)
  const todayStr = now.toISOString().split("T")[0]
  const upcomingClients = bookings
    .filter((b: any) => b.booking_date >= todayStr && b.status !== "canceled" && b.status !== "completed")
    .sort((a: any, b: any) => {
      if (a.booking_date !== b.booking_date) {
        return a.booking_date.localeCompare(b.booking_date)
      }
      return a.start_time.localeCompare(b.start_time)
    })
    .slice(0, 3)
    .map((b: any) => ({
      name: b.customer?.customer_name || "Unknown Client",
      service: b.services?.map((s: any) => s.service_name).join(", ") || "No services selected",
      time: formatBookingTime(b.booking_date, b.start_time),
      artist: profile?.artist_name || "Artist Studio",
      phone: b.customer?.phone || "",
      email: b.customer?.email || ""
    }))

  return (
    <>
      <PageHeader title="Dashboard" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric, index) => (
          <Card key={metric.title} className="rounded-[1.75rem] border-slate-100 bg-white hover:-translate-y-0.5 transition-all duration-300 shadow-md shadow-purple-950/5">
            <CardHeader className="flex-row items-start justify-between gap-3">
              <div>
                <CardTitle className="text-base font-semibold">{metric.title}</CardTitle>
                <p className="mt-5 text-3xl font-semibold tracking-tight">{metric.value}</p>
                <p className="mt-2 flex items-center gap-1 text-xs font-semibold text-[#429a72]">
                  <TrendingUp className="size-3.5" />
                  {metric.change}
                </p>
              </div>
              <div className={`flex size-10 items-center justify-center rounded-2xl ${metric.iconBg}`}>
                <metric.icon className="size-5" />
              </div>
            </CardHeader>
            <CardContent>
              <MiniTrendChart active={index} bookings={bookings} />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.55fr_0.9fr]">
        <Card className="rounded-[1.75rem] border-slate-100 bg-white shadow-md shadow-purple-950/5">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-lg font-semibold">Total appointments</CardTitle>
            <div className="rounded-2xl bg-[#eef1f8] p-1">
              <Button
                size="sm"
                variant="default"
                className="rounded-xl bg-white text-[#15172e] shadow-sm hover:bg-white"
              >
                Year ({currentYear})
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ChartContainer config={appointmentChartConfig} className="h-72 w-full">
              <BarChart data={appointmentChartData} accessibilityLayer>
                <CartesianGrid vertical={false} strokeDasharray="4 4" />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={10}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar
                  dataKey="total"
                  fill="var(--color-total)"
                  radius={[999, 999, 0, 0]}
                />
                <Bar
                  dataKey="completed"
                  fill="var(--color-completed)"
                  radius={[999, 999, 0, 0]}
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="rounded-[1.75rem] border-slate-100 bg-white shadow-md shadow-purple-950/5">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Revenue source distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={revenueChartConfig} className="mx-auto aspect-square max-h-72">
              <PieChart accessibilityLayer>
                <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                <Pie
                  data={revenueData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={70}
                  outerRadius={118}
                  paddingAngle={6}
                >
                  {revenueData.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
            <div className="mt-4 space-y-3 text-sm">
              {revenueData.map((item) => (
                <div key={item.name} className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <span className="size-2.5 rounded-full" style={{ backgroundColor: item.fill }} />
                    {item.name}
                  </span>
                  <span className="font-semibold">{item.value}%</span>
                </div>
              ))}
            </div>
            {revenueData.length > 0 && totalRevenueSum > 0 ? (
              <Badge className="mt-5 w-full justify-center rounded-2xl bg-[#f3e8ff] py-3 text-[#7c3aed]">
                Your total revenue generated is ₹{totalRevenueSum.toLocaleString()}
              </Badge>
            ) : (
              <Badge className="mt-5 w-full justify-center rounded-2xl bg-[#f3e8ff] py-3 text-[#7c3aed]">
                Add some completed bookings to see breakdown
              </Badge>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-5 rounded-[1.75rem] border-slate-100 bg-white shadow-md shadow-purple-950/5">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-lg font-semibold">Upcoming clients</CardTitle>
          <Link href="/bookings">
            <Button variant="ghost" className="rounded-2xl bg-[#f7f8ff]">
              View all
            </Button>
          </Link>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          {upcomingClients.length > 0 ? (
            upcomingClients.map((client) => {
              const waUrl = `https://wa.me/${client.phone.replace(/\D/g, "")}?text=Hi%20${encodeURIComponent(client.name)},%20this%20is%20${encodeURIComponent(profile?.artist_name || "ArtistOS")}%20regarding%20your%20upcoming%20${encodeURIComponent(client.service)}%20booking.`
              
              return (
                <Card key={client.name + client.time} className="rounded-2xl border-none bg-[#f5f7fc] shadow-none">
                  <CardContent className="space-y-4 p-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="size-11">
                        <AvatarFallback>{client.name.split(" ").map((part: string) => part[0]).join("")}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold">{client.name}</p>
                        <p className="text-sm text-[#777b95] line-clamp-1">{client.service}</p>
                      </div>
                    </div>
                    <Separator />
                    <div className="space-y-2 text-sm text-[#5f637e]">
                      <p className="flex items-center gap-2">
                        <CalendarDays className="size-4 text-[#7c3aed]" />
                        {client.time}
                      </p>
                      <p className="flex items-center gap-2">
                        <Command className="size-4 text-[#7c3aed]" />
                        {client.artist}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {client.phone ? (
                        <a href={`tel:${client.phone}`}>
                          <Button size="icon" variant="ghost" className="rounded-xl bg-white hover:bg-slate-50 border border-slate-100 shadow-sm">
                            <Phone className="size-4" />
                          </Button>
                        </a>
                      ) : (
                        <Button size="icon" variant="ghost" disabled className="rounded-xl bg-white border border-slate-100 shadow-sm opacity-50">
                          <Phone className="size-4" />
                        </Button>
                      )}
                      
                      {client.phone ? (
                        <a href={waUrl} target="_blank" rel="noopener noreferrer" className="flex-1">
                          <Button className="w-full rounded-xl bg-[#7c3aed] text-white hover:bg-[#6d28d9] shadow-md shadow-purple-950/10">
                            Message
                          </Button>
                        </a>
                      ) : (
                        <Button disabled className="flex-1 rounded-xl bg-[#7c3aed] text-white opacity-50">
                          Message
                        </Button>
                      )}
                      
                      <Button size="icon" variant="ghost" className="rounded-xl bg-white hover:bg-slate-50 border border-slate-100 shadow-sm">
                        <MoreVertical className="size-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })
          ) : (
            <div className="col-span-3 py-10 text-center text-sm text-slate-500">
              No upcoming appointments. Create a new booking to get started!
            </div>
          )}
        </CardContent>
      </Card>
    </>
  )
}

function MiniTrendChart({ active, bookings }: { active: number; bookings: any[] }) {
  const days = ["S", "M", "T", "W", "T", "F", "S"]
  const data = []
  
  for (let i = 5; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const label = days[d.getDay()]
    const dStr = d.toISOString().split("T")[0]
    
    const dayBookings = bookings.filter((b) => b.booking_date === dStr)
    let val = 0
    
    if (active === 0) {
      val = new Set(dayBookings.map((b) => b.customer_id)).size
    } else if (active === 1) {
      val = dayBookings.length
    } else if (active === 2) {
      val = dayBookings
        .filter((b) => b.status === "completed" || b.status === "confirmed")
        .reduce((sum, b) => {
          const price = b.services?.reduce((sSum: number, s: any) => sSum + Number(s.price || 0), 0) || 0
          return sum + price
        }, 0)
    } else {
      const comp = dayBookings.filter((b) => b.status === "completed").length
      val = comp
    }
    
    data.push({ label, value: val || 0.1 })
  }

  return (
    <ChartContainer config={miniChartConfig} className="h-16 w-full">
      <BarChart data={data} accessibilityLayer>
        <Bar dataKey="value" radius={[999, 999, 0, 0]}>
          {data.map((item, index) => (
            <Cell
              key={item.label + index}
              fill={index === 5 ? "#a9d99b" : "#e4e8f1"}
            />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  )
}
