"use client";

import useSWR from "swr";
import Link from "next/link";
import {
  CalendarDays,
  CircleDollarSign,
  Command,
  HeartHandshake,
  Phone,
  TrendingUp,
  UsersRound,
  ArrowRight,
} from "lucide-react";
import {
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
import { Skeleton } from "@/components/ui/skeleton";

type DashboardData = {
  artist_name: string;
  today: {
    dateStr: string;
    total: number;
    pending: number;
    confirmed: number;
    completed: number;
  };
  metrics: {
    activeClients: { value: string; change: string };
    newBookings: { value: string; change: string };
    revenue: { value: string; change: string };
    satisfaction: { value: string; change: string };
  };
  miniTrends: {
    clients: { label: string; value: number }[];
    bookings: { label: string; value: number }[];
    revenue: { label: string; value: number }[];
    satisfaction: { label: string; value: number }[];
  };
  appointmentChartData: {
    month: string;
    total: number;
    completed: number;
    confirmed: number;
    pending: number;
    cancelled: number;
  }[];
  revenueData: {
    name: string;
    value: number;
    amount?: number;
    fill: string;
  }[];
  totalRevenueSum: number;
  upcomingClients: {
    name: string;
    service: string;
    time: string;
    artist: string;
    phone: string;
    email: string;
  }[];
};

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

const fetcher = async (url: string): Promise<DashboardData> => {
  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.error || "Failed to load dashboard data.");
  }
  return res.json();
};

