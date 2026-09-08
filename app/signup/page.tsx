import type { Metadata } from "next"
import { MobileAuthForm } from "@/components/auth/mobile-auth-form"

export const metadata: Metadata = {
  title: "Sign Up Free — ArtistOS artist Business Platform",
  description:
    "Create your free ArtistOS account. Manage bookings, client CRM, portfolio, payments & WhatsApp campaigns for your beauty business. Start free today.",
  alternates: {
    canonical: "/signup",
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function SignupPage() {
  return <MobileAuthForm mode="signup" />
}

