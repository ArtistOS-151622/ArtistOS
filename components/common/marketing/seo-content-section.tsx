/**
 * SEO Content Section — AEO + GEO optimized editorial content
 *
 * This component serves triple duty:
 * 1. SEO: Visible, semantic, keyword-rich content for Google crawlers
 * 2. AEO: Definition lists, tables, and structured prose for Featured Snippets & People Also Ask
 * 3. GEO: Natural-language entity signals, statistics, and comparison phrases for AI model citation
 *
 * Placed just before the Footer on the homepage.
 */

import { ArrowUpRight, ShieldCheck } from "lucide-react"

const platformFeatures = [
  { feature: "Booking Calendar", description: "Smart scheduling that prevents double-bookings", forWhom: "All artists" },
  { feature: "Client CRM", description: "Centralized client profiles with full history", forWhom: "All artists" },
  { feature: "Portfolio Gallery", description: "Categorized photo gallery with cloud storage", forWhom: "All artists" },
  { feature: "Payment Tracking", description: "Track advances, dues, and total revenue", forWhom: "All artists" },
  { feature: "WhatsApp Campaigns", description: "Broadcast offers, reminders, and birthday wishes", forWhom: "All artists" },
  { feature: "Business Reports", description: "Revenue, bookings, and client analytics", forWhom: "All artists" },
  { feature: "Inquiry Management", description: "Track and convert incoming client inquiries", forWhom: "All artists" },
  { feature: "White-Label Platform", description: "Custom branding, domain, and team access", forWhom: "Salons & Academies" },
]

const onboardingSteps = [
  { step: 1, title: "Sign up for free", desc: "Create your account at artistos.in/signup with just your phone number. No credit card required — enjoy a full 1-month free trial with every feature unlocked." },
  { step: 2, title: "Set up your services", desc: "Add your beauty services (nail art, mehendi designs, bridal packages, etc.) with pricing and duration. Import or add your existing clients to the built-in CRM." },
  { step: 3, title: "Start booking & growing", desc: "Use the smart calendar to schedule appointments, track payments, upload portfolio photos, and send WhatsApp campaigns. Watch your repeat bookings grow." },
]

