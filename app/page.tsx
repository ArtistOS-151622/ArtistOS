"use client"


import {
  ArrowRight,
  CalendarCheck2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  GalleryHorizontalEnd,
  Gift,
  LineChart,
  Megaphone,
  MessageCircle,
  Star,
  UsersRound,
} from "lucide-react"
import { useRef } from "react"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Line,
  LineChart as RechartsLineChart,
  XAxis,
} from "recharts"
import useSWR from "swr"
import { Skeleton } from "@/components/ui/skeleton"

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { BrandLogo, BrandMark } from "@/components/common/brand/brand-logo"
import { SectionHeading } from "@/components/common/shared/section-heading"
import { NavLink } from "@/components/common/shared/nav-link"
import { PrimaryButton } from "@/components/common/shared/primary-button"
import { OutlineButton } from "@/components/common/shared/outline-button"
import { CheckItem } from "@/components/common/shared/check-item"
import { EmailCtaForm } from "@/components/common/landing/email-cta-form"
import { TestimonialCard } from "@/components/common/landing/testimonial-card"
import { DashboardCard } from "@/components/common/dashboard/dashboard-card"
import { FloatingMetric } from "@/components/common/landing/floating-metric"
import { IntegrationIcon } from "@/components/common/landing/integration-icon"

const features = [
  {
    icon: CalendarCheck2,
    title: "Appointment booking",
    text: "Avoid double bookings with a clean calendar, reminders, service slots, and booking history.",
    className: "bg-[#f5f3ff]",
  },
  {
    icon: UsersRound,
    title: "Client CRM",
    text: "Save customer details, repeat visits, preferences, birthdays, and contact history in one place.",
    className: "bg-[#ecffd9]",
  },
  {
    icon: GalleryHorizontalEnd,
    title: "Portfolio gallery",
    text: "Organize nail, mehendi, bridal, and beauty work into categories instead of messy posts.",
    className: "bg-[#edf8ff]",
  },
]

const businessStats = [
  { value: "120k+", label: "client records organized" },
  { value: "150k+", label: "booking reminders sent" },
  { value: "130k+", label: "payments tracked" },
  { value: "165k+", label: "portfolio views created" },
]

const heroRevenueData = [
  { month: "Jan", bookings: 44, revenue: 18 },
  { month: "Feb", bookings: 64, revenue: 24 },
  { month: "Mar", bookings: 38, revenue: 15 },
  { month: "Apr", bookings: 76, revenue: 28 },
  { month: "May", bookings: 54, revenue: 20 },
  { month: "Jun", bookings: 88, revenue: 32 },
  { month: "Jul", bookings: 48, revenue: 18 },
  { month: "Aug", bookings: 70, revenue: 26 },
  { month: "Sep", bookings: 96, revenue: 36 },
  { month: "Oct", bookings: 58, revenue: 22 },
  { month: "Nov", bookings: 84, revenue: 31 },
  { month: "Dec", bookings: 112, revenue: 42 },
]

const heroReachData = [
  { day: "Mon", clients: 24, campaigns: 18 },
  { day: "Tue", clients: 34, campaigns: 26 },
  { day: "Wed", clients: 32, campaigns: 28 },
  { day: "Thu", clients: 48, campaigns: 36 },
  { day: "Fri", clients: 54, campaigns: 40 },
  { day: "Sat", clients: 56, campaigns: 42 },
]

const businessBarData = [
  { label: "N", value: 58 },
  { label: "M", value: 100 },
  { label: "B", value: 76 },
  { label: "P", value: 118 },
  { label: "S", value: 88 },
  { label: "R", value: 132 },
]

const growthLineData = [
  { month: "Jan", revenue: 44, payments: 32 },
  { month: "Feb", revenue: 58, payments: 45 },
  { month: "Mar", revenue: 52, payments: 48 },
  { month: "Apr", revenue: 78, payments: 60 },
  { month: "May", revenue: 72, payments: 58 },
  { month: "Jun", revenue: 96, payments: 74 },
]

const syncReachData = [
  { label: "1", reach: 28, clients: 20 },
  { label: "2", reach: 42, clients: 30 },
  { label: "3", reach: 48, clients: 34 },
  { label: "4", reach: 68, clients: 52 },
  { label: "5", reach: 72, clients: 56 },
  { label: "6", reach: 74, clients: 58 },
]

const revenueChartConfig = {
  bookings: { label: "Bookings", color: "#58d8b6" },
  revenue: { label: "Revenue", color: "#7c3aed" },
} satisfies ChartConfig

const reachChartConfig = {
  clients: { label: "Clients", color: "#58d8b6" },
  campaigns: { label: "Campaigns", color: "#7c3aed" },
} satisfies ChartConfig

const businessChartConfig = {
  value: { label: "Demand", color: "#7c3aed" },
} satisfies ChartConfig

const growthChartConfig = {
  revenue: { label: "Revenue", color: "#ffffff" },
  payments: { label: "Payments", color: "#58d8b6" },
} satisfies ChartConfig

