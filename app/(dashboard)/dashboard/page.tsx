"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  CircleDollarSign,
  Command,
  HeartHandshake,
  MoreVertical,
  Phone,
  TrendingUp,
  UsersRound,
} from "lucide-react";
import {
  Bar,
  BarChart,
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Label,
  Pie,
  PieChart,
  XAxis,
} from "recharts";

import { PageHeader } from "@/components/common/dashboard/dashboard-header-context";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { AppLoader } from "@/components/common/shared/app-loader";

const appointmentChartConfig = {
  total: { label: "Total", color: "#cbd5e1" },
  completed: { label: "Completed", color: "#7c3aed" },
  confirmed: { label: "Confirmed", color: "#0ea5e9" },
  pending: { label: "Pending", color: "#f59e0b" },
  cancelled: { label: "Cancelled", color: "#ef4444" },
} satisfies ChartConfig;

const miniChartConfig = {
  value: {
    label: "Activity",
    color: "#a9d99b",
  },
} satisfies ChartConfig;

const revenueChartConfig = {
  value: {
    label: "Revenue",
  },
} satisfies ChartConfig;

function formatBookingTime(dateStr: string, timeStr: string) {
  try {
    const [year, month, day] = dateStr.split("-").map(Number);
    const [hours, minutes] = timeStr.split(":").map(Number);
    const dateObj = new Date(year, month - 1, day, hours, minutes);

    const options: Intl.DateTimeFormatOptions = {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    };

    return dateObj.toLocaleDateString("en-US", options);
  } catch {
    return `${dateStr} ${timeStr}`;
  }
}

