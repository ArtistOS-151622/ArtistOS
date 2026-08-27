"use client"

import { useState } from "react"
import {
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  MapPin,
  MessageCircle,
  PhoneCall,
  XCircle,
} from "lucide-react"
import { useRouter } from "next/navigation"

import type { Inquiry } from "@/components/common/inquiries/inquiry-types"
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
  onSelect?: (inquiry: Inquiry) => void
}

const statusConfig: Record<
  Inquiry["status"],
  {
    label: string
    dotColor: string
    dotPulse: string
    badgeStyle: string
    textColor: string
  }
> = {
  new: {
    label: "New Inquiry",
    dotColor: "bg-emerald-500",
    dotPulse: "bg-emerald-400",
    badgeStyle: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
    textColor: "text-emerald-600",
  },
  booked: {
    label: "Booking Created",
    dotColor: "bg-[#7c3aed]",
    dotPulse: "bg-purple-400",
    badgeStyle: "bg-purple-50 text-[#7c3aed] border-purple-200/80",
    textColor: "text-[#7c3aed]",
  },
  cancelled: {
    label: "Cancelled",
    dotColor: "bg-rose-500",
    dotPulse: "bg-rose-400",
    badgeStyle: "bg-rose-50 text-rose-700 border-rose-200/80",
    textColor: "text-rose-600",
  },
}

function formatDate(value: string) {
  if (!value) return ""
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value))
}

function formatTime(timeStr?: string) {
  if (!timeStr) return ""
  const parts = timeStr.split(":")
  if (parts.length >= 2) {
    const hour = parseInt(parts[0], 10)
    const minute = parts[1]
    if (isNaN(hour)) return timeStr
    const ampm = hour >= 12 ? "PM" : "AM"
    const displayHour = hour % 12 || 12
    return `${displayHour}:${minute} ${ampm}`
  }
  return timeStr
}

function calculateDuration(startTime?: string, endTime?: string) {
  if (!startTime || !endTime) return ""
  const startParts = startTime.split(":")
  const endParts = endTime.split(":")
  if (startParts.length < 2 || endParts.length < 2) return ""

  const startH = parseInt(startParts[0], 10)
  const startM = parseInt(startParts[1], 10)
  const endH = parseInt(endParts[0], 10)
  const endM = parseInt(endParts[1], 10)

  if (isNaN(startH) || isNaN(startM) || isNaN(endH) || isNaN(endM)) return ""

  let diffMins = endH * 60 + endM - (startH * 60 + startM)
  if (diffMins < 0) diffMins += 24 * 60

  const hours = Math.floor(diffMins / 60)
  const mins = diffMins % 60

  if (hours > 0 && mins > 0) return `${hours}h ${mins}m`
  if (hours > 0) return `${hours}h`
  if (mins > 0) return `${mins}m`
  return "0m"
}

