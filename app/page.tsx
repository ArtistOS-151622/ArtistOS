"use client"
// next/image used inside Hero for the background photo


import {
  ArrowRight,
  ArrowUpRight,
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
  Search,
  Star,
  UsersRound,
} from "lucide-react"
import { useEffect, useRef, useState } from "react"
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
import Image from "next/image"
import { BrandLogo } from "@/components/common/brand/brand-logo"
import { SectionHeading } from "@/components/common/shared/section-heading"
import { NavLink } from "@/components/common/shared/nav-link"
import { PrimaryButton } from "@/components/common/shared/primary-button"
import { OutlineButton } from "@/components/common/shared/outline-button"
import { CheckItem } from "@/components/common/shared/check-item"
import { TestimonialCard } from "@/components/common/landing/testimonial-card"
import { FloatingClientChip } from "@/components/common/landing/floating-client-chip"
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

export default function Home() {
  return (
    <main className="min-h-svh bg-white text-[#1f213f]">
      {/* Above-fold: header + hero together = exactly one viewport height on all screens */}
      <div className="flex h-svh flex-col overflow-hidden bg-white">
        <Header />
        <Hero />
      </div>
      <div className="overflow-hidden bg-white">
        <Features />
        <BusinessSection />
        <SyncSection />
        <Testimonials />
        <PricingSection />
        <FaqSection />
        <KeywordSection />
        <FinalCta />
        <Footer />
      </div>
    </main>
  )
}

function Header() {
  return (
    <header className="flex items-center justify-between px-5 py-4 sm:px-8 lg:px-10">
      <BrandLogo imageClassName="h-9" priority />

      <nav className="hidden items-center gap-8 text-sm font-medium text-[#4a4a4a] lg:flex">
        <NavLink href="#features">Product</NavLink>
        <NavLink href="#solutions">Features</NavLink>
        <NavLink href="#pricing">Pricing</NavLink>
        <NavLink href="#resources">Resources</NavLink>
        <NavLink href="#company">About</NavLink>
      </nav>

      <div className="flex items-center gap-3">
        <a
          href="/login"
          className="inline-flex items-center gap-1.5 rounded-full bg-[#7c3aed] px-5 py-2.5 text-sm font-medium text-white shadow-sm shadow-[#7c3aed]/20 outline-none transition duration-200 hover:-translate-y-0.5 hover:bg-[#6d28d9] focus-visible:ring-2 focus-visible:ring-[#7c3aed]/50 focus-visible:ring-offset-2"
          suppressHydrationWarning
        >
          Login
          <ArrowUpRight className="size-3.5" />
        </a>
      </div>
    </header>
  )
}

const heroProfessions = [
  { label: "Makeup Artist",  emoji: "💄", delay: "0ms"   },
  { label: "Nail Artist",    emoji: "💅", delay: "60ms"  },
  { label: "Bridal Artist",  emoji: "👰", delay: "120ms" },
  { label: "Mehendi Artist", emoji: "🌿", delay: "180ms" },
  { label: "Salon Owner",    emoji: "✂️",  delay: "240ms" },
  { label: "Beauty Studio",  emoji: "🪞", delay: "300ms" },
  { label: "Hair Stylist",   emoji: "💇", delay: "360ms" },
  { label: "Lash Artist",    emoji: "👁️",  delay: "420ms" },
]

const rotatingHeroPhrases = [
  "Made Completely Effortless.",
  "On Pure Autopilot.",
  "Organized in Seconds.",
  "Without the Chaos.",
  "Built for Top Artists.",
]