export default function DashboardPage() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadDashboardData() {
      try {
        setLoading(true);
        setError("");

        // Fetch user profile info
        const profileRes = await fetch("/api/auth/me");
        if (profileRes.ok) {
          const profileData = await profileRes.json();
          setProfile(profileData?.user || null);
        }

        // Fetch bookings for the current year
        const currentYear = new Date().getFullYear();
        const start = `${currentYear - 1}-01-01`;
        const end = `${currentYear + 1}-12-31`;

        const bookingsRes = await fetch(
          `/api/bookings?start_date=${start}&end_date=${end}`,
        );
        if (!bookingsRes.ok) {
          throw new Error("Failed to load dashboard data.");
        }

        const bookingsData = await bookingsRes.json();
        setBookings(bookingsData.bookings || []);
      } catch (err: any) {
        setError(
          err.message || "An error occurred while loading dashboard data.",
        );
      } finally {
        setLoading(false);
      }
    }

    void loadDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Dashboard" />

        {/* Metric Cards Skeleton */}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card
              key={i}
              className="rounded-[1.75rem] border-slate-100 bg-white shadow-md shadow-purple-950/5 h-[160px]"
            >
              <CardHeader className="flex-row items-start justify-between gap-3 p-5 pb-2">
                <div className="w-full">
                  <Skeleton className="h-4 w-24 mb-3 bg-slate-100" />
                  <Skeleton className="h-8 w-16 mb-4 bg-slate-100" />
                  <Skeleton className="h-5 w-32 rounded-lg bg-slate-100" />
                </div>
                <Skeleton className="size-11 rounded-2xl shrink-0 bg-slate-100" />
              </CardHeader>
              <CardContent className="p-5 pt-0 mt-4">
                <Skeleton className="h-10 w-full rounded-md bg-slate-50" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts Row Skeleton */}
        <div className="mt-5 grid gap-5 xl:grid-cols-[1.55fr_0.9fr]">
          <Card className="h-[420px] rounded-[1.75rem] border-slate-100 bg-white shadow-md shadow-purple-950/5">
            <CardHeader className="flex flex-row items-center justify-between p-5 pb-2">
              <Skeleton className="h-6 w-48 bg-slate-100" />
              <Skeleton className="h-8 w-24 rounded-xl bg-slate-100" />
            </CardHeader>
            <CardContent className="p-5">
              <Skeleton className="h-[300px] w-full rounded-xl bg-slate-50" />
            </CardContent>
          </Card>

          <Card className="h-[420px] rounded-[1.75rem] border-slate-100 bg-white shadow-md shadow-purple-950/5 flex flex-col justify-center gap-8 p-5">
            <Skeleton className="size-48 rounded-full mx-auto bg-slate-50" />
            <div className="space-y-3 w-full mt-4">
              <Skeleton className="h-14 w-full rounded-2xl bg-slate-50" />
              <Skeleton className="h-14 w-full rounded-2xl bg-slate-50" />
            </div>
          </Card>
        </div>

        {/* Upcoming Clients Skeleton */}
        <Card className="mt-5 rounded-[1.75rem] border-slate-100 bg-white shadow-md shadow-purple-950/5">
          <CardHeader className="flex flex-row items-center justify-between p-5 pb-2">
            <Skeleton className="h-6 w-40 bg-slate-100" />
            <Skeleton className="h-8 w-24 rounded-2xl bg-slate-100" />
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3 p-5">
            {[1, 2, 3].map((i) => (
              <Card
                key={i}
                className="rounded-[2rem] border border-slate-100 bg-white shadow-sm h-[260px]"
              >
                <CardContent className="space-y-5 p-6">
                  <div className="flex items-start gap-4">
                    <Skeleton className="size-14 rounded-full shrink-0 bg-slate-100" />
                    <div className="space-y-3 w-full pt-1">
                      <Skeleton className="h-5 w-3/4 bg-slate-100" />
                      <Skeleton className="h-5 w-1/2 rounded-md bg-slate-100" />
                    </div>
                  </div>
                  <Skeleton className="h-[4.5rem] w-full rounded-2xl bg-slate-50" />
                  <div className="flex gap-3 pt-1">
                    <Skeleton className="size-[3.25rem] rounded-[1.25rem] bg-slate-100" />
                    <Skeleton className="h-[3.25rem] flex-1 rounded-[1.25rem] bg-slate-100" />
                    <Skeleton className="size-[3.25rem] rounded-[1.25rem] bg-slate-100" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </CardContent>
        </Card>
      </div>
    );
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
    );
  }

  // Calculate dynamic stats
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const getBookingPrice = (b: any) => {
    const servicesTotal =
      b.services?.reduce(
        (sum: number, s: any) =>
          sum + Number(s.price || 0) * Number(s.quantity || 1),
        0,
      ) || 0;
    const additionalChargesTotal =
      b.additional_charges?.reduce(
        (sum: number, c: any) =>
          sum + Number(c.rate || 0) * Number(c.quantity || 1),
        0,
      ) || 0;
    const discount = b.discount || 0;
    return servicesTotal + additionalChargesTotal - discount;
  };

  // 1. Revenue this month
  const currentMonthRevenue = bookings
    .filter((b: any) => {
      const d = new Date(b.booking_date);
      return (
        d.getFullYear() === currentYear &&
        d.getMonth() === currentMonth &&
        (b.status === "completed" || b.status === "confirmed")
      );
    })
    .reduce((sum: number, b: any) => sum + getBookingPrice(b), 0);

  const lastMonthRevenue = bookings
    .filter((b: any) => {
      const d = new Date(b.booking_date);
      const lm = currentMonth === 0 ? 11 : currentMonth - 1;
      const ly = currentMonth === 0 ? currentYear - 1 : currentYear;
      return (
        d.getFullYear() === ly &&
        d.getMonth() === lm &&
        (b.status === "completed" || b.status === "confirmed")
      );
    })
    .reduce((sum: number, b: any) => sum + getBookingPrice(b), 0);

  let revenueGrowthStr = "0% MoM";
  if (lastMonthRevenue > 0) {
    const growth =
      ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100;
    revenueGrowthStr = `${growth >= 0 ? "+" : ""}${growth.toFixed(0)}% this month`;
  } else if (currentMonthRevenue > 0) {
    revenueGrowthStr = "New revenue this month";
  }

  // 2. Active Clients
  const getActiveClients = (list: any[]) =>
    new Set(list.map((b) => b.customer_id)).size;

  const currentMonthClients = getActiveClients(
    bookings.filter((b: any) => {
      const d = new Date(b.booking_date);
      return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
    }),
  );
  const lastMonthClients = getActiveClients(
    bookings.filter((b: any) => {
      const d = new Date(b.booking_date);
      const lm = currentMonth === 0 ? 11 : currentMonth - 1;
      const ly = currentMonth === 0 ? currentYear - 1 : currentYear;
      return d.getFullYear() === ly && d.getMonth() === lm;
    }),
  );

  let clientsGrowthStr = "0% MoM";
  if (lastMonthClients > 0) {
    const growth =
      ((currentMonthClients - lastMonthClients) / lastMonthClients) * 100;
    clientsGrowthStr = `${growth >= 0 ? "+" : ""}${growth.toFixed(0)}% this month`;
  } else if (currentMonthClients > 0) {
    clientsGrowthStr = "New clients this month";
  }

  // 3. New Bookings (current month)
  const currentMonthBookings = bookings.filter((b: any) => {
    const d = new Date(b.booking_date);
    return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
  });
  const lastMonthBookings = bookings.filter((b: any) => {
    const d = new Date(b.booking_date);
    const lm = currentMonth === 0 ? 11 : currentMonth - 1;
    const ly = currentMonth === 0 ? currentYear - 1 : currentYear;
    return d.getFullYear() === ly && d.getMonth() === lm;
  });

  let bookingsGrowthStr = "0% MoM";
  if (lastMonthBookings.length > 0) {
    const growth =
      ((currentMonthBookings.length - lastMonthBookings.length) /
        lastMonthBookings.length) *
      100;
    bookingsGrowthStr = `${growth >= 0 ? "+" : ""}${growth.toFixed(0)}% this month`;
  } else if (currentMonthBookings.length > 0) {
    bookingsGrowthStr = "First bookings this month";
  }

  // 4. Client Satisfaction
  const completed = bookings.filter(
    (b: any) => b.status === "completed",
  ).length;
  const cancelled = bookings.filter((b: any) => b.status === "cancelled").length;
  const totalEnded = completed + cancelled;
  const satisfactionRate =
    totalEnded > 0 ? Math.round((completed / totalEnded) * 100) : 100;

  const metrics = [
    {
      title: "Active clients",
      value: getActiveClients(bookings).toLocaleString(),
      change: clientsGrowthStr,
      icon: UsersRound,
      iconBg: "bg-white/60 text-[#7c3aed]",
      cardBg: "bg-gradient-to-br from-white to-purple-50/70",
      stroke: "#7c3aed",
      fill: "url(#fillPurple)",
    },
    {
      title: "New bookings",
      value: `+${currentMonthBookings.length}`,
      change: bookingsGrowthStr,
      icon: CalendarDays,
      iconBg: "bg-white/60 text-[#0284c7]",
      cardBg: "bg-gradient-to-br from-white to-sky-50/70",
      stroke: "#0284c7",
      fill: "url(#fillBlue)",
    },
    {
      title: "Revenue",
      value: `₹${currentMonthRevenue.toLocaleString()}`,
      change: revenueGrowthStr,
      icon: CircleDollarSign,
      iconBg: "bg-white/60 text-[#16a34a]",
      cardBg: "bg-gradient-to-br from-white to-emerald-50/70",
      stroke: "#16a34a",
      fill: "url(#fillGreen)",
    },
    {
      title: "Client satisfaction",
      value: `${satisfactionRate}%`,
      change: `${completed} completed vs ${cancelled} cancelled`,
      icon: HeartHandshake,
      iconBg: "bg-white/60 text-[#e11d48]",
      cardBg: "bg-gradient-to-br from-white to-rose-50/70",
      stroke: "#e11d48",
      fill: "url(#fillRose)",
    },
  ];

  // Monthly appointments data
  const monthsShort = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const appointmentChartData = monthsShort.map((month, index) => {
    const monthBookings = bookings.filter((b: any) => {
      const d = new Date(b.booking_date);
      return d.getFullYear() === currentYear && d.getMonth() === index;
    });
    const total = monthBookings.length;
    const completed = monthBookings.filter(
      (b: any) => b.status === "completed",
    ).length;
    const confirmed = monthBookings.filter(
      (b: any) => b.status === "confirmed",
    ).length;
    const pending = monthBookings.filter(
      (b: any) => b.status === "pending",
    ).length;
    const cancelled = monthBookings.filter(
      (b: any) => b.status === "cancelled",
    ).length;
    return { month, total, completed, confirmed, pending, cancelled };
  });

  // Service distribution revenue data
  const serviceRevenueMap: Record<string, number> = {};
  let totalRevenueSum = 0;

  bookings.forEach((b: any) => {
    if (b.status === "completed" || b.status === "confirmed") {
      b.services?.forEach((s: any) => {
        const price = Number(s.price || 0);
        const name = s.service_name || "Unknown Service";
        serviceRevenueMap[name] = (serviceRevenueMap[name] || 0) + price;
        totalRevenueSum += price;
      });
    }
  });

  const fills = [
    "#7c3aed",
    "#a7d99b",
    "#8dccf2",
    "#ffd18a",
    "#bfc6ff",
    "#dfe5ee",
  ];
  let rawRevenueData = Object.entries(serviceRevenueMap)
    .map(([name, value]) => {
      const pct =
        totalRevenueSum > 0 ? Math.round((value / totalRevenueSum) * 100) : 0;
      return { name, value: pct };
    })
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value);

  let revenueData = rawRevenueData.map((item, idx) => ({
    ...item,
    fill: fills[idx % fills.length],
  }));

  if (revenueData.length === 0) {
    revenueData = [{ name: "No data available", value: 100, fill: "#dfe5ee" }];
  }

  // Get upcoming 3 clients/bookings (status pending or confirmed, booking_date in future/today)
  const todayStr = now.toISOString().split("T")[0];
  const upcomingClients = bookings
    .filter(
      (b: any) =>
        b.booking_date >= todayStr &&
        b.status !== "cancelled" &&
        b.status !== "completed",
    )
    .sort((a: any, b: any) => {
      if (a.booking_date !== b.booking_date) {
        return a.booking_date.localeCompare(b.booking_date);
      }
      return a.start_time.localeCompare(b.start_time);
    })
    .slice(0, 3)
    .map((b: any) => ({
      name: b.customer?.customer_name || "Unknown Client",
      service:
        b.services?.map((s: any) => s.service_name).join(", ") ||
        "No services selected",
      time: formatBookingTime(b.booking_date, b.start_time),
      artist: profile?.artist_name || "Artist Studio",
      phone: b.customer?.phone || "",
      email: b.customer?.email || "",
    }));

  return (
    <>
      <PageHeader title="Dashboard" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric, index) => (
          <Card
            key={metric.title}
            className={`rounded-[1.75rem] border-slate-100 ${metric.cardBg} group hover:-translate-y-1 transition-all duration-300 shadow-md hover:shadow-xl shadow-purple-950/5`}
          >
            <CardHeader className="flex-row items-start p-5 pb-2 relative">
              <div className="z-10 min-w-0 flex-1 pr-14">
                <CardTitle className="text-sm font-semibold text-slate-500 truncate" title={metric.title}>
                  {metric.title}
                </CardTitle>
                <p className="mt-2 text-3xl font-bold tracking-tight text-slate-800">
                  {metric.value}
                </p>
                <div className="mt-3 flex items-center gap-1">
                  <Badge
                    variant="secondary"
                    className="bg-white/60 text-xs font-semibold backdrop-blur-sm border-slate-200/60 shadow-sm text-slate-600 rounded-lg py-0.5 px-2"
                  >
                    <TrendingUp className="size-3 mr-1" />
                    {metric.change}
                  </Badge>
                </div>
              </div>
              <div
                className={`absolute top-5 right-5 flex shrink-0 size-11 items-center justify-center rounded-2xl ${metric.iconBg} backdrop-blur-md shadow-sm border border-white/40 group-hover:scale-110 transition-transform duration-300 z-10`}
              >
                <metric.icon className="size-5" />
              </div>
            </CardHeader>
            <CardContent className="p-5 pt-0 mt-2 relative z-0">
              <MiniTrendChart
                active={index}
                bookings={bookings}
                stroke={metric.stroke}
                fill={metric.fill}
              />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.55fr_0.9fr]">
        <Card className="h-full flex flex-col rounded-[1.75rem] border-slate-100 bg-white shadow-md shadow-purple-950/5">
          <CardHeader className="flex flex-row items-center justify-between p-5 pb-2">
            <CardTitle className="text-lg font-semibold">
              Total appointments
            </CardTitle>
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
          <CardContent className="flex-1 p-5 pt-0">
            <ChartContainer
              config={appointmentChartConfig}
              className="h-full min-h-72 max-h-[362px] w-full"
            >
              <AreaChart
                data={appointmentChartData}
                accessibilityLayer
                margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
              >
                <defs>
                  <linearGradient
                    id="fillCompleted"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor="var(--color-completed)"
                      stopOpacity={0.6}
                    />
                    <stop
                      offset="95%"
                      stopColor="var(--color-completed)"
                      stopOpacity={0.1}
                    />
                  </linearGradient>
                  <linearGradient
                    id="fillConfirmed"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor="var(--color-confirmed)"
                      stopOpacity={0.6}
                    />
                    <stop
                      offset="95%"
                      stopColor="var(--color-confirmed)"
                      stopOpacity={0.1}
                    />
                  </linearGradient>
                  <linearGradient id="fillPending" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor="var(--color-pending)"
                      stopOpacity={0.6}
                    />
                    <stop
                      offset="95%"
                      stopColor="var(--color-pending)"
                      stopOpacity={0.1}
                    />
                  </linearGradient>
                  <linearGradient id="fillCanceled" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor="var(--color-cancelled)"
                      stopOpacity={0.6}
                    />
                    <stop
                      offset="95%"
                      stopColor="var(--color-cancelled)"
                      stopOpacity={0.1}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  vertical={false}
                  strokeDasharray="4 4"
                  stroke="#f1f5f9"
                />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={12}
                  tick={{ fill: "#94a3b8", fontSize: 13, fontWeight: 500 }}
                />
                <ChartTooltip
                  cursor={{
                    stroke: "#cbd5e1",
                    strokeWidth: 1,
                    strokeDasharray: "4 4",
                  }}
                  content={<ChartTooltipContent />}
                />

                <Area
                  type="monotone"
                  dataKey="cancelled"
                  stackId="a"
                  stroke="var(--color-cancelled)"
                  strokeWidth={2}
                  fill="url(#fillCanceled)"
                  activeDot={{ r: 5 }}
                />
                <Area
                  type="monotone"
                  dataKey="pending"
                  stackId="a"
                  stroke="var(--color-pending)"
                  strokeWidth={2}
                  fill="url(#fillPending)"
                  activeDot={{ r: 5 }}
                />
                <Area
                  type="monotone"
                  dataKey="confirmed"
                  stackId="a"
                  stroke="var(--color-confirmed)"
                  strokeWidth={2}
                  fill="url(#fillConfirmed)"
                  activeDot={{ r: 5 }}
                />
                <Area
                  type="monotone"
                  dataKey="completed"
                  stackId="a"
                  stroke="var(--color-completed)"
                  strokeWidth={2}
                  fill="url(#fillCompleted)"
                  activeDot={{ r: 5 }}
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="h-full flex flex-col rounded-[1.75rem] border-slate-100 bg-white shadow-md shadow-purple-950/5">
          <CardHeader className="p-5 pb-2">
            <CardTitle className="text-lg font-semibold">
              Revenue source distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-center gap-4 p-5 pt-0">
            <ChartContainer
              config={revenueChartConfig}
              className="mx-auto aspect-square max-h-64 w-full"
            >
              <PieChart accessibilityLayer>
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent hideLabel />}
                />
                <Pie
                  data={revenueData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={80}
                  outerRadius={115}
                  paddingAngle={5}
                  strokeWidth={0}
                  cornerRadius={10}
                >
                  <Label
                    content={({ viewBox }) => {
                      if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                        return (
                          <text
                            x={viewBox.cx}
                            y={viewBox.cy}
                            textAnchor="middle"
                            dominantBaseline="middle"
                          >
                            <tspan
                              x={viewBox.cx}
                              y={viewBox.cy}
                              className="fill-slate-800 text-3xl font-bold tracking-tight"
                            >
                              ₹{totalRevenueSum.toLocaleString()}
                            </tspan>
                            <tspan
                              x={viewBox.cx}
                              y={(viewBox.cy || 0) + 24}
                              className="fill-slate-500 text-sm font-medium"
                            >
                              Total Revenue
                            </tspan>
                          </text>
                        );
                      }
                    }}
                  />
                  {revenueData.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={entry.fill}
                      className="hover:opacity-80 transition-opacity duration-300"
                    />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
            <div className="flex flex-col gap-3">
              {revenueData.slice(0, 2).map((item) => {
                const rupeeValue = Math.round(
                  (item.value / 100) * totalRevenueSum,
                ).toLocaleString();
                return (
                  <div
                    key={item.name}
                    className="group flex items-center justify-between p-3 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:shadow-md hover:border-purple-100 transition-all duration-300"
                  >
                    <span className="flex items-center gap-3">
                      <span
                        className="size-3.5 rounded-full shadow-sm group-hover:scale-110 transition-transform duration-300"
                        style={{ backgroundColor: item.fill }}
                      />
                      <span className="font-medium text-slate-700">
                        {item.name}
                      </span>
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="text-slate-400 font-medium text-sm">
                        ₹{rupeeValue}
                      </span>
                      <Badge
                        variant="secondary"
                        className="bg-white text-slate-700 rounded-lg shadow-sm border-slate-100"
                      >
                        {item.value}%
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-5 rounded-[1.75rem] border-slate-100 bg-white shadow-md shadow-purple-950/5">
        <CardHeader className="flex flex-row items-center justify-between p-5 pb-2">
          <CardTitle className="text-lg font-semibold">
            Upcoming clients
          </CardTitle>
          <Link href="/bookings">
            <Button
              variant="outline"
              className="rounded-2xl border-slate-200 bg-white shadow-sm hover:bg-slate-50 font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
              View all
            </Button>
          </Link>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3 p-5 pt-0">
          {upcomingClients.length > 0 ? (
            upcomingClients.map((client) => {
              const waUrl = `https://wa.me/${client.phone.replace(/\D/g, "")}?text=Hi%20${encodeURIComponent(client.name)},%20this%20is%20${encodeURIComponent(profile?.artist_name || "ArtistOS")}%20regarding%20your%20upcoming%20${encodeURIComponent(client.service)}%20booking.`;

              return (
                <Card
                  key={client.name + client.time}
                  className="group relative overflow-hidden rounded-[2rem] border border-slate-100 bg-white shadow-sm hover:shadow-xl hover:shadow-purple-900/5 transition-all duration-300 hover:-translate-y-1"
                >
                  {/* Subtle hover glow effect */}
                  <div className="absolute -right-12 -top-12 h-36 w-36 rounded-full bg-gradient-to-br from-purple-100 to-indigo-50 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                  <CardContent className="relative z-10 space-y-5 p-6">
                    <div className="flex items-start gap-4">
                      <Avatar className="size-14 border-2 border-white shadow-sm group-hover:scale-105 transition-transform duration-300 ring-4 ring-slate-50">
                        <AvatarFallback className="bg-gradient-to-br from-purple-100 to-indigo-100 text-purple-700 font-bold text-lg uppercase">
                          {client.name
                            .split(" ")
                            .slice(0, 2)
                            .map((part: string) => part[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="pt-1 min-w-0 flex-1">
                        <p
                          className="font-bold text-slate-800 text-lg tracking-tight leading-tight truncate"
                          title={client.name}
                        >
                          {client.name}
                        </p>
                        <Badge
                          variant="secondary"
                          className="mt-2 bg-slate-100/80 text-slate-600 font-medium hover:bg-slate-200/80 transition-colors border border-slate-200/50 truncate max-w-full block"
                        >
                          {client.service}
                        </Badge>
                      </div>
                    </div>

                    <div className="rounded-2xl bg-slate-50/80 p-4 flex flex-col gap-3 border border-slate-100 shadow-inner shadow-slate-100/50">
                      <div className="flex items-center gap-3 text-sm font-medium text-slate-600">
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm border border-slate-100">
                          <CalendarDays className="size-4 text-purple-600" />
                        </div>
                        <span className="truncate">{client.time}</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm font-medium text-slate-600">
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm border border-slate-100">
                          <Command className="size-4 text-indigo-600" />
                        </div>
                        <span className="truncate">{client.artist}</span>
                      </div>
                    </div>

                    <div className="flex gap-3 pt-1">
                      {client.phone ? (
                        <a href={`tel:${client.phone}`}>
                          <Button
                            size="icon"
                            variant="outline"
                            className="size-[3.25rem] rounded-[1.25rem] border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 shadow-sm text-slate-600 group-hover:text-purple-600 transition-colors"
                          >
                            <Phone className="size-5" />
                          </Button>
                        </a>
                      ) : (
                        <Button
                          size="icon"
                          variant="outline"
                          disabled
                          className="size-[3.25rem] rounded-[1.25rem] border-slate-200 bg-white shadow-sm opacity-50"
                        >
                          <Phone className="size-5" />
                        </Button>
                      )}

                      {client.phone ? (
                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1"
                        >
                          <Button className="h-[3.25rem] w-full rounded-[1.25rem] bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700 shadow-md shadow-purple-900/20 font-semibold text-[15px] transition-all hover:shadow-lg hover:shadow-purple-900/30">
                            Message
                          </Button>
                        </a>
                      ) : (
                        <Button
                          disabled
                          className="h-[3.25rem] flex-1 rounded-[1.25rem] bg-slate-100 text-slate-400 font-semibold text-[15px] border border-slate-200"
                        >
                          Message
                        </Button>
                      )}

                      <Button
                        size="icon"
                        variant="outline"
                        className="size-[3.25rem] rounded-[1.25rem] border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 shadow-sm text-slate-600 transition-colors"
                      >
                        <MoreVertical className="size-5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <div className="col-span-3 py-10 text-center text-sm text-slate-500">
              No upcoming appointments. Create a new booking to get started!
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}

function MiniTrendChart({
  active,
  bookings,
  stroke,
  fill,
}: {
  active: number;
  bookings: any[];
  stroke: string;
  fill: string;
}) {
  const days = ["S", "M", "T", "W", "T", "F", "S"];
  const data = [];

  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const label = days[d.getDay()];
    const dStr = d.toISOString().split("T")[0];

    const dayBookings = bookings.filter((b) => b.booking_date === dStr);
    let val = 0;

    if (active === 0) {
      val = new Set(dayBookings.map((b) => b.customer_id)).size;
    } else if (active === 1) {
      val = dayBookings.length;
    } else if (active === 2) {
      val = dayBookings
        .filter((b) => b.status === "completed" || b.status === "confirmed")
        .reduce((sum, b) => {
          const price =
            b.services?.reduce(
              (sSum: number, s: any) => sSum + Number(s.price || 0),
              0,
            ) || 0;
          return sum + price;
        }, 0);
    } else {
      const comp = dayBookings.filter((b) => b.status === "completed").length;
      val = comp;
    }

    data.push({ label, value: val || 0.1 });
  }

  return (
    <ChartContainer
      config={miniChartConfig}
      className="h-16 w-full opacity-80 group-hover:opacity-100 transition-opacity duration-300"
    >
      <AreaChart
        data={data}
        accessibilityLayer
        margin={{ top: 5, right: 0, left: 0, bottom: 0 }}
      >
        <defs>
          <linearGradient id="fillPurple" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#7c3aed" stopOpacity={0.0} />
          </linearGradient>
          <linearGradient id="fillBlue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#0284c7" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#0284c7" stopOpacity={0.0} />
          </linearGradient>
          <linearGradient id="fillGreen" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#16a34a" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#16a34a" stopOpacity={0.0} />
          </linearGradient>
          <linearGradient id="fillRose" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#e11d48" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#e11d48" stopOpacity={0.0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="value"
          stroke={stroke}
          fill={fill}
          strokeWidth={2}
        />
      </AreaChart>
    </ChartContainer>
  );
}