export default function DashboardPage() {
  const { data, error, isLoading, mutate } = useSWR<DashboardData>(
    "/api/dashboard",
    fetcher,
    {
      revalidateOnFocus: true,
      revalidateOnMount: true,
      dedupingInterval: 2000,
      keepPreviousData: true,
    },
  );

  if (isLoading && !data) {
    return (
      <div className="space-y-6">
        <PageHeader title="Dashboard" />

        {/* Banner Skeleton */}
        <Card className="rounded-[1.75rem] border-slate-100 bg-white shadow-md shadow-purple-950/5 h-auto md:h-[156px] w-full">
          <CardContent className="p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 h-full">
            <div className="space-y-4 w-full max-w-[500px]">
              <Skeleton className="h-9 w-3/4 rounded-xl bg-slate-100" />
              <Skeleton className="h-6 w-full rounded-lg bg-slate-100" />
              <div className="flex gap-3 pt-1">
                <Skeleton className="h-6 w-24 rounded-md bg-slate-100" />
                <Skeleton className="h-6 w-28 rounded-md bg-slate-100" />
              </div>
            </div>
            <Skeleton className="h-12 w-full md:w-[230px] rounded-2xl bg-slate-100 shrink-0" />
          </CardContent>
        </Card>

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

  if (error || !data) {
    return (
      <>
        <PageHeader title="Dashboard" />
        <div className="flex h-96 flex-col items-center justify-center rounded-2xl bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-red-500">
            {error?.message || "Failed to load dashboard data."}
          </p>
          <Button onClick={() => void mutate()} className="mt-4">
            Try again
          </Button>
        </div>
      </>
    );
  }

  const now = new Date();
  const currentHour = now.getHours();
  const currentYear = now.getFullYear();

  const greeting =
    currentHour < 12
      ? "Good morning"
      : currentHour < 18
        ? "Good afternoon"
        : "Good evening";

  const metrics = [
    {
      title: "Active clients",
      value: data.metrics.activeClients.value,
      change: data.metrics.activeClients.change,
      icon: UsersRound,
      iconBg: "bg-white/60 text-[#7c3aed]",
      cardBg: "bg-gradient-to-br from-white to-purple-50/70",
      stroke: "#7c3aed",
      fill: "url(#fillPurple)",
      trendData: data.miniTrends.clients,
    },
    {
      title: "New bookings",
      value: data.metrics.newBookings.value,
      change: data.metrics.newBookings.change,
      icon: CalendarDays,
      iconBg: "bg-white/60 text-[#0284c7]",
      cardBg: "bg-gradient-to-br from-white to-sky-50/70",
      stroke: "#0284c7",
      fill: "url(#fillBlue)",
      trendData: data.miniTrends.bookings,
    },
    {
      title: "Revenue",
      value: data.metrics.revenue.value,
      change: data.metrics.revenue.change,
      icon: CircleDollarSign,
      iconBg: "bg-white/60 text-[#16a34a]",
      cardBg: "bg-gradient-to-br from-white to-emerald-50/70",
      stroke: "#16a34a",
      fill: "url(#fillGreen)",
      trendData: data.miniTrends.revenue,
    },
    {
      title: "Client satisfaction",
      value: data.metrics.satisfaction.value,
      change: data.metrics.satisfaction.change,
      icon: HeartHandshake,
      iconBg: "bg-white/60 text-[#e11d48]",
      cardBg: "bg-gradient-to-br from-white to-rose-50/70",
      stroke: "#e11d48",
      fill: "url(#fillRose)",
      trendData: data.miniTrends.satisfaction,
    },
  ];

  return (
    <>
      <PageHeader title="Dashboard" />

      {/* Greeting and Today's Events Banner */}
      <Card className="mb-5 rounded-[1.75rem] border-0 bg-gradient-to-br from-purple-600 via-indigo-600 to-indigo-700 text-white shadow-lg shadow-purple-950/10 relative overflow-hidden">
        {/* Abstract background elements */}
        <div className="absolute right-0 top-0 h-full w-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/20 via-transparent to-transparent opacity-60" />
        <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-16 right-32 h-40 w-40 rounded-full bg-white/10 blur-2xl" />

        <CardContent className="p-6 md:p-8 relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              {greeting}, {data.artist_name.split(" ")[0] || "Artist"}!{" "}
              <span className="animate-wave origin-bottom-right inline-block">👋</span>
            </h2>
            <p className="text-purple-100 text-lg">
              You have{" "}
              <strong className="text-white font-semibold text-xl mx-1">
                {data.today.total}
              </strong>{" "}
              {data.today.total === 1 ? "appointment" : "appointments"} scheduled for today.
            </p>
            {data.today.total > 0 && (
              <div className="flex flex-wrap items-center gap-3 pt-1">
                {data.today.pending > 0 && (
                  <Badge
                    variant="secondary"
                    className="bg-amber-500/20 text-amber-100 border border-amber-500/30 hover:bg-amber-500/30 font-medium"
                  >
                    {data.today.pending} Pending
                  </Badge>
                )}
                {data.today.confirmed > 0 && (
                  <Badge
                    variant="secondary"
                    className="bg-sky-500/20 text-sky-100 border border-sky-500/30 hover:bg-sky-500/30 font-medium"
                  >
                    {data.today.confirmed} Confirmed
                  </Badge>
                )}
                {data.today.completed > 0 && (
                  <Badge
                    variant="secondary"
                    className="bg-emerald-500/20 text-emerald-100 border border-emerald-500/30 hover:bg-emerald-500/30 font-medium"
                  >
                    {data.today.completed} Completed
                  </Badge>
                )}
              </div>
            )}
          </div>

          <Link href={`/bookings?date=${data.today.dateStr}`}>
            <Button className="h-12 rounded-2xl bg-white text-[#6d28d9] hover:bg-slate-50 font-semibold px-6 shadow-md shadow-black/5 hover:scale-105 transition-all duration-300 w-full md:w-auto flex items-center gap-2">
              View Today&apos;s Bookings
              <ArrowRight className="size-4" />
            </Button>
          </Link>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <Card
            key={metric.title}
            className={`rounded-[1.75rem] border-slate-100 ${metric.cardBg} group hover:-translate-y-1 transition-all duration-300 shadow-md hover:shadow-xl shadow-purple-950/5`}
          >
            <CardHeader className="flex-row items-start p-5 pb-2 relative">
              <div className="z-10 min-w-0 flex-1 pr-14">
                <CardTitle
                  className="text-sm font-semibold text-slate-500 truncate"
                  title={metric.title}
                >
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
                data={metric.trendData}
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
                data={data.appointmentChartData}
                accessibilityLayer
                margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="fillCompleted" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-completed)" stopOpacity={0.6} />
                    <stop offset="95%" stopColor="var(--color-completed)" stopOpacity={0.1} />
                  </linearGradient>
                  <linearGradient id="fillConfirmed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-confirmed)" stopOpacity={0.6} />
                    <stop offset="95%" stopColor="var(--color-confirmed)" stopOpacity={0.1} />
                  </linearGradient>
                  <linearGradient id="fillPending" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-pending)" stopOpacity={0.6} />
                    <stop offset="95%" stopColor="var(--color-pending)" stopOpacity={0.1} />
                  </linearGradient>
                  <linearGradient id="fillCanceled" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-cancelled)" stopOpacity={0.6} />
                    <stop offset="95%" stopColor="var(--color-cancelled)" stopOpacity={0.1} />
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
                  data={data.revenueData}
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
                              ₹{data.totalRevenueSum.toLocaleString()}
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
                  {data.revenueData.map((entry) => (
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
              {data.revenueData.slice(0, 2).map((item) => {
                const rupeeValue = Math.round(
                  (item.value / 100) * (data.totalRevenueSum || 0),
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
          {data.upcomingClients.length > 0 ? (
            data.upcomingClients.map((client) => {
              const waUrl = `https://wa.me/${client.phone.replace(/\D/g, "")}?text=Hi%20${encodeURIComponent(client.name)},%20this%20is%20${encodeURIComponent(client.artist || "ArtistOS")}%20regarding%20your%20upcoming%20${encodeURIComponent(client.service)}%20booking.`;

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
  data,
  stroke,
  fill,
}: {
  data: { label: string; value: number }[];
  stroke: string;
  fill: string;
}) {
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