const syncChartConfig = {
  reach: { label: "Reach", color: "#7c3aed" },
  clients: { label: "Clients", color: "#21d3a6" },
} satisfies ChartConfig

const testimonials = [
  {
    name: "Riya M.",
    role: "Nail Artist",
    text: "ArtistOS helped me stop mixing WhatsApp bookings with notebook entries. My repeat clients are finally easy to manage.",
  },
  {
    name: "Ayesha K.",
    role: "Mehendi Artist",
    text: "Festival offers and pending payments are much easier to track. I can see my whole week in one dashboard.",
  },
  {
    name: "Neha S.",
    role: "Bridal Artist",
    text: "My portfolio looks organized and professional now. Clients can find bridal, party, and engagement work quickly.",
  },
  {
    name: "Kavya P.",
    role: "Beauty Studio Owner",
    text: "The dashboard gives me bookings, dues, and campaign status without checking three different apps.",
  },
  {
    name: "Sana Q.",
    role: "Makeup Artist",
    text: "Birthday wishes and repeat-client offers helped me bring back old customers with very little manual work.",
  },
  {
    name: "Isha V.",
    role: "Mehendi Artist",
    text: "My festival calendar is finally organized. I know who to message and which payments are still pending.",
  },
]

type PricingPlan = {
  id?: number
  name: string
  price?: string
  period?: string
  amount_inr?: number
  compare_at_amount_inr?: number | null
  discount_percentage?: number | null
  gst_percentage?: number | null
  billing_period?: string
  description: string
  features: string[]
  cta?: string
  featured?: boolean
  is_featured?: boolean
}

const isFreeTierPricingPlan = (plan: PricingPlan) => plan.amount_inr === 0 && (plan.billing_period ?? plan.period ?? "") !== ""

const pricingPlans: PricingPlan[] = [
  {
    name: "Monthly",
    price: "₹249",
    compare_at_amount_inr: 500,
    discount_percentage: 50,
    gst_percentage: 18,
    period: "/month",
    description: "Best for solo artists who want to organize bookings and payments.",
    features: [
      "Booking Calendar & Scheduling",
      "Client CRM (Customer Management)",
      "Payment & Invoice Tracking",
      "Portfolio Gallery with Cloud Storage",
      "WhatsApp Broadcast Campaigns",
      "Business Reports & Analytics",
      "Service & Pricing Management"
    ],
    cta: "Start monthly",
  },
  {
    name: "Yearly",
    price: "₹2799",
    compare_at_amount_inr: 5000,
    discount_percentage: 44,
    gst_percentage: 18,
    period: "/year",
    description: "Save more with a full year of business management tools.",
    features: [
      "All Monthly Features",
      "Priority Customer Support",
      "Early Access to New Features",
      "Personal Onboarding Session"
    ],
    cta: "Choose yearly",
    featured: true,
  },
  {
    name: "Custom",
    price: "White label",
    period: "",
    description: "For salons, academies, and brands that need their own branded platform.",
    features: ["Custom branding", "Team access", "Custom domain", "Dedicated setup"],
    cta: "Contact us",
  },
]

const appointments = [
  { customer: "Aarohi Shah", service: "Bridal makeup", amount: "₹18,000" },
  { customer: "Meera Patel", service: "Mehendi session", amount: "₹6,500" },
  { customer: "Nisha Rao", service: "Gel nail art", amount: "₹2,200" },
]

export default function Home() {
  return (
    <main className="min-h-svh bg-white text-[#1f213f]">
      <div className="overflow-hidden bg-white">
        <Header />
        <Hero />
        <Features />
        <BusinessSection />
        <SyncSection />
        <Testimonials />
        <PricingSection />
        <FinalCta />
        <Footer />
      </div>
    </main>
  )
}

function Header() {
  return (
    <header className="flex items-center justify-between px-6 py-5 sm:px-12 lg:px-20">
      <BrandLogo imageClassName="h-12" priority />

      <nav className="hidden items-center gap-9 text-sm font-medium text-[#575b78] lg:flex">
        <NavLink href="#features">Products</NavLink>
        <NavLink href="#solutions">Solutions</NavLink>
        <NavLink href="#pricing">Pricing</NavLink>
        <NavLink href="#company">Company</NavLink>
        <NavLink href="#resources">Resources</NavLink>
      </nav>

      <div className="flex items-center gap-4">
        <a href="/login" className="hidden text-sm font-medium text-[#343757] sm:inline" suppressHydrationWarning>
          Log in
        </a>
        <PrimaryButton href="/signup">
          Sign up
          <ArrowRight className="size-4" />
        </PrimaryButton>
      </div>
    </header>
  )
}

