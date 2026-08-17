import type { Metadata } from "next"
import { MobileAuthForm } from "@/components/auth/mobile-auth-form"

export const metadata: Metadata = {
  title: "Log In to ArtistOS — artist Business Platform",
  description:
    "Log in to ArtistOS and manage your artist business. Access your booking calendar, client CRM, portfolio, payments, and WhatsApp campaigns.",
  alternates: {
    canonical: "https://artistos.in/login",
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function LoginPage() {
  return <MobileAuthForm mode="login" />
}

