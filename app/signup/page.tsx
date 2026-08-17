import type { Metadata } from "next"
import { MobileAuthForm } from "@/components/auth/mobile-auth-form"

export const metadata: Metadata = {
  title: "Sign Up Free — ArtistOS artist Business Platform",
  description:
    "Create your free ArtistOS account. Start managing bookings, clients, portfolio, payments, and WhatsApp campaigns for your nail, mehendi, bridal, or artist business.",
  alternates: {
    canonical: "https://artistos.in/signup",
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function SignupPage() {
  return <MobileAuthForm mode="signup" />
}

