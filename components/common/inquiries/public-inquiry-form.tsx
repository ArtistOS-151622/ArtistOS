"use client"

import { useEffect, useMemo, useState } from "react"
import type { FormEvent } from "react"
import { ArrowLeft, ArrowRight, CalendarCheck, Check, CheckCircle2, Clock, Mail, MapPin, Scissors, UserRound } from "lucide-react"

import { DatePicker } from "@/components/common/shared/date-picker"
import { FloatingInput, FloatingPhoneInput, FloatingTextarea } from "@/components/common/shared/floating-input"
import { TimePicker } from "@/components/common/shared/time-picker"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
  emptyPublicInquiryForm,
  type PublicInquiryFormValues,
} from "@/components/common/inquiries/inquiry-types"
import { formatDuration, formatPrice, type ArtistService } from "@/components/common/services/service-types"

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
  const [values, setValues] = useState<PublicInquiryFormValues>(emptyPublicInquiryForm)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState("")
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
    return services.reduce((sum, service) => (
      selected.has(String(service.id)) ? sum + Number(service.price) : sum
    ), 0)
  }, [services, values.services])

  const selectedServices = useMemo(() => {
    const selected = new Set(values.services)
    return services.filter((service) => selected.has(String(service.id)))
  }, [services, values.services])

  function updateValue<K extends keyof PublicInquiryFormValues>(
    key: K,
    value: PublicInquiryFormValues[K],
  ) {
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

    if (!canContinueDetails) {
      setError("Please complete your name, phone, email, address, date, and time.")
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
    } catch {
      setError("Unable to submit inquiry.")
    } finally {
      setSubmitting(false)
    }
  }

  const canContinueDetails =
    values.customer_name.trim() &&
    values.phone.trim() &&
    values.email.trim() &&
    values.address.trim() &&
    values.booking_date &&
    values.start_time &&
    values.end_time
  const canSubmit = canContinueDetails

  if (loading) {
    return (
      <main className="flex min-h-svh items-center justify-center bg-[#eef2ff] px-4 py-10">
        <Card className="w-full max-w-md rounded-xl border-white/80 bg-white/90 shadow-xl shadow-slate-950/10">
          <CardContent className="p-6 text-center text-sm font-semibold text-slate-500">
            Loading inquiry form...
          </CardContent>
        </Card>
      </main>
    )
  }

  if (!artist) {
    return (
      <main className="flex min-h-svh items-center justify-center bg-[#eef2ff] px-4 py-10">
        <Card className="w-full max-w-md rounded-xl border-white/80 bg-white/90 shadow-xl shadow-slate-950/10">
          <CardContent className="space-y-3 p-6 text-center">
            <h1 className="text-lg font-bold text-slate-900">Inquiry form unavailable</h1>
            <p className="text-sm text-slate-500">{error || "This inquiry link could not be found."}</p>
          </CardContent>
        </Card>
      </main>
    )
  }

  if (submitted) {
    return (
      <main className="flex min-h-svh items-center justify-center bg-[#eef2ff] px-4 py-10">
        <Card className="w-full max-w-md rounded-xl border-white/80 bg-white/95 shadow-xl shadow-slate-950/10">
          <CardContent className="space-y-4 p-6 text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <Check className="size-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Inquiry submitted</h1>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                {artist.studio_name} received your details and will confirm the booking soon.
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
    )
  }

  return (
    <main className="min-h-svh bg-[#f4f7fb] px-3 py-4 text-slate-900 sm:px-6 sm:py-8 lg:px-8">
      <div className="mx-auto w-full max-w-6xl">
        <section className="overflow-hidden rounded-xl border border-white bg-white shadow-xl shadow-slate-950/8">
          <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="space-y-4 border-b border-slate-100 p-5 sm:p-6 lg:border-b-0 lg:border-r">
              <Badge className="rounded-md bg-[#dcfce7] text-emerald-700 hover:bg-[#dcfce7]">
                Booking inquiry
              </Badge>
              <div className="max-w-2xl">
                <h1 className="text-2xl font-bold tracking-normal text-slate-950 sm:text-3xl">
                  {artist.studio_name}
                </h1>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Fill your details once. The artist will review your request and confirm availability.
                </p>
              </div>
              <div className="grid gap-2 text-sm font-medium text-slate-600 sm:grid-cols-2">
                <div className="flex min-w-0 items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
                  <UserRound className="size-4 shrink-0 text-[#7c3aed]" />
                  <span className="truncate">{artist.artist_name}</span>
                </div>
                <div className="flex min-w-0 items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
                  <MapPin className="size-4 shrink-0 text-[#7c3aed]" />
                  <span className="truncate">{artist.address}</span>
                </div>
              </div>
            </div>

          </div>
        </section>

        <form onSubmit={submitInquiry} className="mt-5">
          {step === "details" ? (
            <div className="mx-auto max-w-3xl space-y-5">
              <Card className="rounded-xl border-white bg-white shadow-lg shadow-slate-950/6">
                <CardContent className="space-y-5 p-5 sm:p-6">
                  <div>
                    <h2 className="text-base font-bold text-slate-950">Customer details</h2>
                    <p className="mt-1 text-sm text-slate-500">Use the phone number where the artist can contact you.</p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FloatingInput
                      label="Customer name"
                      icon={<UserRound className="size-4" />}
                      value={values.customer_name}
                      maxLength={50}
                      onChange={(event) => updateValue("customer_name", event.target.value.slice(0, 50))}
                    />
                    <FloatingPhoneInput
                      label="Phone number"
                      value={values.phone}
                      onChange={(event) => updateValue("phone", event.target.value)}
                    />
                    <FloatingPhoneInput
                      label="Alternate phone"
                      value={values.alt_phone}
                      onChange={(event) => updateValue("alt_phone", event.target.value)}
                    />
                    <FloatingInput
                      type="email"
                      label="Email"
                      icon={<Mail className="size-4" />}
                      value={values.email}
                      onChange={(event) => updateValue("email", event.target.value)}
                    />
                  </div>
                  <FloatingTextarea
                    label="Address"
                    icon={<MapPin className="size-4" />}
                    value={values.address}
                    rows={3}
                    onChange={(event) => updateValue("address", event.target.value)}
                  />
                </CardContent>
              </Card>

              <Card className="rounded-xl border-white bg-white shadow-lg shadow-slate-950/6">
                <CardContent className="space-y-5 p-5 sm:p-6">
                  <div>
                    <h2 className="text-base font-bold text-slate-950">Booking date and time</h2>
                    <p className="mt-1 text-sm text-slate-500">Choose your preferred date, start time, and end time.</p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <DatePicker
                      label="Booking date"
                      value={values.booking_date}
                      onChange={(value) => updateValue("booking_date", value)}
                    />
                    <TimePicker
                      label="Start time"
                      value={values.start_time}
                      onChange={(value) => updateValue("start_time", value)}
                    />
                    <TimePicker
                      label="End time"
                      value={values.end_time}
                      onChange={(value) => updateValue("end_time", value)}
                    />
                  </div>
                  <FloatingTextarea
                    label="Additional request"
                    icon={<CalendarCheck className="size-4" />}
                    value={values.additional_request}
                    rows={4}
                    onChange={(event) => updateValue("additional_request", event.target.value)}
                  />
                </CardContent>
              </Card>

              {error ? (
                <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
                  {error}
                </p>
              ) : null}

              <div className="flex justify-end">
                <Button
                  type="button"
                  disabled={!canContinueDetails}
                  onClick={goToServices}
                  className="h-12 w-full rounded-xl bg-[#7c3aed] text-sm font-bold text-white hover:bg-[#6d28d9] sm:w-auto sm:px-6"
                >
                  Next
                  <ArrowRight className="size-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
            <Card className="rounded-xl border-white bg-white shadow-lg shadow-slate-950/6">
              <CardContent className="space-y-4 p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-bold text-slate-950">Select services</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      {values.services.length ? `${values.services.length} selected` : "Optional"}
                    </p>
                  </div>
                  <div className="flex size-10 items-center justify-center rounded-lg bg-[#ede9fe] text-[#7c3aed]">
                    <Scissors className="size-5" />
                  </div>
                </div>

                {services.length ? (
                  <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
                    {services.map((service) => {
                      const selected = values.services.includes(String(service.id))
                      return (
                        <button
                          key={service.id}
                          type="button"
                          onClick={() => toggleService(service.id)}
                          className={cn(
                            "grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-lg border px-3 py-3 text-left transition",
                            selected
                              ? "border-[#7c3aed] bg-[#f5f3ff] shadow-sm"
                              : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50",
                          )}
                          aria-pressed={selected}
                        >
                          <span
                            className={cn(
                              "flex size-5 items-center justify-center rounded-md border",
                              selected
                                ? "border-[#7c3aed] bg-[#7c3aed] text-white"
                                : "border-slate-300 bg-white text-transparent",
                            )}
                          >
                            <Check className="size-3.5" />
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-bold text-slate-900">
                              {service.service_name}
                            </span>
                            <span className="mt-1 flex items-center gap-1.5 text-xs font-medium text-slate-500">
                              <Clock className="size-3.5" />
                              {formatDuration(service.duration_minutes)}
                            </span>
                          </span>
                          <span className="shrink-0 rounded-md bg-slate-100 px-2 py-1 text-xs font-bold text-slate-700">
                            {formatPrice(service.price)}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  <p className="rounded-lg bg-slate-50 p-3 text-sm leading-6 text-slate-500">
                    Services are not listed yet. Submit your request and the artist can assign services later.
                  </p>
                )}
              </CardContent>
            </Card>

            <aside className="space-y-5 lg:sticky lg:top-6">
            <Card className="rounded-xl border-white bg-white shadow-lg shadow-slate-950/6">
              <CardContent className="space-y-4 p-5">
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-semibold text-slate-500">Selected services</span>
                    <span className="font-bold text-slate-950">{selectedServices.length}</span>
                  </div>
                  {selectedServices.length ? (
                    <div className="space-y-2">
                      {selectedServices.slice(0, 3).map((service) => (
                        <div key={service.id} className="flex items-center justify-between gap-3 text-xs">
                          <span className="min-w-0 truncate font-semibold text-slate-600">{service.service_name}</span>
                          <span className="shrink-0 font-bold text-slate-700">{formatPrice(service.price)}</span>
                        </div>
                      ))}
                      {selectedServices.length > 3 ? (
                        <p className="text-xs font-semibold text-slate-400">
                          +{selectedServices.length - 3} more
                        </p>
                      ) : null}
                    </div>
                  ) : (
                    <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-500">
                      No service selected yet.
                    </p>
                  )}
                  <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                    <span className="text-sm font-bold text-slate-900">Estimated total</span>
                    <span className="text-lg font-bold text-slate-950">{formatPrice(selectedTotal)}</span>
                  </div>
                </div>

                {error ? (
                  <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
                    {error}
                  </p>
                ) : null}

                <Button
                  type="button"
                  variant="outline"
                  onClick={goBackToDetails}
                  disabled={submitting}
                  className="h-11 w-full rounded-xl border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                >
                  <ArrowLeft className="size-4" />
                  Back
                </Button>
                <Button
                  type="submit"
                  disabled={submitting || !canSubmit}
                  className="h-12 w-full rounded-xl bg-[#7c3aed] text-sm font-bold text-white hover:bg-[#6d28d9]"
                >
                  {submitting ? "Submitting..." : "Submit inquiry"}
                </Button>
                <p className="flex items-center justify-center gap-1.5 text-center text-xs font-medium text-slate-400">
                  <CheckCircle2 className="size-3.5" />
                  Your details create a customer profile for faster booking.
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
