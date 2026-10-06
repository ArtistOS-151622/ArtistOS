"use client"
// next/image used inside Hero for the background photo


import {
  ArrowRight,
  ArrowUpRight,
  CalendarCheck2,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  GalleryHorizontalEnd,
  Gift,
  HardDrive,
  LineChart,
  Search,
  ShieldCheck,
  Sparkles,
  UsersRound,
  X,
  Zap,
} from "lucide-react"
import { useEffect, useRef, useState } from "react"
import useSWR from "swr"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Skeleton } from "@/components/ui/skeleton"

import Image from "next/image"
import { useScrollReveal } from "@/lib/hooks/use-scroll-reveal"
import { BrandLogo } from "@/components/common/brand/brand-logo"
import { NavLink } from "@/components/common/shared/nav-link"
import { PrimaryButton } from "@/components/common/shared/primary-button"
import { OutlineButton } from "@/components/common/shared/outline-button"
import { CheckItem } from "@/components/common/shared/check-item"
import { TestimonialCard } from "@/components/common/landing/testimonial-card"
import { FloatingClientChip } from "@/components/common/landing/floating-client-chip"
import { Footer } from "@/components/common/marketing/footer"
import { SeoContentSection } from "@/components/common/marketing/seo-content-section"

const productFeatures = [
  {
    key: "dashboard",
    icon: LineChart,
    tag: "Dashboard",
    title: "Your whole business, one screen.",
    text: "Track active clients, new bookings, revenue, and client satisfaction at a glance — with live appointment trends and revenue-source breakdowns so you always know where you stand.",
    points: ["Real-time revenue & booking stats", "Yearly appointment trend chart", "Revenue source distribution"],
    image: "/features/dashboard.png",
    accent: "#7c3aed",
    bg: "#f5f3ff",
  },
  {
    key: "customers",
    icon: UsersRound,
    tag: "Client CRM",
    title: "Never lose a client's history again.",
    text: "Every customer's contact details, address, and full booking history live in one searchable place — so follow-ups, repeat bookings, and broadcasts are effortless.",
    points: ["Searchable client directory", "Call, chat & WhatsApp shortcuts", "Booking count per customer"],
    image: "/features/customers.png",
    accent: "#2f8fe0",
    bg: "#edf8ff",
  },
  {
    key: "services",
    icon: Gift,
    tag: "Services",
    title: "Price and manage every service you offer.",
    text: "Set up your full service menu — duration, rate, and category — once, then reuse it instantly across every booking without retyping a thing.",
    points: ["Custom rates & durations", "Organized service categories", "Instantly reusable in bookings"],
    image: "/features/services.png",
    accent: "#e0862f",
    bg: "#fff6ec",
  },
  {
    key: "bookings",
    icon: CalendarCheck2,
    tag: "Bookings",
    title: "A calendar that never double-books you.",
    text: "See every appointment for the day, its status, services, and payment total — switch between day and month views and jump straight into a new booking in seconds.",
    points: ["Day & calendar month views", "Status, services & pricing at a glance", "One-tap new booking"],
    image: "/features/bookings.png",
    accent: "#7c3aed",
    bg: "#f5f3ff",
  },
  {
    key: "portfolio",
    icon: GalleryHorizontalEnd,
    tag: "Portfolio",
    title: "A gallery clients actually want to browse.",
    text: "Organize your nail, mehendi, bridal, and beauty work into folders per client or category, then share a private link — all backed by generous cloud storage.",
    points: ["Folder-based organization", "Shareable client links", "Built-in storage meter"],
    image: "/features/portfolio.png",
    accent: "#23a982",
    bg: "#ecfff8",
  },
  {
    key: "reports",
    icon: Search,
    tag: "Reports",
    title: "Know exactly who owes you what.",
    text: "See total billed, collected, and outstanding dues across every customer — sorted by recent activity so you know exactly who to follow up with next.",
    points: ["Total billed vs. collected", "Outstanding dues per client", "Customers, services & payments tabs"],
    image: "/features/reports.png",
    accent: "#d23f6e",
    bg: "#fff0f4",
  },
]

const businessStats = [
  { value: "120k+", label: "client records organized" },
  { value: "150k+", label: "booking reminders sent" },
  { value: "130k+", label: "payments tracked" },
  { value: "165k+", label: "portfolio views created" },
]