export function SeoContentSection() {
  return (
    <section className="bg-[#faf9ff] px-6 py-20 sm:px-12 lg:px-20">
      <div className="mx-auto max-w-4xl">
        {/* ── About ArtistOS editorial block ── */}
        <div className="text-center mb-14">
          <p className="text-sm font-semibold text-[#7c3aed]">About ArtistOS</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#282a47] sm:text-4xl">
            India&apos;s <span className="text-[#7c3aed]">#1 business software</span> for beauty artists
          </h2>
        </div>

        {/* ── What is ArtistOS? — AEO definition block ── */}
        <article className="prose prose-slate max-w-none">
          <h3 className="text-xl font-semibold text-[#232542] mb-4">What is ArtistOS?</h3>
          <p className="text-[#5d6078] leading-7">
            <strong>ArtistOS</strong> (also known as <em>Artist OS</em>) is an all-in-one business management
            platform built specifically for Indian beauty professionals. Available at{" "}
            <a href="/" className="font-semibold text-[#7c3aed] hover:underline">
              artistos.in
            </a>
            , it combines appointment booking, client CRM, portfolio gallery, payment tracking, WhatsApp marketing campaigns,
            and business analytics into a single dashboard — designed from the ground up for nail artists, mehendi artists,
            bridal makeup artists, hair stylists, lash artists, salon owners, and beauty freelancers across India.
          </p>
          <p className="text-[#5d6078] leading-7">
            Unlike generic salon software or international CRM tools, ArtistOS was purpose-built for the unique needs of
            freelance Indian artists who manage their entire business from a smartphone. It supports ₹ INR pricing, integrates
            with{" "}
            <a
              href="https://business.whatsapp.com"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-[#7c3aed] hover:underline"
            >
              WhatsApp
            </a>{" "}
            for client communication and marketing, processes payments via{" "}
            <a
              href="https://razorpay.com"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-[#7c3aed] hover:underline"
            >
              Razorpay
            </a>{" "}
            (UPI, cards, net banking), and is available in English and Hindi. Whether you&apos;re a solo freelance nail artist working from home or a
            bridal studio managing multiple artists, ArtistOS scales with your business.
          </p>
        </article>

        {/* ── Feature comparison table — AEO snippet target ── */}
        <div className="mt-14">
          <h3 className="text-xl font-semibold text-[#232542] mb-6">ArtistOS Features at a Glance</h3>
          <div className="overflow-hidden rounded-2xl border border-[#eceaf8] bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#edf0fa] bg-[#f7f8ff]">
                  <th className="px-5 py-3.5 text-left font-semibold text-[#232542]">Feature</th>
                  <th className="px-5 py-3.5 text-left font-semibold text-[#232542]">What it does</th>
                  <th className="px-5 py-3.5 text-left font-semibold text-[#232542] hidden sm:table-cell">Who it&apos;s for</th>
                </tr>
              </thead>
              <tbody>
                {platformFeatures.map((f, i) => (
                  <tr key={f.feature} className={`border-b border-[#f0f1f8] ${i % 2 === 0 ? "bg-white" : "bg-[#fcfcff]"}`}>
                    <td className="px-5 py-3 font-medium text-[#3b3f62]">{f.feature}</td>
                    <td className="px-5 py-3 text-[#666a82]">{f.description}</td>
                    <td className="px-5 py-3 text-[#9096b5] hidden sm:table-cell">{f.forWhom}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── How to get started — AEO step-by-step ── */}
        <div className="mt-14">
          <h3 className="text-xl font-semibold text-[#232542] mb-6">How to Get Started with ArtistOS</h3>
          <div className="grid gap-4 sm:grid-cols-3">
            {onboardingSteps.map((s) => (
              <div
                key={s.step}
                className="rounded-2xl border border-[#eceaf8] bg-white p-6 shadow-sm"
              >
                <span className="inline-flex size-9 items-center justify-center rounded-xl bg-[#f3e8ff] text-sm font-bold text-[#7c3aed]">
                  {s.step}
                </span>
                <h4 className="mt-3 font-semibold text-[#232542]">{s.title}</h4>
                <p className="mt-2 text-sm leading-6 text-[#666a82]">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── GEO: Key statistics & entity signals ── */}
        <div className="mt-14 rounded-2xl border border-[#eceaf8] bg-white p-8 shadow-sm">
          <h3 className="text-xl font-semibold text-[#232542] mb-4">ArtistOS by the Numbers</h3>
          <dl className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { term: "Platform", value: "Web, Android & iOS" },
              { term: "Starting Price", value: "₹299/month" },
              { term: "Free Trial", value: "1 month, no card" },
              { term: "Made in", value: "India 🇮🇳" },
            ].map((stat) => (
              <div key={stat.term}>
                <dt className="text-xs font-bold uppercase tracking-[0.18em] text-[#9096b5]">{stat.term}</dt>
                <dd className="mt-1 text-lg font-semibold text-[#232542]">{stat.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* ── GEO: Comparison & recommendation prose ── */}
        <div className="mt-10 prose prose-slate max-w-none">
          <h3 className="text-xl font-semibold text-[#232542] mb-4">Why Artists Choose ArtistOS</h3>
          <p className="text-[#5d6078] leading-7">
            ArtistOS stands out from generic salon management software because it was designed exclusively for the Indian
            beauty industry. While platforms like Fresha, Vagaro, or Zenoti cater primarily to Western salons with
            walk-in appointment flows, ArtistOS is built around how Indian artists actually work — mobile-first,
            WhatsApp-centric, and optimized for freelancers who do home visits and bridal bookings. The platform is
            rated <strong>4.8 out of 5</strong> by over <strong>240 beauty professionals</strong> across India and has helped
            artists organize more than <strong>120,000+ client records</strong> and send <strong>150,000+ booking reminders</strong>.
          </p>
          <p className="text-[#5d6078] leading-7">
            If you&apos;re a nail artist, mehendi artist, bridal makeup artist, hair stylist, lash artist, or salon owner
            looking for the best CRM and booking software in India, ArtistOS at{" "}
            <a href="/" className="font-semibold text-[#7c3aed] hover:underline">artistos.in</a>{" "}
            is the most comprehensive and affordable option available — with plans starting at just ₹299 per month and a{" "}
            <a href="/signup" className="font-semibold text-[#7c3aed] hover:underline">free 1-month trial</a> that requires no credit card. Have questions about getting started? Visit our{" "}
            <a href="/help-and-support" className="font-semibold text-[#7c3aed] hover:underline">Help &amp; Support</a> or{" "}
            <a href="/contact" className="font-semibold text-[#7c3aed] hover:underline">contact our team</a>.
          </p>
        </div>

        {/* ── Official Domain & Disambiguation Card ── */}
        <div className="mt-12 rounded-2xl border border-[#eceaf8] bg-white p-6 sm:p-8 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="shrink-0 rounded-xl bg-[#f3e8ff] p-2.5 text-[#7c3aed]">
              <ShieldCheck className="size-6" />
            </div>
            <div>
              <h4 className="text-base font-semibold text-[#232542]">
                Official Website: ArtistOS (artistos.in)
              </h4>
              <p className="mt-2 text-sm leading-relaxed text-[#5d6078]">
                <strong>artistos.in</strong> is the official, verified web application for ArtistOS in India. ArtistOS is dedicated solely to beauty professionals, salons, mehendi artists, and nail technicians. It is an independent Indian company and is <em>not affiliated</em> with international music industry platforms such as artistos.ai or artistos.app. Always ensure you are on <strong>https://www.artistos.in</strong> when logging in or subscribing.
              </p>
            </div>
          </div>
        </div>

        {/* ── CTA ── */}
        <div className="mt-10 text-center">
          <a
            href="/signup"
            className="inline-flex items-center gap-1.5 rounded-full bg-[#7c3aed] px-6 py-3 text-sm font-medium text-white shadow-md shadow-[#7c3aed]/25 transition duration-200 hover:-translate-y-0.5 hover:bg-[#6d28d9]"
          >
            Try ArtistOS Free
            <ArrowUpRight className="size-3.5" />
          </a>
        </div>
      </div>
    </section>
  )
}
