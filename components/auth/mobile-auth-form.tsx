"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useState } from "react"
import { ArrowRight, Lock, Mail, MapPin, Store, User } from "lucide-react"

import { CheckItem } from "@/components/common/shared/check-item"
import { BrandLogo } from "@/components/common/brand/brand-logo"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input, PhoneInput } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type MobileAuthFormProps = {
  mode: "login" | "signup"
}

export function MobileAuthForm({ mode }: MobileAuthFormProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  // Form states
  const [phone, setPhone] = useState("")
  const [password, setPassword] = useState("")
  const [artistName, setArtistName] = useState("")
  const [studioName, setStudioName] = useState("")
  const [address, setAddress] = useState("")
  const [email, setEmail] = useState("")

  const isSignup = mode === "signup"
  const title = isSignup ? "Create your ArtistOS account" : "Welcome back to ArtistOS"
  const description = isSignup
    ? "Start managing bookings, clients, portfolio, campaigns, and payments in one workspace."
    : "Enter your mobile number and password to continue to your dashboard."
  const nextPath = searchParams.get("next")
  const redirectPath = nextPath?.startsWith("/") && !nextPath.startsWith("//") ? nextPath : "/dashboard"

  function handlePhoneChange(value: string) {
    setError("")
    setPhone(value.replace(/\D/g, "").slice(0, 10))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      if (isSignup) {
        if (!artistName || !studioName || !address || !phone || !password) {
          setError("Please fill out all required fields.")
          setLoading(false)
          return
        }
        if (phone.length !== 10) {
          setError("Please enter a valid 10-digit mobile number.")
          setLoading(false)
          return
        }
        if (password.length < 6) {
          setError("Password must be at least 6 characters long.")
          setLoading(false)
          return
        }

        const res = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phone,
            password,
            artistName,
            studioName,
            address,
            email,
          }),
        })

        const data = await res.json()

        if (!res.ok) {
          setError(data.error || "An error occurred during registration.")
          setLoading(false)
          return
        }
      } else {
        if (!phone || !password) {
          setError("Please enter both phone number and password.")
          setLoading(false)
          return
        }
        if (phone.length !== 10) {
          setError("Please enter a valid 10-digit mobile number.")
          setLoading(false)
          return
        }

        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone, password }),
        })

        const data = await res.json()

        if (!res.ok) {
          setError(data.error || "Invalid phone number or password.")
          setLoading(false)
          return
        }
      }

      router.push(redirectPath)
    } catch {
      setError("Unable to connect to the authentication server. Please check your connection and try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="relative min-h-svh bg-gradient-to-br from-[#d2d9f9] via-[#e7ebf8] to-[#d7ebd8] p-4 text-[#15172e] flex items-center justify-center">
      <div className="relative z-10 w-full max-w-6xl py-8">
        <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] items-center">
          
          {/* Left Hero Column */}
          <section className="hidden lg:block">
            <BrandLogo className="mb-12" imageClassName="h-16" priority />

            <div className="max-w-lg">
              <p className="inline-flex rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#7c3aed] shadow-sm">
                Beauty business operating system
              </p>
              <h1 className="mt-6 text-5xl font-semibold leading-tight tracking-tight">
                Run your studio from one secure login.
              </h1>
              <p className="mt-5 text-lg leading-8 text-[#5f637e]">
                ArtistOS keeps appointments, clients, payments, campaigns, and portfolio
                activity ready the moment you sign in.
              </p>
            </div>

            <div className="mt-10 grid max-w-xl gap-4 sm:grid-cols-2">
              {[
                "Secure credentials login",
                "10-digit mobile login",
                "Dashboard opens instantly",
                "Built for beauty artists",
              ].map((item) => (
                <div key={item} className="flex items-center gap-3 rounded-2xl bg-white/80 p-4 shadow-sm">
                  <CheckItem text={item} className="text-[#33365a]" />
                </div>
              ))}
            </div>
          </section>

          {/* Right Auth Card Column */}
          <Card className="mx-auto w-full max-w-lg border-slate-100 bg-white p-2 shadow-xl shadow-purple-950/5 rounded-[2rem]">
            <CardHeader className="space-y-3 px-6 pt-6">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-[#f3e8ff] text-[#7c3aed]">
                {isSignup ? <User className="size-6" /> : <Lock className="size-6" />}
              </div>
              <div>
                <CardTitle className="text-2xl font-semibold tracking-tight">{title}</CardTitle>
                <CardDescription className="mt-2 leading-6">{description}</CardDescription>
              </div>
            </CardHeader>

            <CardContent className="px-6 pb-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                {isSignup ? (
                  <>
                    {/* Artist Name */}
                    <div className="space-y-1.5">
                      <Label htmlFor="artistName">Artist name <span className="text-red-500">*</span></Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
                        <Input
                          id="artistName"
                          type="text"
                          required
                          disabled={loading}
                          value={artistName}
                          onChange={(e) => setArtistName(e.target.value)}
                          placeholder="e.g. Riya Sharma"
                          className="pl-9"
                        />
                      </div>
                    </div>

                    {/* Studio Name */}
                    <div className="space-y-1.5">
                      <Label htmlFor="studioName">Studio name <span className="text-red-500">*</span></Label>
                      <div className="relative">
                        <Store className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
                        <Input
                          id="studioName"
                          type="text"
                          required
                          disabled={loading}
                          value={studioName}
                          onChange={(e) => setStudioName(e.target.value)}
                          placeholder="e.g. Glow & Shine Salon"
                          className="pl-9"
                        />
                      </div>
                    </div>

                    {/* Address */}
                    <div className="space-y-1.5">
                      <Label htmlFor="address">Address <span className="text-red-500">*</span></Label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
                        <Input
                          id="address"
                          type="text"
                          required
                          disabled={loading}
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          placeholder="e.g. Sector 15, Gurgaon, Haryana"
                          className="pl-9"
                        />
                      </div>
                    </div>

                    {/* Email (Optional) */}
                    <div className="space-y-1.5">
                      <Label htmlFor="email">Email <span className="text-slate-400 font-normal">(Optional)</span></Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
                        <Input
                          id="email"
                          type="email"
                          disabled={loading}
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="e.g. riya@example.com"
                          className="pl-9"
                        />
                      </div>
                    </div>
                  </>
                ) : null}

                {/* Phone Number */}
                <div className="space-y-1.5">
                  <Label htmlFor="phone">Phone number <span className="text-red-500">*</span></Label>
                  <PhoneInput
                    id="phone"
                    required
                    disabled={loading}
                    value={phone}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    placeholder="9876543210"
                  />
                  <p className="text-xs text-[#777b95]">{phone.length}/10 digits entered</p>
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <Label htmlFor="password">{isSignup ? "Set password" : "Password"} <span className="text-red-500">*</span></Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="password"
                      type="password"
                      required
                      disabled={loading}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={isSignup ? "Create secure password" : "••••••••"}
                      className="pl-9"
                    />
                  </div>
                </div>

                {error ? (
                  <p className="rounded-2xl bg-[#fff0f1] px-4 py-3 text-sm font-medium text-[#c43b4a]">
                    {error}
                  </p>
                ) : null}

                {/* Submit button */}
                <Button
                  type="submit"
                  disabled={loading}
                  className="h-12 w-full justify-center rounded-2xl bg-[#7c3aed] text-base font-semibold text-white shadow-lg shadow-[#7c3aed]/25 hover:bg-[#6d28d9] disabled:opacity-50"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      {isSignup ? "Saving..." : "Logging in..."}
                    </span>
                  ) : (
                    <>
                      {isSignup ? "Save and Register" : "Log in"}
                      <ArrowRight className="size-4" />
                    </>
                  )}
                </Button>
              </form>

              <p className="mt-6 text-center text-sm text-[#777b95]">
                {isSignup ? "Already have an account?" : "New to ArtistOS?"}{" "}
                <Link
                  href={isSignup ? "/login" : "/signup"}
                  className="font-semibold text-[#7c3aed] hover:underline"
                  suppressHydrationWarning
                >
                  {isSignup ? "Log in" : "Create account"}
                </Link>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  )
}