const testimonials = [
  {
    name: "Riya Mehta",
    role: "Nail Artist",
    location: "Pune",
    text: "I used to lose track of who booked what between WhatsApp and my diary. Now every client's history is in one place — I stopped double-booking completely, and my repeat clients went from 12 to 31 in four months.",
    highlight: "31 repeat clients",
    accent: "#7c3aed",
  },
  {
    name: "Ayesha Khan",
    role: "Mehendi Artist",
    location: "Hyderabad",
    text: "Before Karva Chauth I sent one broadcast to my repeat clients. Nine of them booked the same week. I'd have never remembered to message them all one by one.",
    highlight: "9 bookings from 1 message",
    accent: "#23a982",
  },
  {
    name: "Neha Sharma",
    role: "Bridal Makeup Artist",
    location: "Jaipur",
    text: "Brides always ask to see similar work. Now I just send a private portfolio link with their category — engagement, reception, bridal — instead of scrolling my gallery on a call.",
    highlight: "Shares work in seconds",
    accent: "#d23f6e",
  },
  {
    name: "Kavya Pillai",
    role: "Beauty Studio Owner",
    location: "Kochi",
    text: "Running two artists plus myself, I never knew who owed what. The dues report showed ₹25,000 pending that I'd genuinely forgotten about. Collected most of it in two weeks.",
    highlight: "₹25,000 in dues recovered",
    accent: "#e0862f",
  },
  {
    name: "Sana Qureshi",
    role: "Makeup Artist",
    location: "Lucknow",
    text: "The birthday reminders are my favourite thing. Clients get a wish plus a small offer, and a good number come back that same month without me lifting a finger.",
    highlight: "Automated birthday offers",
    accent: "#2f8fe0",
  },
  {
    name: "Isha Verma",
    role: "Mehendi Artist",
    location: "Indore",
    text: "Festival season used to be pure chaos. Now I open the calendar and see the whole month — who's confirmed, who still owes advance, which slots are free.",
    highlight: "Whole month at a glance",
    accent: "#7c3aed",
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
  billing_period?: string
  description: string
  features: string[]
  cta?: string
  featured?: boolean
  is_featured?: boolean
  has_whatsapp_automation?: boolean
  storage_quota_mb?: number
}

/**
 * Marketing-only free trial card shown first in the pricing section.
 * Not a row in `platform_subscriptions` — its CTA goes to signup, not checkout.
 */
const freeTrialPlan: PricingPlan = {
  id: 0,
  name: "Free Trial",
  price: "₹0",
  period: "for 30 days",
  billing_period: "/30 days",
  amount_inr: 0,
  description: "Try every core business tool free for 30 days. No credit card required to start.",
  features: [
    "Booking Calendar & Appointments",
    "Client CRM & Booking History",
    "Service & Pricing Management",
    "Payment & Invoice Tracking",
    "Public Booking & Inquiry Form",
    "10 MB Free Storage Quota",
    "WhatsApp OTP Verification (for everyone)",
    "No Automated WhatsApp Notifications",
  ],
  cta: "Start 30-Day Free Trial",
  is_featured: false,
  has_whatsapp_automation: false,
  storage_quota_mb: 10,
}

export default function Home() {
  useScrollReveal()

  return (
    <main className="min-h-svh bg-white text-[#1f213f]">
      {/* Above-fold: header + hero together = exactly one viewport height on all screens */}
      <div className="flex h-svh flex-col overflow-hidden bg-white">
        <Header />
        <Hero />
      </div>
      <Features />
      <div className="overflow-hidden bg-white">
        <BusinessSection />
        <SyncSection />
        <PricingSection />
        <Testimonials />
        <FaqSection />
        <KeywordSection />
        <SeoContentSection />
        <FinalCta />
        <Footer />
      </div>
    </main>
  )
}

function Header() {
  return (
    <header className="flex items-center justify-between px-5 py-4 sm:px-8 lg:px-10">
      <BrandLogo imageClassName="h-12" priority />

      <nav className="hidden items-center gap-8 text-sm font-medium text-[#4a4a4a] lg:flex">
        <NavLink href="#features">Product</NavLink>
        <NavLink href="#solutions">Features</NavLink>
        <NavLink href="#pricing">Pricing</NavLink>
        <NavLink href="#faq">FAQ</NavLink>
        <NavLink href="/contact">Contact</NavLink>
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
  { label: "Makeup Artist", emoji: "💄", delay: "0ms" },
  { label: "Nail Artist", emoji: "💅", delay: "60ms" },
  { label: "Bridal Artist", emoji: "👰", delay: "120ms" },
  { label: "Mehendi Artist", emoji: "🌿", delay: "180ms" },
  { label: "Salon Owner", emoji: "✂️", delay: "240ms" },
  { label: "Beauty Studio", emoji: "🪞", delay: "300ms" },
  { label: "Hair Stylist", emoji: "💇", delay: "360ms" },
  { label: "Lash Artist", emoji: "👁️", delay: "420ms" },
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
        className={`inline-block font-serif italic font-normal tracking-normal text-transparent bg-clip-text bg-gradient-to-r from-[#7c3aed] via-[#9333ea] to-[#a855f7] transition-all duration-350 ease-out transform min-h-[1.2em] ${animating
          ? "opacity-0 -translate-y-2 blur-[1px]"
          : "opacity-100 translate-y-0 blur-0"
          }`}
      >
        {rotatingHeroPhrases[index]}
      </span>
      {/* Hand-drawn curved swoosh underline */}
      <svg
        className={`pointer-events-none absolute -bottom-1 sm:-bottom-2 left-0 w-full h-[10px] sm:h-[13px] overflow-visible transition-all duration-300 ${animating ? "opacity-25 scale-x-90" : "opacity-100 scale-x-100"
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

        <div className="mt-5 flex flex-row items-center justify-center gap-2.5 sm:gap-3 lg:mt-5">
          <a
            href="/signup"
            className="inline-flex items-center gap-1 sm:gap-1.5 rounded-full bg-[#7c3aed] px-4 py-2.5 text-xs font-medium text-white shadow-md shadow-[#7c3aed]/25 outline-none transition duration-200 hover:-translate-y-0.5 hover:bg-[#6d28d9] focus-visible:ring-2 focus-visible:ring-[#7c3aed]/50 focus-visible:ring-offset-2 sm:px-6 sm:py-3 sm:text-sm"
            suppressHydrationWarning
          >
            Try for Free
            <ArrowUpRight className="size-3 sm:size-3.5" />
          </a>
          <a
            href="#solutions"
            className="inline-flex items-center gap-1 sm:gap-1.5 rounded-full border border-[#7c3aed]/35 bg-white px-4 py-2.5 text-xs font-medium text-[#7c3aed] shadow-xs outline-none transition duration-200 hover:-translate-y-0.5 hover:border-[#7c3aed] hover:bg-[#7c3aed]/5 focus-visible:ring-2 focus-visible:ring-[#7c3aed]/50 focus-visible:ring-offset-2 sm:px-6 sm:py-3 sm:text-sm"
          >
            See How It Works
            <ArrowUpRight className="size-3 sm:size-3.5" />
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
          quality={100}
          className="object-cover object-center"
          sizes="100vw"
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

function Features() {
  const sectionRef = useRef<HTMLElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const [isDesktop, setIsDesktop] = useState(false)
  const count = productFeatures.length

  useEffect(() => {
    const mql = window.matchMedia("(min-width: 1024px)")
    const onChange = () => setIsDesktop(mql.matches)
    onChange()
    mql.addEventListener("change", onChange)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  useEffect(() => {
    if (!isDesktop) return
    const section = sectionRef.current
    const track = trackRef.current
    if (!section || !track) return

    let raf = 0

    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const rect = section.getBoundingClientRect()
        const scrollable = section.offsetHeight - window.innerHeight
        const progress = scrollable > 0 ? Math.min(1, Math.max(0, -rect.top / scrollable)) : 0

        track.style.transform = `translate3d(-${(progress * (count - 1) * 100) / count}%, 0, 0)`
        setActiveIndex(Math.min(count - 1, Math.round(progress * (count - 1))))
      })
    }

    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    window.addEventListener("resize", onScroll)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener("scroll", onScroll)
      window.removeEventListener("resize", onScroll)
    }
  }, [count, isDesktop])

  const scrollToIndex = (index: number) => {
    const section = sectionRef.current
    if (!section) return
    const scrollable = section.offsetHeight - window.innerHeight
    const target = section.offsetTop + (scrollable * index) / (count - 1)
    window.scrollTo({ top: target, behavior: "smooth" })
  }

  return (
    <section
      id="features"
      ref={sectionRef}
      className="relative"
      style={{ height: isDesktop ? `${count * 100}vh` : "auto" }}
    >
      <div className="py-16 sm:py-20 lg:sticky lg:top-0 lg:flex lg:h-svh lg:flex-col lg:justify-center lg:overflow-hidden lg:py-10">
        <div data-reveal="blur-in" className="mx-auto px-6 text-center sm:px-12 lg:px-20">
          <p className="text-sm font-semibold text-primary">Inside ArtistOS</p>
          <h2 className="mt-3 text-[1.85rem] font-semibold tracking-tight text-[#282a47] sm:text-4xl lg:whitespace-nowrap lg:text-5xl">
            Everything your business needs, <span className="text-[#7c3aed]">built in</span>
          </h2>
        </div>

        {/* Desktop: pinned horizontal scroll-jack track */}
        <div className="relative mt-8 hidden flex-1 overflow-hidden lg:block">
          <div
            ref={trackRef}
            className="flex h-full will-change-transform"
            style={{ width: `${count * 100}%` }}
          >
            {productFeatures.map((feature, i) => (
              <FeatureSlide
                key={feature.key}
                feature={feature}
                index={i}
                active={i === activeIndex}
                widthPercent={100 / count}
              />
            ))}
          </div>
        </div>

        {/* Progress dots — desktop only, driven by scroll */}
        <div className="mt-6 hidden items-center justify-center gap-2 lg:flex">
          {productFeatures.map((f, i) => (
            <button
              key={f.key}
              onClick={() => scrollToIndex(i)}
              aria-label={`Go to ${f.tag}`}
              className={`h-1.5 rounded-full transition-all duration-300 ${i === activeIndex ? "w-8 bg-[#7c3aed]" : "w-1.5 bg-[#d9d5f5] hover:bg-[#b9aef0]"
                }`}
            />
          ))}
        </div>

        {/* Mobile / tablet: swipeable carousel */}
        <div className="mt-8 lg:hidden">
          <MobileFeatureCarousel />
        </div>
      </div>
    </section>
  )
}

function MobileFeatureCarousel() {
  const trackRef = useRef<HTMLDivElement>(null)
  const [activeIndex, setActiveIndex] = useState(0)

  const onScroll = () => {
    const track = trackRef.current
    if (!track) return
    const index = Math.round(track.scrollLeft / track.clientWidth)
    setActiveIndex(Math.min(productFeatures.length - 1, Math.max(0, index)))
  }

  const scrollToIndex = (index: number) => {
    const track = trackRef.current
    if (!track) return
    track.scrollTo({ left: index * track.clientWidth, behavior: "smooth" })
  }

  return (
    <div>
      <div
        ref={trackRef}
        onScroll={onScroll}
        className="flex snap-x snap-mandatory gap-0 overflow-x-auto scroll-smooth custom-scrollbar"
      >
        {productFeatures.map((feature) => (
          <div key={feature.key} className="w-full shrink-0 snap-start px-6 sm:px-12">
            <MobileFeatureCard feature={feature} />
          </div>
        ))}
      </div>

      <div className="mt-6 flex items-center justify-center gap-2">
        {productFeatures.map((f, i) => (
          <button
            key={f.key}
            onClick={() => scrollToIndex(i)}
            aria-label={`Go to ${f.tag}`}
            className={`h-1.5 rounded-full transition-all duration-300 ${i === activeIndex ? "w-8 bg-[#7c3aed]" : "w-1.5 bg-[#d9d5f5]"
              }`}
          />
        ))}
      </div>
    </div>
  )
}

function MobileFeatureCard({ feature }: { feature: ProductFeature }) {
  return (
    <div>
      <div
        className="relative overflow-hidden rounded-[1.25rem] border border-[#eaecf5] bg-[#f7f8ff] shadow-xl shadow-[#9ba0b8]/20"
        style={{ aspectRatio: "16 / 11" }}
      >
        <div className="flex items-center gap-1.5 border-b border-[#edf0fa] bg-white px-3 py-2">
          <span className="size-1.5 rounded-full bg-[#ff7a90]" />
          <span className="size-1.5 rounded-full bg-[#ffd166]" />
          <span className="size-1.5 rounded-full bg-[#58d8b6]" />
          <span className="ml-2 truncate rounded-full bg-[#f4f5fb] px-2.5 py-0.5 text-[0.6rem] text-[#9096b5]">
            artistos.in/{feature.key}
          </span>
        </div>
        <div className="relative h-full w-full">
          <Image
            src={feature.image}
            alt={`ArtistOS ${feature.tag} screen`}
            fill
            className="object-cover object-top"
            sizes="100vw"
          />
        </div>
      </div>

      <span
        className="mt-5 inline-flex size-10 items-center justify-center rounded-2xl"
        style={{ backgroundColor: feature.bg, color: feature.accent }}
      >
        <feature.icon className="size-4.5" />
      </span>
      <p className="mt-3 text-xs font-bold uppercase tracking-[0.18em]" style={{ color: feature.accent }}>
        {feature.tag}
      </p>
      <h3 className="mt-2 text-xl font-semibold leading-tight tracking-tight text-[#232542] sm:text-2xl">
        {feature.title}
      </h3>
      <p className="mt-3 leading-6 text-[#666a82]">{feature.text}</p>
      <div className="mt-4 space-y-2.5">
        {feature.points.map((point) => (
          <div key={point} className="flex items-center gap-2.5 text-sm font-semibold text-[#3b3f62]">
            <CheckCircle2 className="size-4 shrink-0" style={{ color: feature.accent }} />
            {point}
          </div>
        ))}
      </div>
    </div>
  )
}

type ProductFeature = (typeof productFeatures)[number]

function FeatureSlide({
  feature,
  index,
  active,
  widthPercent,
}: {
  feature: ProductFeature
  index: number
  active: boolean
  widthPercent: number
}) {
  return (
    <div
      className="flex h-full shrink-0 items-center px-6 sm:px-12 lg:px-20"
      style={{ width: `${widthPercent}%` }}
    >
      <div className="grid w-full max-w-full items-center gap-8 overflow-hidden lg:grid-cols-[0.85fr_1.15fr] lg:gap-14">
        {/* Left: content */}
        <div
          className={`order-2 transition-opacity duration-500 ease-out lg:order-1 ${active ? "opacity-100" : "opacity-40"
            }`}
        >
          <span
            className="inline-flex size-11 items-center justify-center rounded-2xl"
            style={{ backgroundColor: feature.bg, color: feature.accent }}
          >
            <feature.icon className="size-5" />
          </span>
          <p
            className="mt-4 text-xs font-bold uppercase tracking-[0.18em]"
            style={{ color: feature.accent }}
          >
            {String(index + 1).padStart(2, "0")} · {feature.tag}
          </p>
          <h3 className="mt-3 text-2xl font-semibold leading-tight tracking-tight text-[#232542] sm:text-3xl lg:text-[2.15rem]">
            {feature.title}
          </h3>
          <p className="mt-4 max-w-md leading-7 text-[#666a82]">{feature.text}</p>
          <div className="mt-6 space-y-3">
            {feature.points.map((point) => (
              <div key={point} className="flex items-center gap-3 text-sm font-semibold text-[#3b3f62]">
                <CheckCircle2 className="size-4 shrink-0" style={{ color: feature.accent }} />
                {point}
              </div>
            ))}
          </div>
        </div>

        {/* Right: real product screenshot */}
        <div
          className={`order-1 min-w-0 transition-opacity duration-500 ease-out lg:order-2 ${active ? "opacity-100" : "opacity-40"
            }`}
        >
          <div
            className="relative w-full max-w-full overflow-hidden rounded-[1.5rem] border border-[#eaecf5] bg-[#f7f8ff] shadow-2xl shadow-[#9ba0b8]/25 sm:rounded-[1.75rem]"
            style={{ aspectRatio: "16 / 10" }}
          >
            {/* Browser chrome bar */}
            <div className="flex items-center gap-1.5 border-b border-[#edf0fa] bg-white px-4 py-2.5">
              <span className="size-2 rounded-full bg-[#ff7a90]" />
              <span className="size-2 rounded-full bg-[#ffd166]" />
              <span className="size-2 rounded-full bg-[#58d8b6]" />
              <span className="ml-3 truncate rounded-full bg-[#f4f5fb] px-3 py-0.5 text-[0.65rem] text-[#9096b5]">
                artistos.in/{feature.key}
              </span>
            </div>
            <div className="relative h-full w-full">
              <Image
                src={feature.image}
                alt={`ArtistOS ${feature.tag} screen`}
                fill
                className="object-cover object-top"
                sizes="(max-width: 1024px) 100vw, 60vw"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function BusinessSection() {
  return (
    <section id="solutions" className="px-6 py-10 sm:px-12 lg:px-20">
      <div data-reveal="blur-in" className="mx-auto text-center">
        <p className="text-sm font-semibold text-primary">Client CRM</p>
        <h2 className="mt-3 text-4xl font-semibold tracking-tight text-[#282a47] sm:text-5xl">
          Chaos becomes. <span className="text-[#7c3aed]">One clean record</span>
        </h2>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2 lg:gap-8">
        {/* Before: chaos */}
        <div
          data-reveal="slide-left"
          className="relative overflow-hidden rounded-[2rem] bg-[#f4f2f6] p-6 sm:p-10"
        >
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e4e1eb] px-3 py-1 text-xs font-bold uppercase tracking-widest text-[#6b6a78]">
            Before
          </span>
          <p className="mt-3 text-sm font-medium text-[#6b6a78]">
            Client details scattered across WhatsApp, notebooks, and memory.
          </p>

          <div className="relative mt-8 min-h-[320px]">
            <div className="absolute left-[2%] top-0 w-[78%] -rotate-2 rounded-2xl rounded-tl-sm bg-white p-4 shadow-md">
              <p className="text-xs font-semibold text-[#3b3f62]">Heena Kaur</p>
              <p className="mt-1 text-sm text-[#5b5f78]">Hi, can I book mehendi for 24th? 🙏</p>
              <p className="mt-2 text-[0.65rem] text-[#a5a9c0]">WhatsApp · 11:42 PM</p>
            </div>

            <div className="absolute right-[0%] top-[16%] w-[70%] rotate-1 rounded-2xl rounded-tr-sm bg-[#fff8d6] p-4 shadow-md">
              <p className="text-sm text-[#5b5220]">Priyanka – due ₹1300, follow up!!</p>
              <p className="mt-2 text-[0.65rem] text-[#b3a45a]">sticky note</p>
            </div>

            <div className="absolute left-[10%] top-[42%] w-[62%] -rotate-3 rounded-2xl bg-white p-4 shadow-md">
              <p className="text-xs font-semibold text-[#3b3f62]">+91 90909 090XX</p>
              <p className="mt-1 text-sm text-[#5b5f78]">saved as &quot;Bridal client&quot; — name?</p>
              <p className="mt-2 text-[0.65rem] text-[#a5a9c0]">Contacts</p>
            </div>

            <div className="absolute bottom-0 right-[6%] w-[72%] rotate-2 rounded-2xl rounded-br-sm bg-white p-4 shadow-md">
              <p className="text-xs font-semibold text-[#3b3f62]">Notebook, page 14</p>
              <p className="mt-1 text-sm text-[#5b5f78]">Isha — nail art x2, ₹800 paid?</p>
              <p className="mt-2 text-[0.65rem] text-[#a5a9c0]">handwritten</p>
            </div>
          </div>
        </div>

        {/* After: one clean record */}
        <div
          data-reveal="slide-right"
          className="relative overflow-hidden rounded-[2rem] bg-[#f3e8ff] p-6 sm:p-10"
          style={{ animationDelay: "120ms" }}
        >
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#7c3aed] px-3 py-1 text-xs font-bold uppercase tracking-widest text-white">
            After
          </span>
          <p className="mt-3 text-sm font-medium text-[#5b3a9e]">
            Every client, one searchable profile — in ArtistOS.
          </p>

          <div className="relative mt-8 flex min-h-[320px] items-center justify-center">
            <FloatingClientChip
              name="Priyanka Viradiya"
              role="Mehendi · 3 bookings"
              initials="PV"
              gradient="linear-gradient(135deg, #23a982, #58d8b6)"
              className="left-0 top-0 z-100 hidden sm:flex"
            />
            <FloatingClientChip
              name="Isha Vasani"
              role="Nail Art · 1 booking"
              initials="IV"
              gradient="linear-gradient(135deg, #e0862f, #ffb15c)"
              className="right-0 bottom-0 z-100 hidden sm:flex"
              style={{ animationDelay: "300ms" }}
            />

            <div className="relative z-20 w-full max-w-[380px] rounded-3xl bg-white p-6 shadow-2xl shadow-[#7c3aed]/20">
              <div className="flex items-center gap-3">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#7c3aed] to-[#a855f7] text-sm font-semibold text-white">
                  NV
                </span>
                <div className="min-w-0">
                  <p className="truncate font-semibold text-[#232542]">Heena Kaur</p>
                  <p className="truncate text-xs text-[#8b8fa8]">+91 63548 60609 · Mumbai</p>
                </div>
                <span className="ml-auto rounded-full bg-[#f3e8ff] px-3 py-1 text-xs font-semibold text-[#7c3aed]">
                  2 bookings
                </span>
              </div>

              <div className="mt-5 grid grid-cols-3 gap-3 border-y border-[#f0f1f8] py-4">
                <div>
                  <p className="text-lg font-semibold text-[#232542]">₹3,750</p>
                  <p className="mt-0.5 text-[0.7rem] text-[#9096b5]">Total billed</p>
                </div>
                <div>
                  <p className="text-lg font-semibold text-[#23a982]">₹600</p>
                  <p className="mt-0.5 text-[0.7rem] text-[#9096b5]">Paid</p>
                </div>
                <div>
                  <p className="text-lg font-semibold text-[#e0526d]">₹3,150</p>
                  <p className="mt-0.5 text-[0.7rem] text-[#9096b5]">Due</p>
                </div>
              </div>

              <div className="mt-4">
                <p className="text-[0.7rem] font-semibold uppercase tracking-wide text-[#9096b5]">
                  Upcoming booking
                </p>
                <div className="mt-2 flex items-center justify-between rounded-xl bg-[#f7f8ff] px-3.5 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[#3b3f62]">Bridal Mehendi Touch-up</p>
                    <p className="text-xs text-[#8b8fa8]">24 Aug · 2:30 PM</p>
                  </div>
                  <span className="inline-flex items-center rounded-full bg-[#eafaf4] px-2.5 py-1 text-[0.65rem] font-semibold text-[#23a982]">
                    Confirmed
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div data-reveal="rise" className="mt-10 flex flex-col items-center gap-6 text-center">
        <div className="flex flex-wrap justify-center gap-x-8 gap-y-3">
          {["See every client's full booking & payment history", "Know exactly who owes what, at a glance", "Never miss a repeat-booking follow-up"].map((item) => (
            <CheckItem key={item} text={item} />
          ))}
        </div>
      </div>
    </section>
  )
}

const campaignReplies = [
  { name: "Ayesha K.", initials: "AK", text: "Yes! Book me for the 24th 🙌", time: "10:12 AM" },
  { name: "Riya M.", initials: "RM", text: "Is the bridal package included?", time: "10:19 AM" },
  { name: "Isha V.", initials: "IV", text: "Sending advance now, save my slot", time: "10:31 AM" },
]

function SyncSection() {
  return (
    <section className="px-6 py-16 sm:px-12 lg:px-20">
      <div data-reveal="blur-in" className="mx-auto max-w-3xl text-center">
        <p className="text-sm font-semibold text-primary">WhatsApp Campaigns</p>
        <h2 className="mt-3 text-4xl font-semibold tracking-tight text-[#282a47] sm:text-5xl">
          One message. <span className="text-[#7c3aed]">Nine bookings.</span>
        </h2>
      </div>

      <div className="mt-14 grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
        {/* Chat thread */}
        <div data-reveal="zoom" className="relative mx-auto w-full max-w-[520px]">
          <div className="overflow-hidden rounded-[1.75rem] border border-[#e6e9f5] bg-[#efe7dd] shadow-2xl shadow-[#9ba0b8]/25">
            {/* Chat header */}
            <div className="flex items-center gap-3 bg-[#075e54] px-5 py-3.5">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/15 text-xs font-semibold text-white">
                42
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">Repeat bridal clients</p>
                <p className="truncate text-[0.7rem] text-white/70">Broadcast list · 42 recipients</p>
              </div>
              <span className="ml-auto shrink-0 rounded-full bg-white/15 px-2.5 py-1 text-[0.6rem] font-semibold uppercase tracking-wider text-white">
                Sent
              </span>
            </div>

            {/* Messages */}
            <div className="space-y-3 px-4 pb-16 pt-5 sm:px-5">
              {/* Outgoing broadcast */}
              <div className="flex justify-end">
                <div className="max-w-[82%] rounded-2xl rounded-tr-sm bg-[#dcf8c6] px-4 py-3 shadow-sm">
                  <p className="text-sm leading-6 text-[#1f2c23]">
                    🎉 Diwali special — 20% off bridal mehendi this month. Book your slot
                    before the calendar fills up!
                  </p>
                  <p className="mt-1.5 text-right text-[0.62rem] text-[#5c7a63]">
                    10:04 AM · sent from ArtistOS ✓✓
                  </p>
                </div>
              </div>

              {/* Incoming replies */}
              {campaignReplies.map((reply, i) => (
                <div
                  key={reply.name}
                  data-reveal="pop"
                  className="flex items-end gap-2"
                  style={{ animationDelay: `${260 + i * 200}ms` }}
                >
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#7c3aed] to-[#a855f7] text-[0.6rem] font-semibold text-white">
                    {reply.initials}
                  </span>
                  <div className="max-w-[78%] rounded-2xl rounded-bl-sm bg-white px-4 py-2.5 shadow-sm">
                    <p className="text-[0.68rem] font-semibold text-[#7c3aed]">{reply.name}</p>
                    <p className="mt-0.5 text-sm leading-6 text-[#2b2f47]">{reply.text}</p>
                    <p className="mt-1 text-right text-[0.62rem] text-[#a5a9c0]">{reply.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Outcome badge */}
          <div
            data-reveal="pop"
            className="absolute -bottom-5 right-2 flex items-center gap-3 rounded-2xl bg-white px-5 py-3.5 shadow-2xl shadow-[#7c3aed]/20 sm:-right-4"
            style={{ animationDelay: "900ms" }}
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#f3e8ff] text-[#7c3aed]">
              <CalendarCheck2 className="size-5" />
            </span>
            <div>
              <p className="text-xl font-semibold leading-none text-[#232542]">9 bookings</p>
              <p className="mt-1 text-[0.7rem] text-[#9096b5]">from one broadcast</p>
            </div>
          </div>
        </div>

        {/* Copy */}
        <div data-reveal="slide-right" style={{ animationDelay: "160ms" }}>
          <h3 className="text-2xl font-semibold leading-tight tracking-tight text-[#232542] sm:text-3xl">
            Your clients already live on WhatsApp. Meet them there.
          </h3>
          <p className="mt-4 max-w-md leading-7 text-[#666a82]">
            Pick an audience from your CRM — repeat bridal clients, birthdays this week,
            anyone with dues — write once, and send. Replies land straight in your chat,
            bookings land straight in your calendar.
          </p>

          <div className="mt-7 space-y-3">
            {[
              "Target by booking history, service, or dues",
              "Festival offers, birthday wishes & payment reminders",
              "Track sent, read, and booked for every campaign",
            ].map((item) => (
              <CheckItem key={item} text={item} />
            ))}
          </div>

          <div className="mt-8 flex flex-wrap gap-2">
            {["Festival offers", "Birthday wishes", "Payment reminders", "Repeat-client promos"].map((chip) => (
              <span
                key={chip}
                className="rounded-full border border-[#e8e4ff] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#5a5f80] shadow-sm"
              >
                {chip}
              </span>
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

function PricingSection() {
  const { data: plans, isLoading } = useSWR<PricingPlan[]>("/api/platform-subscriptions", fetcher)
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly")

  // Use plans loaded dynamically from the database
  const displayPlans = plans && Array.isArray(plans) ? plans : []

  // Filter plans based on the active billing cycle
  const cyclePlans = displayPlans.filter((plan) => {
    const period = (plan.billing_period || plan.period || "").toLowerCase()
    return billingCycle === "yearly" ? period.includes("year") : period.includes("month")
  })

  // Hardcoded Free Trial is shown first, followed by dynamic DB paid plans
  const allCards = [freeTrialPlan, ...cyclePlans]

  return (
    <section id="pricing" className="px-6 py-16 sm:px-12 lg:px-20 bg-gradient-to-b from-[#fbfcff] to-white">
      <div data-reveal="blur-in" className="mx-auto max-w-3xl text-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-purple-50 border border-purple-200/60 px-3.5 py-1 text-xs font-semibold text-[#7c3aed] mb-3">
          <Sparkles className="size-3.5" />
          <span>Simple, Transparent Pricing</span>
        </div>
        <h2 className="mt-2 text-4xl font-bold tracking-tight text-[#1a1d3a] sm:text-5xl">
          Choose the plan that fits <span className="text-[#7c3aed]">your studio</span>
        </h2>
        <p className="mt-3 text-base text-slate-500 max-w-xl mx-auto">
          Start with a 30-day free trial on signup. Upgrade anytime as your clientele grows.
        </p>

        {/* Toggle Switch */}
        <div className="mt-8 flex items-center justify-center">
          <div className="inline-flex items-center rounded-full bg-slate-100/90 p-1.5 border border-slate-200 shadow-inner">
            <button
              type="button"
              onClick={() => setBillingCycle("monthly")}
              className={`rounded-full px-5 py-2 text-xs sm:text-sm font-semibold transition-all duration-200 ${billingCycle === "monthly"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
                }`}
            >
              Monthly billing
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle("yearly")}
              className={`relative flex items-center gap-2 rounded-full px-5 py-2 text-xs sm:text-sm font-semibold transition-all duration-200 ${billingCycle === "yearly"
                  ? "bg-[#7c3aed] text-white shadow-md shadow-purple-600/25"
                  : "text-slate-600 hover:text-slate-900"
                }`}
            >
              <span>Yearly billing</span>
            </button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="mt-12 max-w-6xl mx-auto grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex min-h-[500px] flex-col rounded-[2rem] border border-slate-100 bg-white p-8 shadow-sm">
              <Skeleton className="h-6 w-1/3 mb-4" />
              <Skeleton className="h-10 w-1/2 mb-4" />
              <Skeleton className="h-4 w-3/4 mb-8" />
              <div className="space-y-3 flex-1">
                {[1, 2, 3, 4, 5].map((j) => (
                  <Skeleton key={j} className="h-4 w-full" />
                ))}
              </div>
              <Skeleton className="h-12 w-full mt-6 rounded-full" />
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-12 max-w-6xl mx-auto grid gap-8 sm:grid-cols-2 lg:grid-cols-3 items-stretch">
          {allCards.map((plan) => (
            <PricingCard key={plan.id !== undefined ? plan.id : `${plan.name}-${billingCycle}`} plan={plan} billingCycle={billingCycle} />
          ))}
        </div>
      )}

      {/* Free Trial Banner */}
      <div className="mt-12 max-w-2xl mx-auto rounded-2xl border border-purple-100 bg-purple-50/60 p-4 text-center sm:flex sm:items-center sm:justify-between sm:text-left sm:px-6">
        <div className="flex items-center gap-3 justify-center sm:justify-start">
          <div className="flex size-10 items-center justify-center rounded-xl bg-purple-600 text-white shadow-sm shrink-0">
            <Gift className="size-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900">Try ArtistOS free for 30 days</p>
            <p className="text-xs text-slate-500">Every signup includes complete platform trial. No credit card required.</p>
          </div>
        </div>
        <a
          href="/signup"
          className="mt-3 inline-flex items-center justify-center rounded-xl bg-white border border-purple-200 px-4 py-2 text-xs font-bold text-purple-700 shadow-sm hover:bg-purple-100 transition-colors sm:mt-0 shrink-0"
        >
          Start Free Trial
        </a>
      </div>
    </section>
  )
}


function PricingCard({ plan, billingCycle = "monthly" }: { plan: PricingPlan; billingCycle?: "monthly" | "yearly" }) {
  const isFree = plan.amount_inr === 0 || plan.price === "₹0" || plan.name.toLowerCase().includes("free")
  const isFeatured = !isFree && Boolean(plan.is_featured ?? plan.featured)
  const isPro = !isFree && (Boolean(plan.has_whatsapp_automation) || isFeatured)

  const price = isFree
    ? "₹0"
    : plan.amount_inr !== undefined
      ? `₹${plan.amount_inr.toLocaleString("en-IN")}`
      : plan.price ?? "₹0"
  const compareAtPrice = plan.compare_at_amount_inr ? `₹${plan.compare_at_amount_inr.toLocaleString("en-IN")}` : null
  const periodText = isFree ? "/30 days" : plan.billing_period || (billingCycle === "yearly" ? "/year" : "/month")

  const features = plan.features ?? []
  const badgeText = isFree
    ? "Free on Signup"
    : plan.discount_percentage
      ? `Save ${plan.discount_percentage}%`
      : isFeatured
        ? (billingCycle === "yearly" ? "Best Value" : "Most Popular")
        : "Essential"

  const href = "/signup"
  const ctaLabel = plan.cta || (isFree ? "Start 30-Day Free Trial" : isPro ? "Get Started with Pro" : "Get Started with Starter")

  return (
    <article
      className={`relative flex h-full flex-col overflow-hidden rounded-[2rem] p-8 transition-all duration-300 hover:-translate-y-1 ${isFeatured
          ? "border-2 border-[#7c3aed] bg-[#1a1336] text-white shadow-2xl shadow-purple-950/40 ring-1 ring-[#7c3aed]/40"
          : isFree
            ? "border border-slate-200 bg-slate-50/50 text-slate-900 shadow-sm hover:shadow-md"
            : "border border-slate-200 bg-white text-slate-900 shadow-lg shadow-slate-200/50 hover:shadow-xl"
        }`}
    >
      {/* Decorative Glow for Pro card */}
      {isFeatured && (
        <div className="pointer-events-none absolute -right-20 -top-20 size-56 rounded-full bg-[#7c3aed]/30 blur-3xl" />
      )}

      {/* Card Header */}
      <div className="relative">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span
              className={`text-xs font-extrabold uppercase tracking-widest ${isFeatured ? "text-[#c4b5fd]" : isFree ? "text-slate-600" : "text-[#7c3aed]"
                }`}
            >
              {plan.name}
            </span>
          </div>

          <span
            className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider ${isFeatured
                ? "bg-[#7c3aed] text-white shadow-sm"
                : isFree
                  ? "bg-slate-200 text-slate-700"
                  : "bg-purple-100 text-purple-700"
              }`}
          >
            {badgeText}
          </span>
        </div>

        {/* Pricing block */}
        <div className="mt-4">
          {compareAtPrice && (
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-sm font-semibold line-through ${isFeatured ? "text-white/45" : "text-slate-400"}`}>
                {compareAtPrice}
              </span>
              {plan.discount_percentage ? (
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${isFeatured ? "bg-white/15 text-white" : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    }`}
                >
                  {plan.discount_percentage}% off
                </span>
              ) : null}
            </div>
          )}

          <div className="flex items-baseline gap-1.5">
            <span className={`text-4xl font-extrabold tracking-tight ${isFeatured ? "text-white" : "text-slate-900"}`}>
              {price}
            </span>
            <span className={`text-sm font-medium ${isFeatured ? "text-white/60" : "text-slate-500"}`}>
              {periodText}
            </span>
          </div>
        </div>

        <p className={`mt-3 text-xs leading-relaxed ${isFeatured ? "text-white/70" : "text-slate-500"}`}>
          {plan.description}
        </p>

        {/* Storage & WhatsApp Quota Highlights */}
        <div className="mt-5 space-y-2">
          <div
            className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium ${isFeatured ? "bg-white/10 text-white" : "bg-white text-slate-700 border border-slate-200/80 shadow-xs"
              }`}
          >
            <HardDrive className={`size-4 shrink-0 ${isFeatured ? "text-[#c4b5fd]" : "text-[#7c3aed]"}`} />
            <span>
              <strong>{plan.storage_quota_mb ?? (isPro ? 100 : 10)} MB</strong> Cloud Storage Quota
            </span>
          </div>

          <div
            className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium ${isFeatured
                ? "bg-emerald-500/20 text-emerald-200 border border-emerald-500/30"
                : isPro
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-white text-slate-600 border border-slate-200/80 shadow-xs"
              }`}
          >
            {isPro ? (
              <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
            ) : (
              <X className="size-4 shrink-0 text-slate-400" />
            )}
            <span>
              {isPro
                ? "Automated WhatsApp Confirmations & 24h Reminders"
                : "No Automated WhatsApp Messages (OTP Only)"}
            </span>
          </div>
        </div>
      </div>

      <div className={`my-6 h-px ${isFeatured ? "bg-white/10" : "bg-slate-200/70"}`} />

      {/* Feature list */}
      <div className="flex-1 space-y-2.5">
        <p className={`text-[11px] font-bold uppercase tracking-wider mb-2 ${isFeatured ? "text-white/50" : "text-slate-400"}`}>
          Features Included:
        </p>
        {features.map((feature) => (
          <div key={feature} className="flex items-start gap-2.5">
            <span
              className={`mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full ${isFeatured ? "bg-white/15" : "bg-purple-100"
                }`}
            >
              <Check
                className={`size-2.5 ${isFeatured ? "text-white" : "text-[#7c3aed]"}`}
                strokeWidth={3}
              />
            </span>
            <span className={`text-xs leading-5 ${isFeatured ? "text-white/85" : "text-slate-600"}`}>
              {feature}
            </span>
          </div>
        ))}
      </div>

      {/* CTA Button */}
      <a
        href={href}
        className={`mt-8 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-bold tracking-wide transition-all duration-200 ${isFeatured
            ? "bg-white text-slate-900 shadow-lg shadow-black/20 hover:bg-purple-50"
            : isFree
              ? "bg-slate-900 text-white shadow-md shadow-slate-900/10 hover:bg-slate-800"
              : "bg-[#7c3aed] text-white shadow-md shadow-purple-600/20 hover:bg-[#6d28d9]"
          }`}
      >
        {ctaLabel}
        <ArrowRight className="size-4" />
      </a>
    </article>
  )
}