function Hero() {
  return (
    <section className="relative grid gap-8 overflow-hidden px-6 pb-12 pt-6 sm:px-12 lg:grid-cols-[0.88fr_1.12fr] lg:px-20 lg:pb-16 lg:pt-8">
      <div className="pointer-events-none absolute -right-24 top-20 h-[560px] w-[560px] rounded-full bg-[#faf5ff] blur-3xl" />
      <div className="pointer-events-none absolute left-[45%] top-40 h-72 w-72 rounded-full bg-[#e6fff7] blur-3xl" />
      <div className="relative z-10 max-w-xl animate-fade-up">
        <h1 className="text-5xl font-semibold leading-[1.1] tracking-tight text-[#232542] sm:text-6xl lg:text-7xl">
          All artist business needs solutions, simple and modern
        </h1>
        <p className="mt-5 text-base leading-7 text-[#5d6078] sm:text-lg">
          A powerful SaaS platform for nail, mehendi, bridal, and beauty artists to
          manage bookings, clients, portfolios, campaigns, payments, and growth.
        </p>

        <EmailCtaForm />

        <div className="mt-5 flex flex-wrap gap-5 text-sm text-[#535770]">
          <CheckItem text="No credit required" className="text-[#535770]" />
          <CheckItem text="Real-time insights" className="text-[#535770]" />
        </div>
      </div>

      <div className="relative min-h-[560px] animate-fade-up lg:min-h-[540px]" style={{ animationDelay: "120ms" }}>
        <div className="animate-soft-glow absolute right-0 top-6 h-[430px] w-[82%] rounded-[2rem] bg-[#7c3aed]" />
        <div className="absolute right-8 top-16 hidden h-[380px] w-[73%] rounded-[1.6rem] border border-white/25 bg-[linear-gradient(135deg,rgba(255,255,255,.24)_1px,transparent_1px)] bg-[length:72px_72px] lg:block" />
        <DashboardMockup />
        <FloatingMetric className="left-0 top-28 animate-float-small" title="Today bookings" value="18" helper="+6 new requests" />
        <FloatingMetric className="bottom-12 left-8 animate-float-small" title="Pending dues" value="₹8,240" helper="9 payments tracked" />
      </div>
    </section>
  )
}