function RotatingHeroText() {
  const [index, setIndex] = useState(0)
  const [animating, setAnimating] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => {
      setAnimating(true)
      setTimeout(() => {
        setIndex((prev) => (prev + 1) % rotatingHeroPhrases.length)
        setAnimating(false)
      }, 350)
    }, 2800)
    return () => clearInterval(interval)
  }, [])

  return (
    <span className="relative inline-block px-1">
      <span
        className={`inline-block font-serif italic font-normal tracking-normal text-transparent bg-clip-text bg-gradient-to-r from-[#7c3aed] via-[#9333ea] to-[#a855f7] transition-all duration-350 ease-out transform min-h-[1.2em] ${
          animating
            ? "opacity-0 -translate-y-2 blur-[1px]"
            : "opacity-100 translate-y-0 blur-0"
        }`}
      >
        {rotatingHeroPhrases[index]}
      </span>
      {/* Hand-drawn curved swoosh underline */}
      <svg
        className={`pointer-events-none absolute -bottom-1 sm:-bottom-2 left-0 w-full h-[10px] sm:h-[13px] overflow-visible transition-all duration-300 ${
          animating ? "opacity-25 scale-x-90" : "opacity-100 scale-x-100"
        }`}
        viewBox="0 0 280 14"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path
          d="M 3 10 C 60 2, 170 2, 277 8"
          stroke="url(#hero-curve-grad)"
          strokeWidth="3.2"
          strokeLinecap="round"
        />
        <path
          d="M 28 12 C 95 6, 200 6, 255 11"
          stroke="url(#hero-curve-grad)"
          strokeWidth="1.6"
          strokeLinecap="round"
          opacity="0.6"
        />
        <defs>
          <linearGradient id="hero-curve-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#7c3aed" />
            <stop offset="60%" stopColor="#9333ea" />
            <stop offset="100%" stopColor="#c084fc" />
          </linearGradient>
        </defs>
      </svg>
    </span>
  )
}

