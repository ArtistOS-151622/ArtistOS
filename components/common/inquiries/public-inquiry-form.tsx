"use client"

import { useEffect, useMemo, useState } from "react"
import type { FormEvent } from "react"
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  CalendarCheck,
  Check,
  CheckCircle2,
  Clock,
  Mail,
  MapPin,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react"

import { DatePicker } from "@/components/common/shared/date-picker"
import {
  FloatingInput,
  FloatingPhoneInput,
  FloatingTextarea,
} from "@/components/common/shared/floating-input"
import { TimePicker } from "@/components/common/shared/time-picker"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
  emptyPublicInquiryForm,
  type PublicInquiryFormValues,
} from "@/components/common/inquiries/inquiry-types"
import {
  formatDuration,
  formatPrice,
  type ArtistService,
} from "@/components/common/services/service-types"

type Artist = {
  id: number
  artist_name: string
  studio_name: string
  address: string
}

type PublicInquiryFormProps = {
  formCode: string
}

type PublicInquiryResponse = {
  artist?: Artist
  active_until?: string
  services?: ArtistService[]
  inquiry?: { id: number }
  error?: string
}

export function PublicInquiryForm({ formCode }: PublicInquiryFormProps) {
  const [artist, setArtist] = useState<Artist | null>(null)
  const [services, setServices] = useState<ArtistService[]>([])
  const [values, setValues] =
    useState<PublicInquiryFormValues>(emptyPublicInquiryForm)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState("")
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [step, setStep] = useState<"details" | "services">("details")

  useEffect(() => {
    async function loadForm() {
      setLoading(true)
      setError("")
      try {
        const res = await fetch(`/api/public/inquiry/f/${formCode}`)
        const data = (await res.json()) as PublicInquiryResponse
        if (!res.ok) {
          setError(data.error ?? "Unable to load inquiry form.")
          return
        }

        setArtist(data.artist ?? null)
        setServices(data.services ?? [])
      } catch {
        setError("Unable to load inquiry form.")
      } finally {
        setLoading(false)
      }
    }

    void loadForm()
  }, [formCode])

  const selectedTotal = useMemo(() => {
    const selected = new Set(values.services)
    return services.reduce(
      (sum, service) =>
        selected.has(String(service.id)) ? sum + Number(service.price) : sum,
      0
    )
  }, [services, values.services])

  const selectedServices = useMemo(() => {
    const selected = new Set(values.services)
    return services.filter((service) => selected.has(String(service.id)))
  }, [services, values.services])

  function updateValue<K extends keyof PublicInquiryFormValues>(
    key: K,
    value: PublicInquiryFormValues[K]
  ) {
    if (formErrors[key]) setFormErrors((prev) => ({ ...prev, [key]: "" }))
    setValues((current) => ({ ...current, [key]: value }))
  }

  function toggleService(serviceId: number) {
    const serviceValue = String(serviceId)
    setValues((current) => ({
      ...current,
      services: current.services.includes(serviceValue)
        ? current.services.filter((id) => id !== serviceValue)
        : [...current.services, serviceValue],
    }))
  }

  function goToServices() {
    setError("")

    const newErrors: Record<string, string> = {}
    if (!values.customer_name.trim())
      newErrors.customer_name = "Please enter your full name."
    if (!values.phone.trim())
      newErrors.phone = "Please enter a valid phone number."
    if (!values.email.trim())
      newErrors.email = "Please enter your email address."
    if (!values.address.trim())
      newErrors.address = "Please enter event venue or address."
    if (!values.booking_date)
      newErrors.booking_date = "Please select event date."
    if (!values.start_time)
      newErrors.start_time = "Please choose start time."
    if (!values.end_time)
      newErrors.end_time = "Please choose end time."

    if (Object.keys(newErrors).length > 0) {
      setFormErrors(newErrors)
      setError("Please fill out all required fields to continue.")
      return
    }

    setStep("services")
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  function goBackToDetails() {
    setError("")
    setStep("details")
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  async function submitInquiry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (step === "details") {
      goToServices()
      return
    }

    setSubmitting(true)
    setError("")

    try {
      const res = await fetch(`/api/public/inquiry/f/${formCode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      })
      const data = (await res.json()) as PublicInquiryResponse

      if (!res.ok || !data.inquiry) {
        setError(data.error ?? "Unable to submit inquiry.")
        return
      }

      setSubmitted(true)
      window.scrollTo({ top: 0, behavior: "smooth" })
    } catch {
      setError("Unable to submit inquiry. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 via-purple-50/20 to-slate-100 px-4 py-12">
        <div className="w-full max-w-md rounded-3xl border border-slate-200/80 bg-white p-8 text-center shadow-xl">
          <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-purple-50 text-[#7c3aed] animate-pulse">
            <Sparkles className="size-6" />
          </div>
          <h3 className="mt-4 text-base font-bold text-slate-800">
            Loading booking inquiry...
          </h3>
          <p className="mt-1 text-xs text-slate-400">
            Preparing artist availability and service catalog.
          </p>
        </div>
      </main>
    )
  }

  if (!artist) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 via-rose-50/20 to-slate-100 px-4 py-12">
        <div className="w-full max-w-md rounded-3xl border border-rose-200/80 bg-white p-8 text-center shadow-xl">
          <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
            <Calendar className="size-6" />
          </div>
          <h1 className="mt-4 text-lg font-extrabold text-slate-900">
            Inquiry Link Expired
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-slate-500 leading-relaxed">
            {error ||
              "This inquiry form link has expired or is no longer available. Please contact the artist directly for a fresh link."}
          </p>
        </div>
      </main>
    )
  }

  if (submitted) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 via-emerald-50/20 to-slate-100 px-4 py-12 text-slate-900">
        <div className="w-full max-w-lg rounded-3xl border border-emerald-100 bg-white p-6 sm:p-8 text-center shadow-xl shadow-emerald-500/5">
          <div className="mx-auto flex size-16 items-center justify-center rounded-3xl bg-emerald-50 text-emerald-600 ring-8 ring-emerald-50/50">
            <CheckCircle2 className="size-8" />
          </div>
          <h1 className="mt-5 text-2xl font-extrabold text-slate-900">
            Inquiry Submitted Successfully!
          </h1>
          <p className="mt-2 text-sm text-slate-600 leading-relaxed">
            Thank you, <strong>{values.customer_name}</strong>.{" "}
            <strong>{artist.studio_name}</strong> has received your appointment
            request for <strong>{values.booking_date}</strong>.
          </p>

          <div className="mt-6 rounded-2xl bg-slate-50 border border-slate-100 p-4 text-left text-xs space-y-2">
            <div className="flex items-center justify-between text-slate-500">
              <span>Artist / Studio:</span>
              <span className="font-bold text-slate-800">{artist.studio_name}</span>
            </div>
            <div className="flex items-center justify-between text-slate-500">
              <span>Preferred Date & Time:</span>
              <span className="font-bold text-slate-800">
                {values.booking_date} ({values.start_time} - {values.end_time})
              </span>
            </div>
            {selectedServices.length > 0 && (
              <div className="flex items-center justify-between text-slate-500 pt-1 border-t border-slate-200/60">
                <span>Estimated Value:</span>
                <span className="font-bold text-emerald-600">
                  {formatPrice(selectedTotal)}
                </span>
              </div>
            )}
          </div>

          <p className="mt-5 text-xs text-slate-400 flex items-center justify-center gap-1.5 font-medium">
            <ShieldCheck className="size-4 text-emerald-600" />
            <span>The artist will contact you via WhatsApp or Call shortly.</span>
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-purple-50/20 to-slate-100 px-3 py-6 sm:px-6 sm:py-10 text-slate-900">
      <div className="mx-auto w-full max-w-4xl space-y-6">
        {/* Studio Branding Hero Header */}
        <section className="relative overflow-hidden rounded-3xl border border-white/80 bg-white/90 p-5 sm:p-7 shadow-xl shadow-purple-950/5 backdrop-blur">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-2 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge
                  variant="outline"
                  className="rounded-lg bg-purple-50 text-[#7c3aed] border-purple-200 font-bold text-[11px] px-2.5 py-0.5"
                >
                  <Sparkles className="size-3 mr-1" />
                  Official Booking Form
                </Badge>
                <Badge
                  variant="outline"
                  className="rounded-lg bg-emerald-50 text-emerald-700 border-emerald-200 font-bold text-[11px] px-2 py-0.5"
                >
                  Verified Artist
                </Badge>
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                {artist.studio_name}
              </h1>

              <p className="text-xs sm:text-sm text-slate-500 max-w-xl">
                Fill in your appointment details below. {artist.artist_name} will
                review and get in touch with you to finalize your booking.
              </p>
            </div>

            <div className="flex flex-col sm:items-end gap-1.5 text-xs text-slate-500 shrink-0 bg-slate-50/80 p-3 rounded-2xl border border-slate-100">
              <div className="flex items-center gap-1.5 font-bold text-slate-800">
                <UserRound className="size-3.5 text-[#7c3aed]" />
                <span>{artist.artist_name}</span>
              </div>
              {artist.address && (
                <div className="flex items-center gap-1.5 text-slate-500">
                  <MapPin className="size-3.5 text-slate-400" />
                  <span className="truncate max-w-[200px]">{artist.address}</span>
                </div>
              )}
            </div>
          </div>

          {/* Stepper Indicator */}
          <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-1">
              <div
                className={cn(
                  "flex size-7 sm:size-8 items-center justify-center rounded-xl font-bold text-xs shrink-0 transition-all",
                  step === "details"
                    ? "bg-[#7c3aed] text-white shadow-sm shadow-purple-500/30"
                    : "bg-emerald-500 text-white"
                )}
              >
                {step === "services" ? <Check className="size-4" /> : "1"}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate">
                  1. Your Details & Schedule
                </p>
                <p className="text-[10px] text-slate-400 truncate hidden sm:block">
                  Contact, date & venue
                </p>
              </div>
            </div>

            <div className="w-8 sm:w-16 h-0.5 bg-slate-200 shrink-0 rounded-full" />

            <div className="flex items-center gap-2 flex-1 justify-end">
              <div
                className={cn(
                  "flex size-7 sm:size-8 items-center justify-center rounded-xl font-bold text-xs shrink-0 transition-all",
                  step === "services"
                    ? "bg-[#7c3aed] text-white shadow-sm shadow-purple-500/30"
                    : "bg-slate-100 text-slate-400"
                )}
              >
                2
              </div>
              <div className="min-w-0 text-right">
                <p className="text-xs font-bold text-slate-900 truncate">
                  2. Services & Summary
                </p>
                <p className="text-[10px] text-slate-400 truncate hidden sm:block">
                  Pick services & submit
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Multi-step Form */}
        <form onSubmit={submitInquiry} noValidate>
          {step === "details" ? (
            /* Step 1: Customer Contact & Schedule */
            <div className="space-y-5">
              <Card className="rounded-3xl border-white/80 bg-white/90 shadow-lg shadow-purple-950/5 backdrop-blur overflow-hidden">
                <CardContent className="p-5 sm:p-7 space-y-5">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div>
                      <h2 className="text-base font-extrabold text-slate-900">
                        Customer Information
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Please provide your contact details for confirmation.
                      </p>
                    </div>
                    <div className="flex size-8 items-center justify-center rounded-xl bg-purple-50 text-[#7c3aed]">
                      <UserRound className="size-4" />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <FloatingInput
                      label="Your Full Name"
                      icon={<UserRound className="size-4 text-slate-400" />}
                      value={values.customer_name}
                      maxLength={50}
                      error={formErrors.customer_name}
                      required
                      onChange={(e) =>
                        updateValue("customer_name", e.target.value.slice(0, 50))
                      }
                    />

                    <FloatingPhoneInput
                      label="Mobile Number (WhatsApp)"
                      value={values.phone}
                      error={formErrors.phone}
                      required
                      onChange={(e) => updateValue("phone", e.target.value)}
                    />

                    <FloatingPhoneInput
                      label="Alternative Phone (Optional)"
                      value={values.alt_phone}
                      error={formErrors.alt_phone}
                      onChange={(e) => updateValue("alt_phone", e.target.value)}
                    />

                    <FloatingInput
                      type="email"
                      label="Email Address"
                      icon={<Mail className="size-4 text-slate-400" />}
                      value={values.email}
                      error={formErrors.email}
                      required
                      onChange={(e) => updateValue("email", e.target.value)}
                    />
                  </div>

                  <FloatingTextarea
                    label="Event Venue / Full Address"
                    icon={<MapPin className="size-4 text-slate-400" />}
                    value={values.address}
                    rows={3}
                    maxLength={200}
                    error={formErrors.address}
                    required
                    onChange={(e) =>
                      updateValue("address", e.target.value.slice(0, 200))
                    }
                  />
                </CardContent>
              </Card>

              <Card className="rounded-3xl border-white/80 bg-white/90 shadow-lg shadow-purple-950/5 backdrop-blur overflow-hidden">
                <CardContent className="p-5 sm:p-7 space-y-5">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div>
                      <h2 className="text-base font-extrabold text-slate-900">
                        Event Date & Time
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Select when you need the artist for your appointment.
                      </p>
                    </div>
                    <div className="flex size-8 items-center justify-center rounded-xl bg-purple-50 text-[#7c3aed]">
                      <Calendar className="size-4" />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <div>
                      <DatePicker
                        label="Event Date"
                        value={values.booking_date}
                        onChange={(val) => updateValue("booking_date", val)}
                      />
                      {formErrors.booking_date && (
                        <p className="mt-1 text-xs text-rose-500 pl-1 font-medium">
                          {formErrors.booking_date}
                        </p>
                      )}
                    </div>

                    <div>
                      <TimePicker
                        label="Start Time"
                        value={values.start_time}
                        onChange={(val) => updateValue("start_time", val)}
                      />
                      {formErrors.start_time && (
                        <p className="mt-1 text-xs text-rose-500 pl-1 font-medium">
                          {formErrors.start_time}
                        </p>
                      )}
                    </div>

                    <div>
                      <TimePicker
                        label="End Time"
                        value={values.end_time}
                        onChange={(val) => updateValue("end_time", val)}
                      />
                      {formErrors.end_time && (
                        <p className="mt-1 text-xs text-rose-500 pl-1 font-medium">
                          {formErrors.end_time}
                        </p>
                      )}
                    </div>
                  </div>

                  <FloatingTextarea
                    label="Special Instructions or Requests (Optional)"
                    icon={<CalendarCheck className="size-4 text-slate-400" />}
                    value={values.additional_request}
                    rows={3}
                    onChange={(e) =>
                      updateValue("additional_request", e.target.value)
                    }
                  />
                </CardContent>
              </Card>

              {error ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3.5 text-xs sm:text-sm font-bold text-rose-700">
                  {error}
                </div>
              ) : null}

              <div className="flex justify-end pt-2">
                <Button
                  type="button"
                  onClick={goToServices}
                  className="h-12 w-full sm:w-auto px-8 rounded-2xl bg-[#7c3aed] text-white font-bold text-sm shadow-md shadow-purple-500/25 hover:bg-[#6d28d9] flex items-center justify-center gap-2"
                >
                  <span>Continue to Services</span>
                  <ArrowRight className="size-4" />
                </Button>
              </div>
            </div>
          ) : (
            /* Step 2: Select Services & Review Summary */
            <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
              <Card className="rounded-3xl border-white/80 bg-white/90 shadow-lg shadow-purple-950/5 backdrop-blur overflow-hidden">
                <CardContent className="p-5 sm:p-7 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div>
                      <h2 className="text-base font-extrabold text-slate-900">
                        Choose Services
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Select one or more services you would like to book.
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className="rounded-lg bg-purple-50 text-[#7c3aed] border-purple-200 font-bold text-xs px-2.5 py-1"
                    >
                      {values.services.length}{" "}
                      {values.services.length === 1 ? "Selected" : "Selected"}
                    </Badge>
                  </div>

                  {services.length > 0 ? (
                    <div className="grid gap-2.5 max-h-[480px] overflow-y-auto pr-1">
                      {services.map((service) => {
                        const isSelected = values.services.includes(
                          String(service.id)
                        )
                        return (
                          <div
                            key={service.id}
                            onClick={() => toggleService(service.id)}
                            className={cn(
                              "flex items-center justify-between gap-3 rounded-2xl border p-3.5 text-left transition-all duration-150 cursor-pointer",
                              isSelected
                                ? "border-[#7c3aed] bg-purple-50/50 shadow-xs ring-1 ring-[#7c3aed]/20"
                                : "border-slate-200/80 bg-white hover:border-slate-300 hover:bg-slate-50/80"
                            )}
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <div
                                className={cn(
                                  "flex size-6 items-center justify-center rounded-lg border transition-all shrink-0",
                                  isSelected
                                    ? "border-[#7c3aed] bg-[#7c3aed] text-white"
                                    : "border-slate-300 bg-white"
                                )}
                              >
                                {isSelected && <Check className="size-3.5" />}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-bold text-slate-900 truncate">
                                  {service.service_name}
                                </p>
                                <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400">
                                  <Clock className="size-3 shrink-0" />
                                  <span>{formatDuration(service.duration_minutes)}</span>
                                </div>
                              </div>
                            </div>

                            <span className="font-extrabold text-sm text-slate-900 shrink-0 bg-slate-100/80 px-2.5 py-1 rounded-xl">
                              {formatPrice(service.price)}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="rounded-2xl bg-slate-50 p-6 text-center text-xs text-slate-500 border border-slate-100">
                      No services currently listed. You can proceed and the artist
                      will confirm service items upon review.
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Order Summary Sidebar */}
              <aside className="space-y-4 lg:sticky lg:top-6">
                <Card className="rounded-3xl border-white/80 bg-white/90 shadow-lg shadow-purple-950/5 backdrop-blur overflow-hidden">
                  <CardContent className="p-5 sm:p-6 space-y-4">
                    <h3 className="text-sm font-extrabold text-slate-900 pb-2 border-b border-slate-100 flex items-center justify-between">
                      <span>Inquiry Summary</span>
                      <Sparkles className="size-4 text-[#7c3aed]" />
                    </h3>

                    {/* Client & Date snapshot */}
                    <div className="rounded-2xl bg-slate-50 p-3 text-xs space-y-1.5 border border-slate-100">
                      <div className="flex justify-between">
                        <span className="text-slate-400 font-medium">Client:</span>
                        <span className="font-bold text-slate-800 truncate max-w-[150px]">
                          {values.customer_name}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400 font-medium">Date:</span>
                        <span className="font-bold text-slate-800">
                          {values.booking_date}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400 font-medium">Time:</span>
                        <span className="font-bold text-slate-800">
                          {values.start_time} - {values.end_time}
                        </span>
                      </div>
                    </div>

                    {/* Selected items list */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>Selected Items ({selectedServices.length}):</span>
                      </div>

                      {selectedServices.length > 0 ? (
                        <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                          {selectedServices.map((s) => (
                            <div
                              key={s.id}
                              className="flex items-center justify-between text-xs text-slate-700"
                            >
                              <span className="truncate pr-2">{s.service_name}</span>
                              <span className="font-bold shrink-0">
                                {formatPrice(s.price)}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 italic">
                          No service selected (optional)
                        </p>
                      )}

                      <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                        <span className="text-sm font-extrabold text-slate-900">
                          Estimated Total:
                        </span>
                        <span className="text-lg font-extrabold text-emerald-600">
                          {formatPrice(selectedTotal)}
                        </span>
                      </div>
                    </div>

                    {error ? (
                      <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-700">
                        {error}
                      </p>
                    ) : null}

                    <div className="space-y-2 pt-2">
                      <Button
                        type="submit"
                        disabled={submitting}
                        className="h-12 w-full rounded-2xl bg-[#7c3aed] text-white font-bold text-sm shadow-md shadow-purple-500/25 hover:bg-[#6d28d9] flex items-center justify-center gap-2"
                      >
                        {submitting ? (
                          <span>Submitting Request...</span>
                        ) : (
                          <>
                            <CheckCircle2 className="size-4" />
                            <span>Submit Booking Inquiry</span>
                          </>
                        )}
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        onClick={goBackToDetails}
                        disabled={submitting}
                        className="h-10 w-full rounded-2xl border-slate-200 bg-white text-slate-700 font-bold text-xs hover:bg-slate-50"
                      >
                        <ArrowLeft className="size-3.5 mr-1" />
                        <span>Edit Contact & Date</span>
                      </Button>
                    </div>

                    <p className="text-[11px] text-slate-400 text-center flex items-center justify-center gap-1">
                      <ShieldCheck className="size-3.5 text-emerald-600" />
                      <span>Safe & secure direct inquiry</span>
                    </p>
                  </CardContent>
                </Card>
              </aside>
            </div>
          )}
        </form>
      </div>
    </main>
  )
}