function DashboardMockup() {
  return (
    <div className="absolute right-0 top-16 w-full max-w-[760px] rounded-[1.6rem] border border-white/70 bg-white/95 p-3 shadow-2xl shadow-[#8389a8]/35 backdrop-blur lg:-right-8 lg:animate-float-soft">
      <div className="overflow-hidden rounded-[1.25rem] border border-[#edf0fa] bg-[#fbfcff]">
        <div className="flex items-center justify-between border-b border-[#edf0fa] bg-white px-4 py-3">
          <div className="flex items-center gap-3">
            <BrandMark className="size-8 rounded-xl" />
            <div>
              <p className="text-sm font-semibold">ArtistOS Studio</p>
              <p className="text-[0.68rem] text-[#7a7f99]">Beauty business dashboard</p>
            </div>
          </div>
          <div className="hidden h-9 w-56 rounded-full border border-[#edf0fa] bg-[#f7f8ff] px-4 text-[0.7rem] leading-9 text-[#8a8fac] sm:block">
            Search client, booking, payment
          </div>
          <div className="flex -space-x-2">
            {["R", "A", "N"].map((item) => (
              <span key={item} className="flex size-8 items-center justify-center rounded-full border-2 border-white bg-[#f5f3ff] text-xs font-semibold text-[#7c3aed]">
                {item}
              </span>
            ))}
          </div>
        </div>

        <div className="grid min-h-[430px] gap-4 p-4 md:grid-cols-[150px_1fr]">
          <aside className="hidden rounded-2xl bg-[#f3e8ff] p-3 text-xs font-medium text-[#717694] md:block">
            <div className="mb-5 flex items-center gap-2 px-2 text-[#232542]">
              <span className="size-2 rounded-full bg-[#58d8b6]" />
              Live workspace
            </div>
            {["Dashboard", "Bookings", "Clients", "Portfolio", "Campaigns", "Payments"].map((item, index) => (
              <div
                key={item}
                className={`mb-1 rounded-xl px-3 py-2.5 ${index === 0 ? "bg-[#7c3aed] text-white shadow-lg shadow-[#7c3aed]/20" : ""}`}
              >
                {item}
              </div>
            ))}
          </aside>

          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <DashboardCard label="Revenue" value="₹42.7k" helper="+12.4%" />
              <DashboardCard label="Bookings" value="18" helper="+6 today" />
              <DashboardCard label="Repeat clients" value="68%" helper="+8.2%" />
            </div>

            <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
              <div className="rounded-2xl border border-[#edf0fa] bg-white p-4">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold">Revenue analytics</p>
                    <p className="text-[0.7rem] text-[#858aa5]">Nail, mehendi, bridal services</p>
                  </div>
                  <LineChart className="size-4 text-[#7c3aed]" />
                </div>
                <HeroRevenueChart />
              </div>

              <div className="space-y-4">
                <div className="rounded-2xl border border-[#edf0fa] bg-white p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm font-semibold">Campaign reach</p>
                    <span className="rounded-full bg-[#eafaf4] px-2.5 py-1 text-[0.65rem] font-semibold text-[#23a982]">
                      Live
                    </span>
                  </div>
                  <HeroReachChart />
                </div>

                <div className="rounded-2xl bg-[#7c3aed] p-4 text-white">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">Festival campaign</p>
                    <Megaphone className="size-4 text-white/80" />
                  </div>
                  <p className="mt-3 text-2xl font-semibold">124 clients</p>
                  <p className="mt-1 text-xs text-white/70">ready for WhatsApp offer</p>
                  <div className="mt-4 h-2 rounded-full bg-white/20">
                    <div className="animate-progress h-2 w-[72%] rounded-full bg-white" />
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {appointments.map((appointment) => (
                <div key={appointment.customer} className="rounded-2xl border border-[#edf0fa] bg-white p-3">
                  <p className="text-xs font-semibold">{appointment.customer}</p>
                  <p className="mt-1 text-[0.7rem] text-[#717694]">{appointment.service}</p>
                  <p className="mt-3 text-xs font-semibold text-[#58a890]">{appointment.amount}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}



function HeroRevenueChart() {
  return (
    <ChartContainer config={revenueChartConfig} className="h-40 w-full">
      <BarChart data={heroRevenueData} accessibilityLayer>
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="bookings" fill="var(--color-bookings)" radius={[8, 8, 0, 0]} />
        <Bar dataKey="revenue" fill="var(--color-revenue)" radius={[8, 8, 0, 0]} />
      </BarChart>
    </ChartContainer>
  )
}

function HeroReachChart() {
  return (
    <ChartContainer config={reachChartConfig} className="mt-4 h-24 w-full">
      <RechartsLineChart data={heroReachData} accessibilityLayer>
        <ChartTooltip content={<ChartTooltipContent hideLabel />} />
        <Line
          type="monotone"
          dataKey="clients"
          stroke="var(--color-clients)"
          strokeWidth={4}
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="campaigns"
          stroke="var(--color-campaigns)"
          strokeWidth={4}
          dot={false}
        />
      </RechartsLineChart>
    </ChartContainer>
  )
}

function BusinessDemandChart() {
  return (
    <ChartContainer config={businessChartConfig} className="h-40 w-full">
      <BarChart data={businessBarData} accessibilityLayer>
        <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
        <ChartTooltip content={<ChartTooltipContent hideLabel />} />
        <Bar dataKey="value" fill="var(--color-value)" radius={[12, 12, 0, 0]}>
          {businessBarData.map((item) => (
            <Cell key={item.label} fill="#7c3aed" />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  )
}

function GrowthLineChart() {
  return (
    <ChartContainer config={growthChartConfig} className="mt-5 h-24 w-full">
      <AreaChart data={growthLineData} accessibilityLayer>
        <ChartTooltip content={<ChartTooltipContent hideLabel />} />
        <Area
          type="monotone"
          dataKey="revenue"
          stroke="var(--color-revenue)"
          fill="var(--color-revenue)"
          fillOpacity={0.18}
          strokeWidth={4}
        />
        <Area
          type="monotone"
          dataKey="payments"
          stroke="var(--color-payments)"
          fill="var(--color-payments)"
          fillOpacity={0.18}
          strokeWidth={4}
        />
      </AreaChart>
    </ChartContainer>
  )
}

function SyncReachChart() {
  return (
    <ChartContainer config={syncChartConfig} className="mt-4 h-24 w-full">
      <RechartsLineChart data={syncReachData} accessibilityLayer>
        <ChartTooltip content={<ChartTooltipContent hideLabel />} />
        <Line
          type="monotone"
          dataKey="reach"
          stroke="var(--color-reach)"
          strokeWidth={4}
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="clients"
          stroke="var(--color-clients)"
          strokeWidth={4}
          dot={false}
        />
      </RechartsLineChart>
    </ChartContainer>
  )
}



function Features() {
  return (
    <section id="features" className="px-6 py-20 sm:px-12 lg:px-20">
      <SectionHeading
        title="Our platform features"
        description="Improve relationships, reduce manual work, organize customer data, and grow repeat bookings with one beauty-business platform."
      />

      <div className="mt-16 grid gap-6 lg:grid-cols-3">
        {features.map((feature) => (
          <article
            key={feature.title}
            className={`animate-fade-up rounded-md p-8 transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-[#a7adca]/20 ${feature.className}`}
          >
            <feature.icon className="size-9 text-[#222541]" />
            <div className="my-7 h-px bg-[#252842]/20" />
            <h3 className="text-xl font-semibold">{feature.title}</h3>
            <p className="mt-4 leading-7 text-[#4f536b]">{feature.text}</p>
          </article>
        ))}
      </div>
    </section>
  )
}

function BusinessSection() {
  return (
    <section id="solutions" className="px-6 py-20 sm:px-12 lg:px-20">
      <div className="grid overflow-hidden rounded-[2rem] bg-[#fbfcff] p-6 shadow-sm sm:p-10 lg:grid-cols-[1fr_0.95fr] lg:items-center lg:gap-16">
      <div className="relative min-h-[520px]">
        <div className="absolute left-1/2 top-1/2 h-[380px] w-[380px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#edf0ff] blur-3xl" />
        <div className="absolute left-[8%] top-[8%] z-10 rounded-2xl bg-white px-5 py-4 shadow-xl shadow-[#9ba0b8]/20 animate-float-small">
          <div className="flex items-center gap-1 text-[#ffcc36]">
            <Star className="size-4 fill-current" />
            <span className="text-sm font-semibold">4.8</span>
          </div>
          <p className="mt-1 text-xs text-[#777b95]">artist rating</p>
        </div>

        <div className="absolute left-[7%] top-[32%] z-10 w-52 rounded-3xl bg-white p-6 shadow-2xl shadow-[#9ba0b8]/25 animate-fade-up">
          <div className="mb-5 flex size-10 items-center justify-center rounded-2xl bg-[#f3e8ff] text-[#7c3aed]">
            <UsersRound className="size-5" />
          </div>
          <p className="text-4xl font-semibold tracking-tight">76.8%</p>
          <p className="mt-2 text-sm text-[#70758f]">Client engagement</p>
          <p className="mt-3 inline-flex rounded-full bg-[#eafaf4] px-3 py-1 text-xs font-semibold text-[#23a982]">
            +8.21% this month
          </p>
        </div>

        <div className="absolute left-[36%] top-[13%] z-20 w-[min(470px,62vw)] rounded-3xl bg-white p-6 shadow-2xl shadow-[#9ba0b8]/25 animate-fade-up" style={{ animationDelay: "120ms" }}>
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">Data Analytics</p>
              <p className="mt-1 text-xs text-[#777b95]">service demand by month</p>
            </div>
            <span className="rounded-full bg-[#f3e8ff] px-3 py-1 text-xs font-semibold text-[#7c3aed]">
              Live
            </span>
          </div>
          <BusinessDemandChart />
        </div>

        <div className="absolute bottom-[8%] left-[27%] z-30 w-[min(420px,65vw)] rounded-3xl bg-[#7c3aed] p-6 text-white shadow-2xl shadow-[#7c3aed]/25">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-white/70">Monthly growth</p>
              <p className="mt-2 text-3xl font-semibold">₹2.8L tracked</p>
            </div>
            <LineChart className="size-6 text-white/80" />
          </div>
          <GrowthLineChart />
        </div>
      </div>

      <div className="animate-fade-up self-center">
        <p className="mb-4 inline-flex rounded-full bg-[#f3e8ff] px-4 py-2 text-sm font-semibold text-[#7c3aed]">
          Business clarity
        </p>
        <h2 className="max-w-xl text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
          See how can ArtistOS help your business
        </h2>
        <p className="mt-5 max-w-xl leading-7 text-[#666a82]">
          Move from scattered tools to one system that helps artists understand clients,
          bookings, payments, marketing, and portfolio performance.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {businessStats.map((stat) => (
            <div
              key={stat.value}
              className="rounded-2xl border border-[#edf0fa] bg-white p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-[#aeb5d2]/15"
            >
              <p className="text-2xl font-semibold text-[#7c3aed]">{stat.value}</p>
              <p className="mt-2 text-sm leading-6 text-[#656982]">{stat.label}</p>
            </div>
          ))}
        </div>
        <div className="mt-7 space-y-3">
          {["Find repeat clients instantly", "Measure service-wise income", "Know which portfolio category performs best"].map((item) => (
            <CheckItem key={item} text={item} />
          ))}
        </div>
        <PrimaryButton href="#cta" className="mt-8">
          Try for Free
        </PrimaryButton>
      </div>
      </div>
    </section>
  )
}

function SyncSection() {
  return (
    <section className="px-6 py-16 sm:px-12 lg:px-20">
      <div className="grid overflow-hidden rounded-[2rem] bg-[#f7f8ff] p-6 shadow-sm sm:p-10 lg:grid-cols-[0.82fr_1.18fr] lg:items-center lg:gap-12">
      <div className="animate-fade-up">
        <p className="mb-4 inline-flex rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#7c3aed] shadow-sm">
          Connected workspace
        </p>
        <h2 className="max-w-xl text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
          Sync your artist business for comfortable work
        </h2>
        <p className="mt-5 max-w-xl leading-7 text-[#666a82]">
          Bring bookings, WhatsApp follow-ups, campaign reminders, payment status, and
          portfolio links into one easy workflow.
        </p>
        <div className="mt-7 grid max-w-xl gap-3 sm:grid-cols-2">
          {["Booking reminders", "WhatsApp campaigns", "Payment follow-ups", "Portfolio sharing"].map((item) => (
            <div key={item} className="flex items-center gap-3 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-[#33365a] shadow-sm">
              <CheckItem text={item} className="text-[#33365a]" />
            </div>
          ))}
        </div>
        <PrimaryButton href="#cta" className="mt-8">
          Try for Free
        </PrimaryButton>
      </div>

      <div className="relative mt-12 min-h-[430px] lg:mt-0">
        <div className="absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#ede9fe] blur-3xl" />
        <div className="animate-pulse-ring absolute left-1/2 top-1/2 h-[340px] w-[340px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#c4b5fd]" />
        <div className="animate-pulse-ring absolute left-1/2 top-1/2 h-[470px] w-[470px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#ddd6fe]" style={{ animationDelay: "500ms" }} />
        <IntegrationIcon className="left-[8%] top-[13%] animate-float-small" icon={<MessageCircle className="size-5" />} label="DMs" />
        <IntegrationIcon className="right-[12%] top-[7%] animate-float-small" icon={<Megaphone className="size-5" />} label="Campaigns" />
        <IntegrationIcon className="bottom-[8%] left-[16%] animate-float-small" icon={<Gift className="size-5" />} label="Offers" />
        <IntegrationIcon className="bottom-[16%] right-[5%] animate-float-small" icon={<CircleDollarSign className="size-5" />} label="Payments" />
        <div className="absolute left-1/2 top-1/2 w-[min(520px,92vw)] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-5 shadow-2xl shadow-[#9ba0b8]/25">
          <div className="mb-5 flex items-center justify-between">
            <div className="flex gap-1.5">
              <span className="size-2.5 rounded-full bg-[#ff7a90]" />
              <span className="size-2.5 rounded-full bg-[#ffd166]" />
              <span className="size-2.5 rounded-full bg-[#58d8b6]" />
            </div>
            <span className="rounded-full bg-[#f3e8ff] px-3 py-1 text-xs font-semibold text-[#7c3aed]">
              Live sync
            </span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl bg-[#f3e8ff] p-5">
              <p className="text-xs font-semibold">Campaign</p>
              <p className="mt-4 text-3xl font-semibold">62%</p>
              <div className="mt-5 h-2 rounded-full bg-white">
                <div className="animate-progress h-2 w-[62%] rounded-full bg-[#7c3aed]" />
              </div>
              <p className="mt-5 text-xs leading-5 text-[#686c86]">Festival offer sent to repeat bridal clients.</p>
            </div>
            <div className="rounded-2xl bg-[#f3e8ff] p-5">
              <p className="text-xs font-semibold">Client reach</p>
              <SyncReachChart />
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {["18 reminders", "9 dues cleared", "34 portfolio visits"].map((item) => (
              <div key={item} className="rounded-xl border border-[#edf0fa] px-3 py-2 text-center text-xs font-semibold text-[#565b79]">
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>
      </div>
    </section>
  )
}



function Testimonials() {
  const marqueeItems = [...testimonials, ...testimonials]

  return (
    <section className="overflow-hidden bg-[#fbfcff] px-6 py-20 text-center sm:px-12 lg:px-20">
      <SectionHeading
        eyebrow="Loved by artists"
        title="Customer success is our success"
        description="Discover how beauty professionals use ArtistOS to acquire, engage, and support customers."
        className="animate-fade-up"
      />

      <div className="pause-animation relative mt-12">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-[#fbfcff] to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-[#fbfcff] to-transparent" />
        <div className="animate-marquee flex w-max gap-6 text-left">
          {marqueeItems.map((testimonial, index) => (
            <TestimonialCard
              key={`${testimonial.name}-${index}`}
              name={testimonial.name}
              role={testimonial.role}
              text={testimonial.text}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

const fetcher = (url: string) => fetch(url).then(res => res.json())

function PricingSection() {
  const { data: plans, isLoading } = useSWR<PricingPlan[]>("/api/platform-subscriptions", fetcher)
  const sliderRef = useRef<HTMLDivElement>(null)

  // Use the fetched plans, fallback to hardcoded ONLY if the API returned an error/non-array
  const displayPlans = plans && Array.isArray(plans) ? plans : pricingPlans

  // Determine the desktop grid layout based on count
  const count = displayPlans.length
  const gridClass =
    count === 1 ? "lg:grid-cols-1 lg:max-w-sm lg:mx-auto" :
    count === 2 ? "lg:grid-cols-2 lg:max-w-2xl lg:mx-auto" :
    count === 4 ? "lg:grid-cols-2" :
    "lg:grid-cols-3"

  const scrollSlider = (dir: "left" | "right") => {
    if (!sliderRef.current) return
    const cardWidth = sliderRef.current.querySelector("article")?.offsetWidth ?? 280
    sliderRef.current.scrollBy({ left: dir === "right" ? cardWidth + 20 : -(cardWidth + 20), behavior: "smooth" })
  }

  return (
    <section id="pricing" className="px-6 py-20 sm:px-12 lg:px-20">
      <SectionHeading
        eyebrow="Simple pricing"
        title="Plans that fit every artist's growth stage"
        description="Start small, save yearly, or create a fully white-label ArtistOS platform for your beauty brand."
        className="animate-fade-up"
      />

      {isLoading ? (
        // Skeleton: mobile slider, desktop grid
        <div className="mt-14">
          {/* Mobile skeleton slider */}
          <div className="flex gap-5 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide lg:hidden">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex min-h-[460px] w-[80vw] max-w-[320px] shrink-0 snap-start flex-col rounded-[1.75rem] border border-slate-100 bg-white p-7 shadow-sm">
                <Skeleton className="h-8 w-1/2 mb-4" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-3/4 mb-8" />
                <Skeleton className="h-12 w-32 mb-12" />
                <div className="space-y-4 flex-1">
                  <Skeleton className="h-4 w-5/6" />
                  <Skeleton className="h-4 w-4/6" />
                  <Skeleton className="h-4 w-full" />
                </div>
                <Skeleton className="h-12 w-full mt-auto" />
              </div>
            ))}
          </div>
          {/* Desktop skeleton grid */}
          <div className="hidden lg:grid gap-6 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex min-h-[460px] flex-col rounded-[1.75rem] border border-slate-100 bg-white p-7 shadow-sm">
                <Skeleton className="h-8 w-1/2 mb-4" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-3/4 mb-8" />
                <Skeleton className="h-12 w-32 mb-12" />
                <div className="space-y-4 flex-1">
                  <Skeleton className="h-4 w-5/6" />
                  <Skeleton className="h-4 w-4/6" />
                  <Skeleton className="h-4 w-full" />
                </div>
                <Skeleton className="h-12 w-full mt-auto" />
              </div>
            ))}
          </div>
        </div>
      ) : displayPlans.length === 0 ? (
        <div className="mt-14 text-center py-16 text-[#888ca6] text-sm">
          No active pricing plans at the moment. Check back soon!
        </div>
      ) : (
        <div className="mt-14">
          {/* Mobile: horizontal scroll slider with nav buttons */}
          <div className="lg:hidden">
            <div
              ref={sliderRef}
              className="flex gap-5 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide"
            >
              {displayPlans.map((plan) => {
                const isFeatured = plan.is_featured ?? plan.featured ?? false
                return (
                  <article
                    key={plan.id || plan.name}
                    className={`relative flex min-h-[480px] w-[82vw] max-w-[330px] shrink-0 snap-start flex-col overflow-hidden rounded-[2rem] p-7 shadow-xl transition ${
                      isFeatured
                        ? "border-0 bg-gradient-to-br from-[#7c3aed] via-[#6d28d9] to-[#5b21b6] text-white shadow-[#7c3aed]/30"
                        : "border border-[#eaedf8] bg-white text-[#232542] shadow-[#b8bdd8]/15"
                    }`}
                  >
                    {isFeatured && (
                      <span className="absolute right-6 top-6 rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#7c3aed]">Best value</span>
                    )}
                    <PricingCardInner plan={plan} isFeatured={isFeatured} />
                  </article>
                )
              })}
            </div>

            {/* Prev / Next buttons — only shown when >1 plan */}
            {displayPlans.length > 1 && (
              <div className="mt-5 flex items-center justify-center gap-3">
                <button
                  onClick={() => scrollSlider("left")}
                  aria-label="Previous plan"
                  className="flex size-11 items-center justify-center rounded-full border border-[#e0e3f5] bg-white shadow-sm text-[#7c3aed] transition hover:bg-[#7c3aed] hover:text-white active:scale-95"
                >
                  <ChevronLeft className="size-5" />
                </button>
                <button
                  onClick={() => scrollSlider("right")}
                  aria-label="Next plan"
                  className="flex size-11 items-center justify-center rounded-full border border-[#e0e3f5] bg-white shadow-sm text-[#7c3aed] transition hover:bg-[#7c3aed] hover:text-white active:scale-95"
                >
                  <ChevronRight className="size-5" />
                </button>
              </div>
            )}
          </div>

          {/* Desktop: smart grid */}
          <div className={`hidden lg:grid gap-6 ${gridClass}`}>
            {displayPlans.map((plan) => {
              const isFeatured = plan.is_featured ?? plan.featured ?? false
              return (
                <article
                  key={plan.id || plan.name}
                  className={`relative flex min-h-[480px] flex-col overflow-hidden rounded-[2rem] p-7 shadow-xl transition duration-300 hover:-translate-y-2 hover:shadow-2xl ${
                    isFeatured
                      ? "border-0 bg-gradient-to-br from-[#7c3aed] via-[#6d28d9] to-[#5b21b6] text-white shadow-[#7c3aed]/30"
                      : "border border-[#eaedf8] bg-white text-[#232542] shadow-[#b8bdd8]/15"
                  }`}
                >
                  {isFeatured && (
                    <span className="absolute right-6 top-6 rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#7c3aed]">Best value</span>
                  )}
                  <PricingCardInner plan={plan} isFeatured={isFeatured} />
                </article>
              )
            })}
          </div>
        </div>
      )}
    </section>
  )
}


function PricingCardInner({ plan, isFeatured }: { plan: PricingPlan; isFeatured: boolean }) {
  const price = plan.amount_inr !== undefined ? `₹${plan.amount_inr}` : plan.price ?? ""
  const compareAtPrice = plan.compare_at_amount_inr ? `₹${plan.compare_at_amount_inr}` : null
  const isFreeTier = isFreeTierPricingPlan(plan)
  const gstText = !isFreeTier && plan.gst_percentage ? `+ ${plan.gst_percentage}% GST` : ""
  const periodText = isFreeTier ? "First Month" : plan.billing_period || plan.period

  return (
    <>
      {/* Decorative orb for featured */}
      {isFeatured && (
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
      )}

      {/* Header */}
      <div className="relative">
        <div className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest mb-4 ${
          isFeatured ? "bg-white/15 text-white" : "bg-[#f3e8ff] text-[#7c3aed]"
        }`}>
          {plan.name}
        </div>

        {/* Price */}
        {(compareAtPrice || plan.discount_percentage) && (
          <div className="mt-1 flex min-h-6 flex-wrap items-center gap-2">
            {compareAtPrice && (
              <span className={`text-base font-semibold line-through ${isFeatured ? "text-white/45" : "text-[#9aa0bd]"}`}>
                {compareAtPrice}
              </span>
            )}
            {plan.discount_percentage && (
              <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ${
                isFeatured ? "bg-white/20 text-white" : "bg-emerald-50 text-emerald-700"
              }`}>
                {plan.discount_percentage}% off
              </span>
            )}
          </div>
        )}
        <div className="mt-1 flex flex-wrap items-end gap-1.5">
          <span className={`text-[3.25rem] font-bold leading-none tracking-tight ${isFeatured ? "text-white" : "text-[#1a1d3a]"}`}>
            {price}
          </span>
          {gstText && (
            <span className={`mb-1.5 text-sm font-semibold ${isFeatured ? "text-white/70" : "text-[#606684]"}`}>
              {gstText}
            </span>
          )}
          {periodText && (
            <span className={`mb-1.5 text-sm font-medium ${isFeatured ? "text-white/60" : "text-[#9096b5]"}`}>
              {periodText}
            </span>
          )}
        </div>

        <p className={`mt-3 text-sm leading-6 ${isFeatured ? "text-white/70" : "text-[#6b6f8e]"}`}>
          {plan.description}
        </p>
      </div>

      {/* Divider */}
      <div className={`my-6 h-px ${isFeatured ? "bg-white/15" : "bg-[#eaecf5]"}`} />

      {/* Features */}
      <div className="flex-1 space-y-3">
        {(plan.features || []).map((feature: string) => (
          <div key={feature} className="flex items-start gap-3">
            <span className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full ${
              isFeatured ? "bg-white/20" : "bg-[#f3e8ff]"
            }`}>
              <CheckCircle2 className={`size-3 ${ isFeatured ? "text-white" : "text-[#7c3aed]"}`} />
            </span>
            <span className={`text-sm leading-6 ${ isFeatured ? "text-white/85" : "text-[#3d4169]"}`}>{feature}</span>
          </div>
        ))}
      </div>

      {/* CTA */}
      <a
        href={plan.name.toLowerCase() === 'custom' ? "#cta" : "/login?next=/billing"}
        className={`mt-7 inline-flex h-12 items-center justify-center gap-2 rounded-full px-6 text-sm font-bold tracking-wide transition-all duration-200 ${
          isFeatured
            ? "bg-white text-[#7c3aed] hover:bg-[#f3e8ff] shadow-lg shadow-black/10"
            : "bg-[#7c3aed] text-white hover:bg-[#6d28d9] shadow-lg shadow-[#7c3aed]/25"
        }`}
        suppressHydrationWarning
      >
        {plan.cta || "Get Started"}
        <ArrowRight className="size-4" />
      </a>
    </>
  )
}

function FinalCta() {
  return (
    <section id="cta" className="px-6 py-16 sm:px-12 lg:px-20">
      <div className="relative overflow-hidden rounded-md bg-[#7c3aed] px-8 py-14 text-center text-white">
        <div className="absolute left-8 top-8 h-24 w-24 rotate-45 border border-white/20" />
        <div className="absolute bottom-8 right-10 h-28 w-28 rotate-45 border border-white/20" />
        <h2 className="relative mx-auto max-w-xl text-3xl font-semibold leading-tight sm:text-4xl">
          Make artist business success inevitable with ArtistOS
        </h2>
        <div className="relative mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <a
            href="#"
            className="inline-flex h-10 items-center justify-center rounded-md bg-white px-5 text-sm font-semibold text-[#7c3aed]"
            suppressHydrationWarning
          >
            Try for Free
          </a>
          <OutlineButton href="#pricing">See Prices</OutlineButton>
        </div>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="px-6 pb-8 sm:px-12 lg:px-20">
      <div className="grid gap-10 border-t border-[#edf0fa] py-10 lg:grid-cols-[1fr_2fr]">
        <div>
          <BrandLogo imageClassName="h-11" />
          <p className="mt-4 max-w-xs text-sm leading-6 text-[#666a82]">
            The fastest and simplest way to run a modern beauty artist business.
          </p>
        </div>
        <div className="grid gap-8 text-sm sm:grid-cols-3">
          {[
            ["Product", "CRM", "Booking", "Portfolio", "Payments"],
            ["Company", "About", "Privacy Policy", "Terms", "Contact"],
            ["Resources", "Guides", "Blog", "Tools", "Support"],
          ].map(([title, ...items]) => (
            <div key={title}>
              <p className="font-semibold text-[#292c48]">{title}</p>
              <div className="mt-4 space-y-3 text-[#686c86]">
                {items.map((item) => (
                  <p key={item}>{item}</p>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="bg-[#202344] px-5 py-4 text-xs text-white/70">
        © 2026 ArtistOS. All rights reserved.
      </div>
    </footer>
  )
}
