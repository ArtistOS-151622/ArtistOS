"use client"

import { CalendarCheck, CheckCircle2, Clock, MapPin, MessageCircle, PhoneCall, XCircle } from "lucide-react"

import type { Inquiry } from "@/components/common/inquiries/inquiry-types"
import { formatPrice } from "@/components/common/services/service-types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

type InquiryCardProps = {
  inquiry: Inquiry
  loading?: boolean
  readOnly?: boolean
  onConvert: (inquiry: Inquiry) => void
  onCancel: (inquiry: Inquiry) => void
}

const statusStyles: Record<Inquiry["status"], string> = {
  new: "border-amber-200 bg-amber-50 text-amber-700",
  booked: "border-emerald-200 bg-emerald-50 text-emerald-700",
  cancelled: "border-rose-200 bg-rose-50 text-rose-700",
}

const statusLabels: Record<Inquiry["status"], string> = {
  new: "New inquiry",
  booked: "Booking created",
  cancelled: "Booking not created",
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value))
}

function formatTime(value: string) {
  const [hourValue, minute = "00"] = value.split(":")
  const hour = Number(hourValue)
  if (!Number.isFinite(hour)) return value
  const ampm = hour >= 12 ? "PM" : "AM"
  const displayHour = hour % 12 || 12
  return `${displayHour}:${minute} ${ampm}`
}

export function InquiryCard({ inquiry, loading, readOnly, onConvert, onCancel }: InquiryCardProps) {
  const customer = inquiry.customer
  const services = inquiry.services ?? []
  const total = services.reduce((sum, service) => sum + Number(service.price) * (service.quantity ?? 1), 0)
  const isNew = inquiry.status === "new"

  return (
    <Card
      data-inquiry-id={inquiry.id}
      className="overflow-hidden rounded-xl border border-white/80 bg-white/90 shadow-lg shadow-slate-950/5 backdrop-blur"
    >
      <CardContent className="space-y-4 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-lg font-bold text-slate-950">
              {customer?.customer_name ?? "Unknown customer"}
            </h3>
            <p className="mt-1 truncate text-sm font-medium text-slate-500">
              {customer?.phone ?? "No phone"} {customer?.email ? `- ${customer.email}` : ""}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            <Badge className={cn("rounded-md border font-bold hover:bg-current", statusStyles[inquiry.status])}>
              {statusLabels[inquiry.status]}
            </Badge>
            {customer?.phone ? (
              <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1">
                <a
                  href={`tel:${customer.phone}`}
                  className="flex size-8 items-center justify-center rounded-md bg-slate-100 text-slate-700 transition hover:bg-slate-800 hover:text-white"
                  title={`Call ${customer.phone}`}
                >
                  <PhoneCall className="size-3.5" />
                  <span className="sr-only">Call</span>
                </a>
                <a
                  href={`https://wa.me/${customer.phone.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex size-8 items-center justify-center rounded-md bg-emerald-50 text-emerald-600 transition hover:bg-emerald-600 hover:text-white"
                  title={`WhatsApp ${customer.phone}`}
                >
                  <MessageCircle className="size-3.5" />
                  <span className="sr-only">WhatsApp</span>
                </a>
              </div>
            ) : null}
          </div>
        </div>

        <div className="grid gap-2 rounded-lg border border-slate-200 bg-slate-50/70 p-3 text-sm text-slate-700">
          <div className="flex items-center gap-2">
            <CalendarCheck className="size-4 text-[#7c3aed]" />
            <span className="font-semibold">{formatDate(inquiry.booking_date)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="size-4 text-[#7c3aed]" />
            <span>{formatTime(inquiry.start_time)} - {formatTime(inquiry.end_time)}</span>
          </div>
          <div className="flex items-start gap-2">
            <MapPin className="mt-0.5 size-4 shrink-0 text-[#7c3aed]" />
            <span className="line-clamp-2">{inquiry.booking_address}</span>
          </div>
        </div>

        {services.length ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold uppercase text-slate-400">
              <span>Services</span>
              <span>{formatPrice(total)}</span>
            </div>
            <div className="space-y-1.5">
              {services.map((service) => (
                <div
                  key={service.id}
                  className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm"
                >
                  <span className="truncate font-semibold text-slate-700">{service.service_name}</span>
                  <span className="shrink-0 text-xs font-bold text-slate-500">{formatPrice(service.price)}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {inquiry.additional_request ? (
          <p className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm leading-6 text-slate-600">
            {inquiry.additional_request}
          </p>
        ) : null}

        <Separator />

        <div className="flex justify-end">
          {isNew ? (
            <div className="grid w-full grid-cols-2 gap-2 sm:w-auto sm:flex sm:items-center">
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-xl border-rose-200 bg-white px-3 text-sm font-bold text-rose-600 hover:bg-rose-50 sm:min-w-24"
                disabled={loading || readOnly}
                onClick={() => onCancel(inquiry)}
              >
                <XCircle className="size-4" />
                <span>Cancel</span>
              </Button>
              <Button
                type="button"
                className="h-10 rounded-xl bg-[#7c3aed] px-3 text-sm font-bold text-white hover:bg-[#6d28d9] sm:min-w-24"
                disabled={loading || readOnly}
                onClick={() => onConvert(inquiry)}
              >
                <CheckCircle2 className="size-4" />
                <span>Confirm</span>
              </Button>
            </div>
          ) : inquiry.status === "booked" && inquiry.booking_id ? (
            <span className="text-xs font-bold text-emerald-700">
              Booking #{inquiry.booking_id} created
            </span>
          ) : (
            <span className="text-xs font-bold text-rose-700">
              This inquiry was cancelled
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
