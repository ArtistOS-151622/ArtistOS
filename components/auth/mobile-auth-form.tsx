"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useState, useRef, useEffect } from "react"
import {
  ArrowRight,
  CheckCircle2,
  Edit3,
  Mail,
  MapPin,
  MessageCircle,
  RotateCcw,
  Store,
  User,
} from "lucide-react"
import { CheckItem } from "@/components/common/shared/check-item"
import { BrandLogo } from "@/components/common/brand/brand-logo"
import { FloatingInput, FloatingPhoneInput } from "@/components/common/shared/floating-input"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp"

type MobileAuthFormProps = {
  mode?: "login" | "signup"
}

type AuthStep = "phone" | "otp" | "studio"

export function MobileAuthForm({ mode = "login" }: MobileAuthFormProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [step, setStep] = useState<AuthStep>("phone")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  // Step 1: Phone
  const [phone, setPhone] = useState("")

  // Step 2: OTP
  const [otp, setOtp] = useState("")
  const [stateToken, setStateToken] = useState<string | null>(null)
  const [cooldown, setCooldown] = useState(0)

  // Step 3: Studio Details (for new artists)
  const [registrationToken, setRegistrationToken] = useState<string | null>(null)
  const [artistName, setArtistName] = useState("")
  const [studioName, setStudioName] = useState("")
  const [address, setAddress] = useState("")
  const [email, setEmail] = useState("")
  const [studioLogo, setStudioLogo] = useState<string>("")
  const logoInputRef = useRef<HTMLInputElement>(null)

  const nextPath = searchParams.get("next")
  const redirectPath = nextPath?.startsWith("/") && !nextPath.startsWith("//") ? nextPath : "/dashboard"

  // Cooldown countdown timer for OTP resend
  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(timer)
  }, [cooldown])

  function handlePhoneChange(value: string) {
    setError("")
    if (formErrors.phone) setFormErrors((prev) => ({ ...prev, phone: "" }))
    setPhone(value.replace(/\D/g, "").slice(0, 10))
  }

  // --- Step 1: Send WhatsApp OTP ---
  async function handleSendOtp(e?: React.FormEvent) {
    if (e) e.preventDefault()
    setError("")
    setFormErrors({})

    const cleanPhone = phone.trim()
    if (!cleanPhone) {
      setFormErrors({ phone: "Please enter your mobile number." })
      return
    }

    if (cleanPhone.length !== 10) {
      setError("Please enter a valid 10-digit mobile number.")
      return
    }

    setLoading(true)

    try {
      const res = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: cleanPhone }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Failed to send OTP via WhatsApp. Please try again.")
        return
      }

      setStateToken(data.stateToken || null)
      setCooldown(data.cooldownSeconds || 30)
      setOtp("")
      setStep("otp")
    } catch {
      setError("Unable to connect to the authentication server. Please check your internet connection.")
    } finally {
      setLoading(false)
    }
  }

  // --- Step 2: Verify WhatsApp OTP ---
  async function handleVerifyOtp(otpValue?: string) {
    const codeToVerify = (otpValue ?? otp).trim()
    setError("")

    if (codeToVerify.length !== 6) {
      setError("Please enter the complete 6-digit OTP received on WhatsApp.")
      return
    }

    setLoading(true)

    try {
      const res = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
          otp: codeToVerify,
          stateToken,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Invalid OTP. Please check the code received on WhatsApp.")
        return
      }

      if (data.isNewUser) {
        // First-time artist: proceed to studio profile setup
        setRegistrationToken(data.registrationToken)
        setStep("studio")
      } else {
        // Returning artist: instantly open dashboard
        window.location.href = data.redirectUrl || redirectPath
      }
    } catch {
      setError("Failed to verify OTP. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  // Auto-submit OTP when 6 digits are typed
  function handleOtpChange(value: string) {
    const clean = value.replace(/\D/g, "").slice(0, 6)
    setOtp(clean)
    setError("")
    if (clean.length === 6) {
      handleVerifyOtp(clean)
    }
  }

  // --- Step 3: Complete Studio Profile (First-Time User) ---
  async function handleRegisterProfile(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setFormErrors({})

    const newErrors: Record<string, string> = {}
    if (!artistName.trim()) newErrors.artistName = "Artist name is required."
    if (!studioName.trim()) newErrors.studioName = "Studio name is required."
    if (!address.trim()) newErrors.address = "Address is required."

    if (Object.keys(newErrors).length > 0) {
      setFormErrors(newErrors)
      return
    }

    setLoading(true)

    try {
      const res = await fetch("/api/auth/register-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          registrationToken,
          artistName,
          studioName,
          address,
          email,
          studioLogo,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Failed to create your studio profile. Please try again.")
        return
      }

      // Profile completed, direct to dashboard
      window.location.href = data.redirectUrl || redirectPath
    } catch {
      setError("Failed to save studio profile. Please check your connection and try again.")
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
              <p className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#7c3aed] shadow-sm">
                <span className="size-2 rounded-full bg-[#10b981]" />
                Beauty business operating system
              </p>
              <h1 className="mt-6 text-5xl font-semibold leading-tight tracking-tight">
                Run your studio from one secure login.
              </h1>
              <p className="mt-5 text-lg leading-8 text-[#5f637e]">
                ArtistOS keeps appointments, clients, payments, campaigns, and portfolio
                activity ready the moment you verify your WhatsApp.
              </p>
            </div>

            <div className="mt-10 grid max-w-xl gap-4 sm:grid-cols-2">
              {[
                "Instant WhatsApp OTP verification",
                "No password memorization required",
                "1-year secure session stay",
                "Built specifically for beauty artists",
              ].map((item) => (
                <div key={item} className="flex items-center gap-3 rounded-2xl bg-white/80 p-4 shadow-sm backdrop-blur-sm">
                  <CheckItem text={item} className="text-[#33365a]" />
                </div>
              ))}
            </div>
          </section>

          {/* Right Auth Card Column */}
          <Card className="mx-auto w-full max-w-lg border-slate-100 bg-white p-2 shadow-xl shadow-purple-950/5 rounded-[2rem]">
            <CardHeader className="space-y-3 px-6 pt-6">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-[#f3e8ff] text-[#7c3aed]">
                {step === "studio" ? (
                  <Store className="size-6" />
                ) : step === "otp" ? (
                  <MessageCircle className="size-6" />
                ) : (
                  <User className="size-6" />
                )}
              </div>

              <div>
                {step === "phone" && (
                  <>
                    <h1 className="text-2xl font-semibold tracking-tight text-[#15172e]">
                      Sign in with WhatsApp
                    </h1>
                    <p className="mt-2 text-sm text-[#666a82] leading-6">
                      Enter your mobile number to receive a secure one-time verification code on WhatsApp.
                    </p>
                  </>
                )}

                {step === "otp" && (
                  <>
                    <h1 className="text-2xl font-semibold tracking-tight text-[#15172e]">
                      Verify WhatsApp Code
                    </h1>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5 text-sm text-[#666a82]">
                      <span>Code sent via WhatsApp to</span>
                      <span className="font-semibold text-[#15172e]">+91 {phone}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setStep("phone")
                          setError("")
                        }}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-[#7c3aed] hover:underline ml-1"
                      >
                        <Edit3 className="size-3" />
                        Edit
                      </button>
                    </div>
                  </>
                )}

                {step === "studio" && (
                  <>
                    <h1 className="text-2xl font-semibold tracking-tight text-[#15172e]">
                      Complete Studio Profile
                    </h1>
                    <p className="mt-2 text-sm text-[#666a82] leading-6">
                      Welcome to ArtistOS! Enter your studio details to set up your workspace and portfolio.
                    </p>
                  </>
                )}
              </div>
            </CardHeader>

            <CardContent className="px-6 pb-6">
              {/* STEP 1: Phone Input */}
              {step === "phone" && (
                <form onSubmit={handleSendOtp} className="space-y-4" noValidate>
                  <div className="space-y-1.5">
                    <FloatingPhoneInput
                      id="phone"
                      label="Phone number *"
                      required
                      disabled={loading}
                      error={formErrors.phone}
                      value={phone}
                      onChange={(e) => handlePhoneChange(e.target.value)}
                    />
                    <p className="text-xs text-[#777b95] pl-1">
                      {phone.length}/10 digits entered
                    </p>
                  </div>

                  {error ? (
                    <p className="rounded-2xl bg-[#fff0f1] px-4 py-3 text-sm font-medium text-[#c43b4a]">
                      {error}
                    </p>
                  ) : null}

                  <Button
                    type="submit"
                    disabled={loading || phone.length !== 10}
                    className="h-12 w-full justify-center rounded-2xl bg-[#7c3aed] text-base font-semibold text-white shadow-lg shadow-[#7c3aed]/25 hover:bg-[#6d28d9] disabled:opacity-50 transition-all"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <span className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        Sending WhatsApp OTP...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <MessageCircle className="size-4 text-emerald-300" />
                        Get OTP on WhatsApp
                        <ArrowRight className="size-4 ml-1" />
                      </span>
                    )}
                  </Button>
                </form>
              )}

              {/* STEP 2: OTP Verification */}
              {step === "otp" && (
                <div className="space-y-5">
                  <div className="flex flex-col items-center justify-center py-2">
                    <InputOTP
                      maxLength={6}
                      value={otp}
                      onChange={handleOtpChange}
                      disabled={loading}
                      containerClassName="gap-2 justify-center"
                    >
                      <InputOTPGroup className="gap-2">
                        {[0, 1, 2, 3, 4, 5].map((index) => (
                          <InputOTPSlot
                            key={index}
                            index={index}
                            className="size-12 rounded-xl border border-slate-200 text-lg font-bold text-[#15172e] shadow-sm transition-all focus-within:border-[#7c3aed] focus-within:ring-2 focus-within:ring-[#7c3aed]/20"
                          />
                        ))}
                      </InputOTPGroup>
                    </InputOTP>
                    <p className="mt-3 text-xs text-[#777b95]">
                      Enter the 6-digit code delivered to your WhatsApp
                    </p>
                  </div>

                  {error ? (
                    <p className="rounded-2xl bg-[#fff0f1] px-4 py-3 text-sm font-medium text-[#c43b4a]">
                      {error}
                    </p>
                  ) : null}

                  <Button
                    type="button"
                    onClick={() => handleVerifyOtp()}
                    disabled={loading || otp.length !== 6}
                    className="h-12 w-full justify-center rounded-2xl bg-[#7c3aed] text-base font-semibold text-white shadow-lg shadow-[#7c3aed]/25 hover:bg-[#6d28d9] disabled:opacity-50 transition-all"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <span className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        Verifying...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <CheckCircle2 className="size-4" />
                        Verify & Continue
                        <ArrowRight className="size-4 ml-1" />
                      </span>
                    )}
                  </Button>

                  {/* Resend OTP */}
                  <div className="pt-2 text-center">
                    {cooldown > 0 ? (
                      <p className="text-xs font-medium text-[#777b95]">
                        Resend code via WhatsApp in{" "}
                        <span className="font-semibold text-[#7c3aed]">
                          00:{cooldown < 10 ? `0${cooldown}` : cooldown}
                        </span>
                      </p>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSendOtp()}
                        disabled={loading}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#7c3aed] hover:underline disabled:opacity-50"
                      >
                        <RotateCcw className="size-3" />
                        Resend OTP via WhatsApp
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* STEP 3: Studio Profile (Only for First-Time Users) */}
              {step === "studio" && (
                <form onSubmit={handleRegisterProfile} className="space-y-4" noValidate>
                  <FloatingInput
                    id="artistName"
                    label="Artist name *"
                    icon={<User className="size-3.5" />}
                    type="text"
                    required
                    disabled={loading}
                    error={formErrors.artistName}
                    value={artistName}
                    onChange={(e) => {
                      if (formErrors.artistName) setFormErrors((prev) => ({ ...prev, artistName: "" }))
                      setArtistName(e.target.value)
                    }}
                  />

                  <FloatingInput
                    id="studioName"
                    label="Studio name *"
                    icon={<Store className="size-3.5" />}
                    type="text"
                    required
                    disabled={loading}
                    error={formErrors.studioName}
                    value={studioName}
                    onChange={(e) => {
                      if (formErrors.studioName) setFormErrors((prev) => ({ ...prev, studioName: "" }))
                      setStudioName(e.target.value)
                    }}
                  />

                  <FloatingInput
                    id="address"
                    label="Address *"
                    icon={<MapPin className="size-3.5" />}
                    type="text"
                    required
                    disabled={loading}
                    maxLength={200}
                    error={formErrors.address}
                    value={address}
                    onChange={(e) => {
                      if (formErrors.address) setFormErrors((prev) => ({ ...prev, address: "" }))
                      setAddress(e.target.value.slice(0, 200))
                    }}
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
                      {studioLogo && <span className="text-[#7c3aed] text-xs font-semibold">Selected</span>}
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

                  {error ? (
                    <p className="rounded-2xl bg-[#fff0f1] px-4 py-3 text-sm font-medium text-[#c43b4a]">
                      {error}
                    </p>
                  ) : null}

                  <Button
                    type="submit"
                    disabled={loading}
                    className="h-12 w-full justify-center rounded-2xl bg-[#7c3aed] text-base font-semibold text-white shadow-lg shadow-[#7c3aed]/25 hover:bg-[#6d28d9] disabled:opacity-50 transition-all"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <span className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        Setting up your studio...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        Complete Setup & Launch Dashboard
                        <ArrowRight className="size-4 ml-1" />
                      </span>
                    )}
                  </Button>
                </form>
              )}

              {/* Bottom footer notice */}
              <div className="mt-6 text-center text-xs text-[#777b95] border-t border-slate-100 pt-4">
                <span>By continuing, you agree to the ArtistOS </span>
                <Link href="/terms" className="text-[#7c3aed] hover:underline">
                  Terms of Service
                </Link>
                <span> and </span>
                <Link href="/privacy" className="text-[#7c3aed] hover:underline">
                  Privacy Policy
                </Link>
                .
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  )
}