function Testimonials() {
  const trackRef = useRef<HTMLDivElement>(null)
  const [activeIndex, setActiveIndex] = useState(0)

  const onScroll = () => {
    const track = trackRef.current
    if (!track) return
    const card = track.querySelector("article")
    if (!card) return
    const step = card.getBoundingClientRect().width + 24
    setActiveIndex(Math.min(testimonials.length - 1, Math.max(0, Math.round(track.scrollLeft / step))))
  }

  const scrollByCards = (dir: "left" | "right") => {
    const track = trackRef.current
    if (!track) return
    const card = track.querySelector("article")
    if (!card) return
    const step = card.getBoundingClientRect().width + 24
    track.scrollBy({ left: dir === "right" ? step : -step, behavior: "smooth" })
  }

  const scrollToIndex = (index: number) => {
    const track = trackRef.current
    if (!track) return
    const card = track.querySelector("article")
    if (!card) return
    const step = card.getBoundingClientRect().width + 24
    track.scrollTo({ left: index * step, behavior: "smooth" })
  }

  return (
    <section className="overflow-hidden bg-[#fbfcff] px-6 py-20 sm:px-12 lg:px-20">
      <div data-reveal="blur-in" className="mx-auto max-w-3xl text-center">
        <p className="text-sm font-semibold text-primary">Loved by artists</p>
        <h2 className="mt-3 text-4xl font-semibold tracking-tight text-[#282a47] sm:text-5xl">
          Real artists, <span className="text-[#7c3aed]">real results</span>
        </h2>
      </div>

      <div data-reveal="rise" className="relative mt-12">
        <div
          ref={trackRef}
          onScroll={onScroll}
          className="custom-scrollbar flex snap-x snap-mandatory gap-6 overflow-x-auto pb-2"
        >
          {testimonials.map((testimonial) => (
            <div
              key={testimonial.name}
              className="w-[85%] shrink-0 snap-start sm:w-[46%] lg:w-[calc((100%-3rem)/3)]"
            >
              <TestimonialCard
                name={testimonial.name}
                role={testimonial.role}
                location={testimonial.location}
                text={testimonial.text}
                highlight={testimonial.highlight}
                accent={testimonial.accent}
              />
            </div>
          ))}
        </div>

        {/* Controls */}
        <div className="mt-8 flex items-center justify-center gap-4">
          <button
            onClick={() => scrollByCards("left")}
            aria-label="Previous testimonial"
            className="flex size-11 items-center justify-center rounded-full border border-[#e0e3f5] bg-white text-[#7c3aed] shadow-sm transition hover:bg-[#7c3aed] hover:text-white active:scale-95"
          >
            <ChevronLeft className="size-5" />
          </button>

          <div className="flex items-center gap-2">
            {testimonials.map((t, i) => (
              <button
                key={t.name}
                onClick={() => scrollToIndex(i)}
                aria-label={`Go to testimonial from ${t.name}`}
                className={`h-1.5 rounded-full transition-all duration-300 ${i === activeIndex ? "w-8 bg-[#7c3aed]" : "w-1.5 bg-[#d9d5f5] hover:bg-[#b9aef0]"
                  }`}
              />
            ))}
          </div>

          <button
            onClick={() => scrollByCards("right")}
            aria-label="Next testimonial"
            className="flex size-11 items-center justify-center rounded-full border border-[#e0e3f5] bg-white text-[#7c3aed] shadow-sm transition hover:bg-[#7c3aed] hover:text-white active:scale-95"
          >
            <ChevronRight className="size-5" />
          </button>
        </div>
      </div>
    </section>
  )
}

