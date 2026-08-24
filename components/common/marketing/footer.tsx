import Link from "next/link";
import { BrandLogo } from "@/components/common/brand/brand-logo";

const footerColumns: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "/#features" },
      { label: "Client CRM", href: "/#solutions" },
      { label: "WhatsApp Campaigns", href: "/#pricing" },
      { label: "Pricing", href: "/#pricing" },
      { label: "FAQ", href: "/#faq" },
    ],
  },
  {
    title: "Get started",
    links: [
      { label: "Create free account", href: "/signup" },
      { label: "Log in", href: "/login" },
      { label: "Start free trial", href: "/signup" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy Policy", href: "/privacy-policy" },
      { label: "Terms & Conditions", href: "/terms-and-conditions" },
      { label: "Cancellation & Refund", href: "/cancellation-and-refund" },
    ],
  },
  {
    title: "Support",
    links: [
      { label: "Contact us", href: "/contact" },
      { label: "Help & support", href: "/help-and-support" },
    ],
  },
];

export function Footer({ disableAnimations = false }: { disableAnimations?: boolean }) {
  const getRevealProps = (variant: string) => {
    return disableAnimations ? {} : { "data-reveal": variant };
  };

  return (
    <footer className="px-6 pb-8 sm:px-12 lg:px-20">
      <div className="grid gap-12 border-t border-[#edf0fa] py-14 lg:grid-cols-[1.15fr_1.85fr] lg:gap-20">
        <div {...getRevealProps("slide-left")}>
          <BrandLogo imageClassName="h-14" />
          <p className="mt-6 max-w-sm leading-7 text-[#666a82]">
            India&apos;s all-in-one business platform for beauty artists — bookings, client CRM,
            portfolio, payments, and WhatsApp campaigns in one place.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {["Made in India 🇮🇳", "₹ INR pricing"].map((chip) => (
              <span
                key={chip}
                className="rounded-full border border-[#e8e4ff] bg-white px-3 py-1.5 text-xs font-semibold text-[#5a5f80]"
              >
                {chip}
              </span>
            ))}
          </div>
        </div>

        <div className="grid gap-8 text-sm sm:grid-cols-4">
          {footerColumns.map((column, i) => (
            <div
              key={column.title}
              {...getRevealProps("rise")}
              style={{ animationDelay: `${i * 90}ms` }}
            >
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#9096b5]">
                {column.title}
              </p>
              <ul className="mt-5 space-y-3">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-[#5d6078] transition-colors hover:text-[#7c3aed]"
                      suppressHydrationWarning
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#202344] px-6 py-5 text-xs text-white/70">
        <span suppressHydrationWarning>
          © {new Date().getFullYear()} ArtistOS (artistos.in). All rights reserved.
        </span>
        <span className="text-white/40">
          Built in India for nail, mehendi, bridal & beauty artists.
        </span>
      </div>
    </footer>
  );
}