function Hero() {
  return (
    <section className="relative flex flex-1 flex-col px-5 pb-8 pt-10 sm:px-8 lg:flex-1 lg:px-10 lg:pb-6 lg:pt-6">
      {/* Centered headline block */}
      <div className="animate-fade-up mx-auto text-center">
        <h1 className="text-[2.15rem] font-semibold leading-[1.1] tracking-[-0.035em] text-[#31324f] sm:text-[2.85rem] lg:text-[3.45rem]">
          <span className="block drop-shadow-xs">Your Booking & Client Management</span>
          <RotatingHeroText />
        </h1>
        <p className="mx-auto mt-4 max-w-[440px] text-[0.9rem] leading-[1.3] text-[#6b6b6b] lg:mt-4 font-medium">
          Bookings, clients, portfolio, payments and WhatsApp campaigns - all
          managed from one powerful workspace.
        </p>

        <div className="mt-5 flex flex-col items-center justify-center gap-3 sm:flex-row lg:mt-5">
          <a
            href="/signup"
            className="inline-flex items-center gap-1.5 rounded-full bg-[#7c3aed] px-6 py-3 text-sm font-medium text-white shadow-md shadow-[#7c3aed]/25 outline-none transition duration-200 hover:-translate-y-0.5 hover:bg-[#6d28d9] focus-visible:ring-2 focus-visible:ring-[#7c3aed]/50 focus-visible:ring-offset-2"
            suppressHydrationWarning
          >
            Try for Free
            <ArrowUpRight className="size-3.5" />
          </a>
          <a
            href="#solutions"
            className="inline-flex items-center gap-1.5 rounded-full border border-[#7c3aed]/35 bg-white px-6 py-3 text-sm font-medium text-[#7c3aed] shadow-xs outline-none transition duration-200 hover:-translate-y-0.5 hover:border-[#7c3aed] hover:bg-[#7c3aed]/5 focus-visible:ring-2 focus-visible:ring-[#7c3aed]/50 focus-visible:ring-offset-2"
          >
            See How It Works
            <ArrowUpRight className="size-3.5" />
          </a>
        </div>
      </div>

      {/* ── Large visual card ── */}
      <div
        className="animate-fade-up relative mx-auto mt-6 w-full flex-1 overflow-hidden rounded-[20px] lg:mt-5"
        style={{ animationDelay: "120ms" }}
      >
        {/* Real hero photo */}
        <Image
          src="/hero-artist.jpg"
          alt="Artist professional working at laptop in a warm studio"
          fill
          priority
          className="object-cover object-center"
          sizes="(max-width: 1100px) 100vw, 1100px"
        />

        {/* Left-side gradient overlay — keeps text legible over bokeh */}
        <div className="absolute inset-0 bg-[linear-gradient(95deg,rgba(4,3,2,0.72)_0%,rgba(4,3,2,0.40)_35%,rgba(4,3,2,0.10)_55%,transparent_68%)]" />
        {/* Bottom vignette */}
        <div className="absolute inset-0 bg-[linear-gradient(0deg,rgba(0,0,0,0.38)_0%,transparent_45%)]" />

        {/* ── Top-left badge cluster ── */}
        <div className="animate-fade-up absolute left-4 top-4 z-10 flex items-center gap-2 sm:left-5 sm:top-5">
          <span className="inline-flex h-7 items-center rounded-full bg-white/20 px-3 text-[0.6rem] font-semibold uppercase tracking-widest text-white/90 backdrop-blur-sm">
            Event
          </span>
          <span className="inline-flex h-7 items-center gap-1 rounded-full bg-white/90 px-3 text-[0.65rem] font-medium text-[#0a0a0a] backdrop-blur-sm">
            Book a session
            <ArrowUpRight className="size-3" />
          </span>
        </div>

        {/* ── Top-right pill ── */}
        <a
          href="#features"
          className="animate-fade-up absolute right-4 top-4 z-10 inline-flex h-8 items-center gap-1 rounded-full bg-white/15 px-3.5 text-[0.68rem] font-medium text-white outline-none backdrop-blur-md transition hover:bg-white/25 focus-visible:ring-2 focus-visible:ring-white/70 sm:right-5 sm:top-5"
          style={{ animationDelay: "80ms" }}
        >
          Match yours
          <ArrowUpRight className="size-3" />
        </a>

        {/* ── Bottom bar — text left, profession badges right ── */}
        <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col gap-3 px-4 pb-5 sm:px-6 sm:pb-6 lg:flex-row lg:items-end lg:justify-between lg:gap-4 lg:px-8 lg:pb-7">
          {/* Left: text */}
          <div
            className="animate-fade-up min-w-0 max-w-[240px] flex-shrink-0 sm:max-w-[300px] lg:max-w-[360px]"
            style={{ animationDelay: "160ms" }}
          >
            <span className="inline-flex items-center rounded-full bg-white/15 px-3 py-1 text-[0.6rem] font-medium text-white/85 backdrop-blur-sm">
              Artist Bookings
            </span>
            <h2 className="mt-2 text-[1.2rem] font-semibold leading-[1.1] tracking-[-0.025em] text-white sm:text-[1.4rem] lg:text-[1.65rem]">
              Efficiently manage your
              <br />
              artist business.
            </h2>
            <p className="mt-1.5 text-[0.62rem] leading-[1.5] text-white/70 sm:text-[0.68rem]">
              ArtistOS automates bookings, payments and client management
              so you stay focused on your craft.
            </p>
          </div>

          {/* Right: profession badges — hidden on mobile, wrap on sm+ */}
          <div
            className="animate-fade-up flex flex-wrap gap-1.5 sm:gap-2 lg:max-w-[480px] lg:justify-end"
            style={{ animationDelay: "200ms" }}
          >
            {heroProfessions.map((p) => (
              <span
                key={p.label}
                className="inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-[0.63rem] font-semibold text-[#161616] shadow-[0_2px_12px_rgba(0,0,0,0.10)] backdrop-blur-sm transition-transform duration-200 hover:-translate-y-0.5"
                style={{ animationDelay: p.delay }}
              >
                <span className="text-sm leading-none">{p.emoji}</span>
                {p.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
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
                    className={`relative flex min-h-[480px] w-[82vw] max-w-[330px] shrink-0 snap-start flex-col overflow-hidden rounded-[2rem] p-7 shadow-xl transition ${isFeatured
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
                  className={`relative flex min-h-[480px] flex-col overflow-hidden rounded-[2rem] p-7 shadow-xl transition duration-300 hover:-translate-y-2 hover:shadow-2xl ${isFeatured
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
        <div className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest mb-4 ${isFeatured ? "bg-white/15 text-white" : "bg-[#f3e8ff] text-[#7c3aed]"
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
              <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ${isFeatured ? "bg-white/20 text-white" : "bg-emerald-50 text-emerald-700"
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
            <span className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full ${isFeatured ? "bg-white/20" : "bg-[#f3e8ff]"
              }`}>
              <CheckCircle2 className={`size-3 ${isFeatured ? "text-white" : "text-[#7c3aed]"}`} />
            </span>
            <span className={`text-sm leading-6 ${isFeatured ? "text-white/85" : "text-[#3d4169]"}`}>{feature}</span>
          </div>
        ))}
      </div>

      {/* CTA */}
      <a
        href={plan.name.toLowerCase() === 'custom' ? "#cta" : "/login?next=/billing"}
        className={`mt-7 inline-flex h-12 items-center justify-center gap-2 rounded-full px-6 text-sm font-bold tracking-wide transition-all duration-200 ${isFeatured
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

function FaqSection() {
  const faqs = [
    {
      q: "What is ArtistOS?",
      a: "ArtistOS is India's #1 all-in-one business management platform designed for artists — nail artists, mehendi artists, bridal makeup artists, salon owners, and beauty freelancers. It brings bookings, client CRM, portfolio, payments, WhatsApp campaigns, and analytics into one powerful dashboard.",
    },
    {
      q: "Who is ArtistOS for?",
      a: "ArtistOS is built for any beauty professional: nail artists, nail art studio owners, mehendi / henna artists, bridal makeup artists, hair stylists, eyelash artists, salon owners, beauty academy owners, and solo beauty freelancers across India.",
    },
    {
      q: "How much does ArtistOS cost?",
      a: "ArtistOS starts at just ₹249/month. The yearly plan is ₹2799/year — saving you over 40%. Both plans include booking calendar, client CRM, portfolio gallery, payment tracking, WhatsApp campaigns, and business reports. A custom white-label plan is available for salons, studios, and beauty academies.",
    },
    {
      q: "Can ArtistOS manage my bookings and appointments?",
      a: "Yes. ArtistOS has a full appointment booking calendar so artists can schedule services, set time slots, avoid double bookings, send reminders, and track booking history — all in one place.",
    },
    {
      q: "Does ArtistOS support WhatsApp marketing?",
      a: "Yes. ArtistOS includes WhatsApp broadcast tools so nail artists, mehendi artists, and beauty professionals can send festival offers, birthday messages, repeat-client promotions, and payment reminders directly from the platform.",
    },
    {
      q: "Is ArtistOS available in India?",
      a: "Yes. ArtistOS (artistos.in) is made in India and built for Indian artists. It supports ₹ INR pricing, GST-inclusive invoicing, and is optimised for the Indian beauty and salon market.",
    },
  ]

  return (
    <section id="faq" className="px-6 py-20 sm:px-12 lg:px-20">
      <SectionHeading
        eyebrow="FAQ"
        title="Frequently asked questions about ArtistOS"
        description="Everything you need to know about the ArtistOS artist business platform."
        className="animate-fade-up"
      />
      <div className="mt-12 mx-auto max-w-3xl divide-y divide-[#edf0fa]">
        {faqs.map((faq) => (
          <div key={faq.q} className="py-6">
            <h3 className="text-base font-semibold text-[#232542]">{faq.q}</h3>
            <p className="mt-3 text-sm leading-7 text-[#5d6078]">{faq.a}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

function KeywordSection() {
  const keywords = [
    "ArtistOS", "Artist OS", "artistos.in", "Nail Artist App", "Mehendi Artist App",
    "Bridal Makeup Artist Software", "Beauty Salon Management", "artist CRM",
    "Salon Booking Software India", "Beauty Freelancer App", "Nail Art Portfolio",
    "Mehendi Booking App", "WhatsApp Marketing Beauty", "Beauty Business Dashboard",
    "Makeup Artist Portfolio", "Henna Artist App", "Salon Payment Tracking",
    "Artist Business Software", "Beauty Studio App", "Nail Salon Software India",
    "Beauty Appointment Booking", "Artist Invoice App", "Beauty Analytics Dashboard",
    "Salon CRM India", "artist Platform India",
  ]

  return (
    <section className="px-6 py-12 sm:px-12 lg:px-20 bg-[#faf9ff]">
      <p className="mb-5 text-center text-xs font-semibold uppercase tracking-widest text-[#9096b5]">
        ArtistOS — Built for every beauty professional
      </p>
      <div className="flex flex-wrap justify-center gap-2.5">
        {keywords.map((kw) => (
          <span
            key={kw}
            className="rounded-full border border-[#e8e4ff] bg-white px-3.5 py-1.5 text-xs font-medium text-[#5a5f80] shadow-sm"
          >
            {kw}
          </span>
        ))}
      </div>
    </section>
  )
}

function FinalCta() {
  return (
    <section id="cta" className="px-6 py-16 sm:px-12 lg:px-20">
      <div className="relative overflow-hidden rounded-md bg-[#7c3aed] px-8 py-14 text-center text-white">
        <div className="absolute left-8 top-8 h-24 w-24 rotate-45 border border-white/20" />
        <div className="absolute bottom-8 right-10 h-28 w-28 rotate-45 border border-white/20" />
        <h2 className="relative mx-auto max-w-xl text-3xl font-semibold leading-tight sm:text-4xl">
          Make your artist business unstoppable with ArtistOS
        </h2>
        <p className="relative mt-4 mx-auto max-w-lg text-sm text-white/70">
          Join thousands of nail artists, mehendi artists, bridal makeup artists, and beauty professionals across India who use ArtistOS to grow their business every day.
        </p>
        <div className="relative mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <a
            href="/signup"
            className="inline-flex h-10 items-center justify-center rounded-md bg-white px-5 text-sm font-semibold text-[#7c3aed]"
            suppressHydrationWarning
          >
            Try ArtistOS Free
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
            ArtistOS (artistos.in) is India&apos;s leading business management software for artists — nail artists, mehendi artists, bridal makeup artists, salon owners, and beauty freelancers.
          </p>
          <p className="mt-3 max-w-xs text-xs leading-5 text-[#9096b5]">
            Manage bookings, client CRM, portfolio, payments, WhatsApp campaigns, and analytics — all in one platform.
          </p>
        </div>
        <div className="grid gap-8 text-sm sm:grid-cols-3">
          {[
            ["Product", "Booking Calendar", "Client CRM", "Portfolio Gallery", "Payment Tracking", "WhatsApp Campaigns", "Business Reports"],
            ["Company", "About ArtistOS", "Privacy Policy", "Terms of Service", "Contact Us"],
            ["Resources", "Nail Artist Guide", "Mehendi Artist Tips", "Beauty Business Blog", "Salon Management Tools", "Support"],
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
      <div className="bg-[#202344] px-5 py-4 text-xs text-white/70 flex flex-wrap justify-between gap-2">
        <span>© 2026 ArtistOS (artistos.in). All rights reserved. Built in India 🇮🇳 for artists.</span>
        <span className="text-white/40">Nail Artist App · Mehendi Artist App · Bridal Artist Software · Beauty Salon Management</span>
      </div>
    </footer>
  )
}
