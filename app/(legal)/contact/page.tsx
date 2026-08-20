import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact Us | ArtistOS",
  description: "Get in touch with the ArtistOS team.",
};

export default function ContactPage() {
  return (
    <article className="prose prose-slate max-w-none prose-headings:font-semibold prose-headings:tracking-tight prose-a:text-[#7c3aed] hover:prose-a:text-[#6d28d9]">
      <h1 className="text-3xl font-bold tracking-tight text-[#15172e] sm:text-4xl mb-4">
        Contact Us
      </h1>
      <p className="text-sm text-[#666a82] mb-8">
        We&apos;re here to help you grow your beauty business.
      </p>

      <section className="space-y-6 text-[#3b3f62] leading-7">
        <p>
          Whether you have a question about our features, need help setting up your portfolio, or want to discuss a custom plan for your salon or academy, our team is ready to assist you.
        </p>

        <div className="mt-12 max-w-2xl">
          <h3 className="text-2xl font-bold text-[#15172e] mb-3 mt-0">Support & General Inquiries</h3>
          <p className="text-[#666a82] mb-6 leading-relaxed max-w-md">
            For technical support, billing questions, or general help with your ArtistOS account, our team is always ready to assist you.
          </p>
          <a
            href="mailto:artistoscrm@gmail.com"
            className="inline-flex h-12 items-center justify-center rounded-full bg-[#7c3aed] px-8 text-sm font-bold tracking-wide text-white shadow-sm shadow-[#7c3aed]/20 transition-all hover:-translate-y-0.5 hover:bg-[#6d28d9] hover:shadow-md"
          >
            artistoscrm@gmail.com &rarr;
          </a>
        </div>

        <h2 className="text-xl font-semibold text-[#15172e] mt-12 mb-4 border-b border-[#edf0fa] pb-2">Business Hours</h2>
        <p>
          Our team operates from Monday to Saturday, 10:00 AM to 7:00 PM (IST). We aim to respond to all inquiries within 24 hours during business days.
        </p>

        <h2 className="text-xl font-semibold text-[#15172e] mt-10 mb-4 border-b border-[#edf0fa] pb-2">Registered Office</h2>
        <p>
          <strong>ArtistOS</strong><br />
          Built with ❤️ in India for nail, mehendi, bridal & beauty artists.
        </p>
      </section>
    </article>
  );
}