const fetcher = (url: string) => fetch(url).then(res => res.json())


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
      a: "Start with a free month — no card required. After that, ArtistOS is ₹299/month or ₹2999/year (saving you 50%). Every plan includes the booking calendar, client CRM, portfolio gallery, payment tracking, WhatsApp campaigns, and business reports. A custom white-label plan is available for salons, studios, and beauty academies.",
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
      q: "Is ArtistOS related to artistos.ai or artistos.app?",
      a: "No. ArtistOS at artistos.in is India's dedicated business operating system and booking CRM for beauty artists, nail artists, mehendi artists, makeup artists, and salons. It is completely independent and not associated with music industry platforms such as artistos.ai or artistos.app.",
    },
    {
      q: "What is the official website for ArtistOS?",
      a: "The official website for ArtistOS is https://www.artistos.in. Indian beauty and creative artists can sign up for a free 1-month trial, access the booking calendar, manage clients, and track revenue directly at artistos.in.",
    },
    {
      q: "Is ArtistOS available in India?",
      a: "Yes. ArtistOS (artistos.in) is made in India and built for Indian artists. It supports ₹ INR pricing, and is optimised for the Indian beauty and salon market.",
    },
  ]

  return (
    <section id="faq" className="px-6 py-10 sm:px-12 lg:px-20">
      <div data-reveal="blur-in" className="mx-auto max-w-3xl text-center">
        <p className="text-sm font-semibold text-primary">FAQ</p>
        <h2 className="mt-3 text-4xl font-semibold tracking-tight text-[#282a47] sm:text-5xl">
          Questions? <span className="text-[#7c3aed]">We&apos;ve got answers</span>
        </h2>
      </div>

      <Accordion className="mx-auto mt-12 max-w-3xl gap-4" multiple={false} defaultValue={[0]}>
        {faqs.map((faq, index) => (
          <AccordionItem
            key={faq.q}
            value={index}
            data-reveal="rise"
            style={{ animationDelay: `${index * 80}ms` }}
            className="group overflow-hidden rounded-2xl border border-[#eaedf8] bg-white shadow-sm shadow-[#b8bdd8]/10 transition-colors not-last:border-b data-open:border-[#d9cffb] data-open:bg-[#fbfaff]"
          >
            <AccordionTrigger className="items-center gap-4 px-6 py-5 text-base font-semibold text-[#232542] hover:no-underline **:data-[slot=accordion-trigger-icon]:size-5 **:data-[slot=accordion-trigger-icon]:text-[#7c3aed]">
              {faq.q}
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-5 text-sm leading-7 text-[#5d6078]">
              {faq.a}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      <p data-reveal="rise" className="mt-10 text-center text-sm text-[#8b8fa8]">
        Still have a question?{" "}
        <a href="/contact" className="font-semibold text-[#7c3aed] hover:underline">
          Contact our team
        </a>{" "}
        or visit our{" "}
        <a href="/help-and-support" className="font-semibold text-[#7c3aed] hover:underline">
          Help &amp; Support Center
        </a>
        .
      </p>
    </section>
  )
}

const audienceSegments = [
  {
    emoji: "💅",
    title: "Nail Artists",
    text: "Track nail art sets, repeat clients, and design galleries per customer.",
    accent: "#d23f6e",
    bg: "#fff0f4",
  },
  {
    emoji: "🌿",
    title: "Mehendi Artists",
    text: "Handle festival rushes, bridal bookings, and advance payments in one calendar.",
    accent: "#23a982",
    bg: "#ecfff8",
  },
  {
    emoji: "👰",
    title: "Bridal Makeup Artists",
    text: "Manage trials, wedding-day slots, and share bridal portfolios privately.",
    accent: "#7c3aed",
    bg: "#f5f3ff",
  },
  {
    emoji: "💄",
    title: "Makeup Artists",
    text: "Party, engagement, and shoot bookings with service-wise pricing built in.",
    accent: "#e0862f",
    bg: "#fff6ec",
  },
  {
    emoji: "💇",
    title: "Hair Stylists",
    text: "Time-boxed appointments, repeat schedules, and payment history per client.",
    accent: "#2f8fe0",
    bg: "#edf8ff",
  },
  {
    emoji: "👁️",
    title: "Lash & Brow Artists",
    text: "Quick rebooking reminders and touch-up cycles that keep clients returning.",
    accent: "#7c3aed",
    bg: "#f5f3ff",
  },
  {
    emoji: "✂️",
    title: "Salon Owners",
    text: "See the whole studio — bookings, dues, and revenue across every artist.",
    accent: "#23a982",
    bg: "#ecfff8",
  },
  {
    emoji: "🎓",
    title: "Beauty Academies",
    text: "Run batches and student records on a fully white-labelled platform.",
    accent: "#d23f6e",
    bg: "#fff0f4",
  },
]

function KeywordSection() {
  return (
    <section className="bg-[#faf9ff] px-6 py-20 sm:px-12 lg:px-20">
      <div data-reveal="blur-in" className="mx-auto max-w-3xl text-center">
        <p className="text-sm font-semibold text-primary">Who it&apos;s for</p>
        <h2 className="mt-3 text-4xl font-semibold tracking-tight text-[#282a47] sm:text-5xl">
          Built for every <span className="text-[#7c3aed]">beauty professional</span>
        </h2>
      </div>

      <div className="mx-auto mt-12 grid max-w-6xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {audienceSegments.map((segment, i) => (
          <article
            key={segment.title}
            data-reveal="pop"
            className="rounded-2xl border border-[#eceaf8] bg-white p-6 shadow-sm shadow-[#b8bdd8]/10 transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-[#b8bdd8]/20"
            style={{ animationDelay: `${i * 70}ms` }}
          >
            <span
              className="inline-flex size-12 items-center justify-center rounded-2xl text-xl"
              style={{ backgroundColor: segment.bg }}
            >
              {segment.emoji}
            </span>
            <h3 className="mt-4 font-semibold text-[#232542]">{segment.title}</h3>
            <p className="mt-2 text-sm leading-6 text-[#666a82]">{segment.text}</p>
            <span
              className="mt-4 inline-block h-1 w-8 rounded-full"
              style={{ backgroundColor: segment.accent }}
            />
          </article>
        ))}
      </div>

      <p data-reveal="rise" className="mt-10 text-center text-sm text-[#8b8fa8]">
        Solo freelancer or a full studio — ArtistOS scales with you.
      </p>
    </section>
  )
}

function FinalCta() {
  return (
    <section id="cta" className="px-6 py-16 sm:px-12 lg:px-20">
      <div
        data-reveal="zoom"
        className="relative overflow-hidden rounded-md bg-[#7c3aed] px-8 py-14 text-center text-white"
      >
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