export function InquiryCard({
  inquiry,
  loading,
  readOnly,
  onConvert,
  onCancel,
  onSelect,
}: InquiryCardProps) {
  const router = useRouter()
  const [showAllServices, setShowAllServices] = useState(false)
  const customer = inquiry.customer
  const services = inquiry.services ?? []
  const total = services.reduce(
    (sum, service) => sum + Number(service.price) * (service.quantity ?? 1),
    0
  )
  const isNew = inquiry.status === "new"
  const isBooked = inquiry.status === "booked" && Boolean(inquiry.booking_id)
  const config = statusConfig[inquiry.status] || statusConfig.new
  const duration = calculateDuration(inquiry.start_time, inquiry.end_time)

  return (
    <Card
      data-inquiry-id={inquiry.id}
      onClick={() => onSelect?.(inquiry)}
      className="group relative flex max-w-full min-w-0 flex-col overflow-hidden rounded-xl border border-white/80 bg-white/90 shadow-lg shadow-slate-950/5 transition-all backdrop-blur hover:shadow-xl hover:shadow-slate-950/10 cursor-pointer hover:-translate-y-0.5"
    >
      {/* 90% height left status accent bar */}
      <span
        className={cn(
          "absolute left-0 top-1/2 z-10 h-[90%] w-[4px] -translate-y-1/2 rounded-r-full transition-colors",
          config.dotColor
        )}
      />

      <CardContent className="min-w-0 flex-1 space-y-4 overflow-hidden px-4 py-3 sm:space-y-4">
        {/* Top Row: Connected Status (Left) & Timeline Badge (Right) */}
        <div className="flex min-w-0 items-center justify-between gap-2">
          {/* Left Side: Connector line linked directly to Capsule Badge Node */}
          <div className="flex min-w-0 items-center">
            <div className="-ml-4 flex shrink-0 items-center sm:-ml-5">
              <span
                className={cn(
                  "h-[3px] w-3.5 shrink-0 rounded-r-md sm:w-4.5",
                  config.dotColor
                )}
              />
            </div>

            <div
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-bold shadow-2xs backdrop-blur-xs transition-colors",
                config.badgeStyle
              )}
            >
              <span className="relative flex size-2 shrink-0 items-center justify-center">
                <span
                  className={cn(
                    "absolute inline-flex size-full animate-ping rounded-full opacity-75",
                    config.dotPulse
                  )}
                />
                <span
                  className={cn("relative inline-flex size-2 rounded-full", config.dotColor)}
                />
              </span>
              <span>{config.label}</span>
            </div>
          </div>

          {/* Right Side: Timeline Badge */}
          <div className="inline-flex min-w-0 items-center gap-1 rounded-md border border-slate-200/90 bg-slate-50/90 px-1.5 py-1 text-xs font-semibold text-slate-700 shadow-xs backdrop-blur-xs">
            <Calendar className="size-3 text-[#7c3aed] shrink-0" />
            <span className="truncate font-bold tracking-tight text-slate-800 sm:text-[12px]">
              {formatDate(inquiry.booking_date)}
            </span>
            {duration && (
              <span className="inline-flex shrink-0 items-center rounded-sm bg-slate-200/80 px-1 py-0.5 text-[10px] font-extrabold text-slate-700">
                {duration}
              </span>
            )}
          </div>
        </div>

        {/* Floating Border Customer Details Box */}
        <div className="relative rounded-md border border-slate-200/90 bg-slate-50/40 p-1.5 pt-1.5 shadow-2xs transition-all hover:border-slate-300">
          <span className="absolute -top-2 left-3 bg-white px-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Customer Details
          </span>

          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-base font-bold text-slate-900 sm:text-lg">
                {customer?.customer_name ?? "Unknown Customer"}
              </h3>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                <span className="font-medium">{formatTime(inquiry.start_time)} - {formatTime(inquiry.end_time)}</span>
              </div>
            </div>

            {/* Segmented Pill Action Dock (Maps, Call, WhatsApp) */}
            <div className="flex shrink-0 items-center gap-1 rounded-md border border-slate-200/90 bg-white p-1 shadow-2xs">
              {inquiry.booking_address && (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(inquiry.booking_address)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex size-8 items-center justify-center rounded-md bg-blue-50 text-blue-600 transition-all hover:bg-blue-600 hover:text-white hover:shadow-xs active:scale-95 sm:size-8.5"
                  title={`Google Maps: ${inquiry.booking_address}`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <MapPin className="size-3.5 sm:size-4" />
                  <span className="sr-only">Google Maps</span>
                </a>
              )}

              {customer?.phone && (
                <a
                  href={`tel:${customer.phone}`}
                  className="flex size-8 items-center justify-center rounded-md bg-slate-100 text-slate-700 transition-all hover:bg-slate-800 hover:text-white hover:shadow-xs active:scale-95 sm:size-8.5"
                  title={`Call: ${customer.phone}`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <PhoneCall className="size-3.5 sm:size-4" />
                  <span className="sr-only">Call</span>
                </a>
              )}

              {customer?.phone && (
                <a
                  href={`https://wa.me/${customer.phone.replace(/\D/g, "")}?text=${encodeURIComponent(`Hi ${customer?.customer_name ?? ""}, thank you for your booking inquiry!`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex size-8 items-center justify-center rounded-md bg-emerald-50 text-emerald-600 transition-all hover:bg-emerald-600 hover:text-white hover:shadow-xs active:scale-95 sm:size-8.5"
                  title={`WhatsApp: ${customer.phone}`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <MessageCircle className="size-3.5 sm:size-4" />
                  <span className="sr-only">WhatsApp</span>
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Services Section - Bullet List with Floating Border Labels */}
        {services.length > 0 ? (
          <div className="relative rounded-md border border-slate-200/90 bg-slate-50/40 p-2.5 pt-3.5 shadow-2xs transition-all hover:border-slate-300">
            <span className="absolute -top-2 left-3 bg-white px-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Requested Services ({services.length})
            </span>

            {services.length > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setShowAllServices(!showAllServices)
                }}
                className="absolute -top-2 right-3 flex items-center gap-1 bg-white px-1 text-[10px] font-semibold text-purple-600 transition-colors hover:text-purple-800"
              >
                <span>{showAllServices ? "Show Less" : "Show More"}</span>
                <ChevronDown
                  className={cn(
                    "size-3 transition-transform duration-200",
                    showAllServices && "rotate-180"
                  )}
                />
              </button>
            )}

            <div className="flex flex-col divide-y divide-slate-100/90">
              {(showAllServices ? services : services.slice(0, 1)).map((service) => (
                <div
                  key={service.id}
                  className="flex items-center gap-2 py-1.5 first:pt-0 last:pb-0"
                >
                  <span className="size-1.5 shrink-0 rounded-full bg-purple-500" />
                  <span className="truncate text-xs font-semibold text-slate-800 sm:text-sm">
                    {service.service_name}
                  </span>
                  {service.price !== undefined && service.price !== null && (
                    <span className="ml-auto text-[11px] font-bold text-purple-700">
                      ₹{Number(service.price).toLocaleString()}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="relative rounded-md border border-slate-200/90 bg-slate-50/40 p-2 text-xs text-slate-500 italic">
            <span className="absolute -top-2 left-3 bg-white px-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Services
            </span>
            No specific service pre-selected
          </div>
        )}
      </CardContent>

      {/* Divider */}
      <Separator className="border-dashed border-slate-200/80" />

      {/* Footer Row: Total Amount & Action Buttons */}
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-xl font-black text-purple-600 sm:text-2xl">
            ₹{total.toLocaleString()}
          </p>
        </div>

        {/* Action Buttons */}
        <div
          className="flex shrink-0 items-center gap-1.5"
          onClick={(e) => e.stopPropagation()}
        >
          {isNew ? (
            <>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onCancel(inquiry)}
                disabled={loading || readOnly}
                className="h-8.5 rounded-md border border-rose-200 bg-rose-50/80 text-rose-600 hover:bg-rose-600 hover:text-white transition-all text-xs font-bold px-2.5"
                title="Cancel Lead"
              >
                <XCircle className="size-3.5 mr-1" />
                <span>Cancel</span>
              </Button>
              <Button
                size="sm"
                onClick={() => onConvert(inquiry)}
                disabled={loading || readOnly}
                className="h-8.5 rounded-md bg-[#7c3aed] text-white hover:bg-[#6d28d9] transition-all text-xs font-bold px-3 shadow-sm shadow-purple-500/20"
                title="Confirm and Convert to Booking"
              >
                <CheckCircle2 className="size-3.5 mr-1" />
                <span>Confirm</span>
              </Button>
            </>
          ) : isBooked ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => router.push(`/bookings/${inquiry.booking_id}`)}
              className="h-8.5 rounded-md border-purple-200 bg-purple-50 text-[#7c3aed] hover:bg-[#7c3aed] hover:text-white transition-all text-xs font-bold px-2.5 flex items-center gap-1 shadow-2xs"
            >
              <span>Booking #{inquiry.booking_id}</span>
              <ChevronRight className="size-3.5" />
            </Button>
          ) : (
            <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-md border border-rose-100">
              Cancelled
            </span>
          )}

          {/* Details Arrow */}
          <div
            onClick={() => onSelect?.(inquiry)}
            className="flex size-8.5 items-center justify-center rounded-md border border-purple-200/80 bg-purple-50 text-purple-600 transition-all group-hover:border-purple-600 group-hover:bg-purple-600 group-hover:text-white sm:size-9 cursor-pointer"
            title="View inquiry details"
          >
            <ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </div>
        </div>
      </div>
    </Card>
  )
}
