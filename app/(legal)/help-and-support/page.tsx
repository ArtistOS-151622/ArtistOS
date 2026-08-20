import type { Metadata } from "next";
import Link from "next/link";
import { MessageCircle, FileText, Mail, Video } from "lucide-react";

export const metadata: Metadata = {
  title: "Help & Support | ArtistOS",
  description: "Get help and find answers to common questions about ArtistOS.",
};

export default function HelpSupportPage() {
  return (
    <article className="prose prose-slate max-w-none prose-headings:font-semibold prose-headings:tracking-tight prose-a:text-[#7c3aed] hover:prose-a:text-[#6d28d9]">
      <h1 className="text-3xl font-bold tracking-tight text-[#15172e] sm:text-4xl mb-4">
        Help & Support
      </h1>
      <p className="text-sm text-[#666a82] mb-10">
        Everything you need to set up, manage, and grow your beauty business on ArtistOS.
      </p>

      <div className="not-prose grid gap-6 sm:grid-cols-2 mb-16">
        {/* WhatsApp Card */}
        <div className="group relative overflow-hidden rounded-3xl border border-[#edf0fa] bg-white p-8 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-[#0284c7]/10">
          <div className="absolute -right-10 -top-10 size-40 rounded-full bg-gradient-to-br from-[#e0f2fe] to-white blur-2xl transition-opacity group-hover:opacity-100" />
          <div className="relative">
            <div className="mb-6 flex size-14 items-center justify-center rounded-2xl bg-[#e0f2fe] text-[#0284c7] shadow-inner">
              <MessageCircle className="size-7" />
            </div>
            <h3 className="text-xl font-bold text-[#15172e] mb-3">WhatsApp Support</h3>
            <p className="text-[#666a82] mb-6 leading-relaxed">
              Priority members can chat directly with our support team on WhatsApp for instant resolutions.
            </p>
            <div className="inline-flex items-center gap-2 rounded-full bg-[#f8fafc] px-4 py-2 text-sm font-semibold text-[#0284c7] ring-1 ring-inset ring-[#e2e8f0]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#0284c7] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#0284c7]"></span>
              </span>
              +91 6354870709
            </div>
          </div>
        </div>

        {/* Email Card */}
        <div className="group relative overflow-hidden rounded-3xl border border-[#edf0fa] bg-white p-8 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-[#7c3aed]/10">
          <div className="absolute -right-10 -top-10 size-40 rounded-full bg-gradient-to-br from-[#f3e8ff] to-white blur-2xl transition-opacity group-hover:opacity-100" />
          <div className="relative">
            <div className="mb-6 flex size-14 items-center justify-center rounded-2xl bg-[#f3e8ff] text-[#7c3aed] shadow-inner">
              <Mail className="size-7" />
            </div>
            <h3 className="text-xl font-bold text-[#15172e] mb-3">Email Support</h3>
            <p className="text-[#666a82] mb-6 leading-relaxed">
              Drop us an email anytime. We aim to respond to all technical and billing queries within 24 hours.
            </p>
            <a
              href="mailto:artistoscrm@gmail.com"
              className="inline-flex h-10 items-center justify-center rounded-full bg-[#7c3aed] px-6 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#6d28d9]"
            >
              artistoscrm@gmail.com
            </a>
          </div>
        </div>
      </div>

      <section className="not-prose">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-bold tracking-tight text-[#15172e] sm:text-3xl">Frequently Asked Questions</h2>
          <p className="mt-3 text-[#666a82]">Quick answers to questions you may have.</p>
        </div>

        <div className="grid gap-4 mx-auto max-w-3xl">
          {[
            {
              q: "How do I change my subscription plan?",
              a: "You can upgrade or cancel your subscription at any time by navigating to the Billing section in your dashboard. If you upgrade mid-cycle, the pricing will be prorated automatically."
            },
            {
              q: "When do payouts reach my bank account?",
              a: "Payments processed through the ArtistOS booking link are settled directly to your registered bank account via Razorpay within T+2 (two business days) automatically."
            },
            {
              q: "Can I use my own domain name?",
              a: "Yes, custom domain mapping is available for Custom and White-label plans. Please contact our support team to set this up."
            }
          ].map((faq, i) => (
            <div key={i} className="rounded-2xl border border-[#edf0fa] bg-white p-6 shadow-sm transition-colors hover:border-[#7c3aed]/30 hover:bg-[#faf9ff]">
              <h3 className="text-lg font-semibold text-[#15172e] mb-2">{faq.q}</h3>
              <p className="text-[#5d6078] leading-relaxed text-sm">{faq.a}</p>
            </div>
          ))}
        </div>
      </section>
    </article>
  );
}
