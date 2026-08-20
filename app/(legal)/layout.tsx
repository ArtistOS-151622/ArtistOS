import { Footer } from "@/components/common/marketing/footer";
import { BrandLogo } from "@/components/common/brand/brand-logo";
import Link from "next/link";

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-svh flex-col bg-[#fdfdfc]">
      <header className="sticky top-0 z-50 flex items-center justify-between border-b border-[#edf0fa] bg-white/90 px-6 py-4 backdrop-blur-md sm:px-12 lg:px-20">
        <BrandLogo imageClassName="h-10" />
        <Link
          href="/signup"
          className="inline-flex items-center gap-1.5 rounded-full bg-[#7c3aed] px-5 py-2.5 text-sm font-medium text-white shadow-sm shadow-[#7c3aed]/20 outline-none transition duration-200 hover:-translate-y-0.5 hover:bg-[#6d28d9]"
        >
          Get Started
        </Link>
      </header>

      <div className="relative flex-1">
        {/* Soft background gradient */}
        <div className="absolute inset-0 h-[400px] bg-gradient-to-b from-[#f3e8ff] to-[#fdfdfc] pointer-events-none" />
        
        <main className="relative z-10 px-6 py-12 sm:px-12 lg:px-20 lg:py-20">
          <div className="mx-auto w-full overflow-hidden rounded-[2rem] bg-white p-6 shadow-2xl shadow-[#7c3aed]/5 ring-1 ring-[#edf0fa] sm:p-10 lg:p-16">
            {children}
          </div>
        </main>
      </div>
      
      <Footer disableAnimations={true} />
    </div>
  );
}
