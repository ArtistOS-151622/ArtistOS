"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useState, useRef } from "react"
import { ArrowRight, Lock, Mail, MapPin, Store, User } from "lucide-react"
import { CheckItem } from "@/components/common/shared/check-item"
import { BrandLogo } from "@/components/common/brand/brand-logo"
import { FloatingInput, FloatingPhoneInput } from "@/components/common/shared/floating-input"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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
  const [studioLogo, setStudioLogo] = useState<string>("")
  const logoInputRef = useRef<HTMLInputElement>(null)

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
            studioLogo,
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

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError("Logo must be less than 5MB")
        return
      }
      const reader = new FileReader()
      reader.onloadend = () => {
        setStudioLogo(reader.result as string)
      }
      reader.readAsDataURL(file)
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
                    <FloatingInput
                      id="artistName"
                      label="Artist name *"
                      icon={<User className="size-3.5" />}
                      type="text"
                      required
                      disabled={loading}
                      value={artistName}
                      onChange={(e) => setArtistName(e.target.value)}
                    />

                    <FloatingInput
                      id="studioName"
                      label="Studio name *"
                      icon={<Store className="size-3.5" />}
                      type="text"
                      required
                      disabled={loading}
                      value={studioName}
                      onChange={(e) => setStudioName(e.target.value)}
                    />

                    <FloatingInput
                      id="address"
                      label="Address *"
                      icon={<MapPin className="size-3.5" />}
                      type="text"
                      required
                      disabled={loading}
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                    />

                    <FloatingInput
                      id="email"
                      label="Email (Optional)"
                      icon={<Mail className="size-3.5" />}
                      type="email"
                      disabled={loading}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />

                    <div className="space-y-1.5">
                      <Label htmlFor="studioLogo" className="text-sm text-slate-700 pl-1 font-medium flex justify-between">
                        <span>Studio Logo (Optional)</span>
                        {studioLogo && <span className="text-[#7c3aed] text-xs">Selected</span>}
                      </Label>
                      <input
                        type="file"
                        id="studioLogo"
                        accept="image/*"
                        ref={logoInputRef}
                        className="hidden"
                        onChange={handleLogoChange}
                        disabled={loading}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full justify-start text-muted-foreground font-normal rounded-2xl h-14 px-4 border-slate-200"
                        onClick={() => logoInputRef.current?.click()}
                        disabled={loading}
                      >
                        {studioLogo ? "Change Logo" : "Upload Studio Logo"}
                      </Button>
                    </div>
                  </>
                ) : null}

                {/* Phone Number */}
                <div className="space-y-1.5">
                  <FloatingPhoneInput
                    id="phone"
                    label="Phone number *"
                    required
                    disabled={loading}
                    value={phone}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                  />
                  <p className="text-xs text-[#777b95] pl-1">{phone.length}/10 digits entered</p>
                </div>

                <FloatingInput
                  id="password"
                  label={isSignup ? "Set password *" : "Password *"}
                  icon={<Lock className="size-3.5" />}
                  type="password"
                  required
                  disabled={loading}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />

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
