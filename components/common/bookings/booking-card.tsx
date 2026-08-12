"use client"

import { useState } from "react"
import { ChevronDown, ChevronRight, Edit, FileText, MapPin, MessageCircle, PhoneCall, Trash } from "lucide-react"
import { useRouter } from "next/navigation"

import { cn } from "@/lib/utils"
import type { Booking } from "@/components/common/bookings/booking-types"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

type BookingCardProps = {
  booking: Booking
  onEdit: (booking: Booking) => void
  onDelete: (booking: Booking) => void
}

const statusConfig: Record<
  Booking["status"],
  {
    label: string
    dotColor: string
    dotPulse: string
    badgeStyle: string
    borderAccent: string
    textColor: string
  }
> = {
  pending: {
    label: "Pending",
    dotColor: "bg-amber-500",
    dotPulse: "bg-amber-400",
    badgeStyle: "bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/50",
    borderAccent: "border-l-amber-500",
    textColor: "text-amber-600 dark:text-amber-400",
  },
  confirmed: {
    label: "Confirmed",
    dotColor: "bg-blue-600",
    dotPulse: "bg-blue-400",
    badgeStyle: "bg-blue-50 text-blue-700 border-blue-200/80 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/50",
    borderAccent: "border-l-blue-600",
    textColor: "text-blue-600 dark:text-blue-400",
  },
  completed: {
    label: "Completed",
    dotColor: "bg-emerald-600",
    dotPulse: "bg-emerald-400",
    badgeStyle: "bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/50",
    borderAccent: "border-l-emerald-600",
    textColor: "text-emerald-600 dark:text-emerald-400",
  },
  cancelled: {
    label: "Cancelled",
    dotColor: "bg-rose-500",
    dotPulse: "bg-rose-400",
    badgeStyle: "bg-rose-50 text-rose-700 border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/50",
    borderAccent: "border-l-rose-500",
    textColor: "text-rose-600 dark:text-rose-400",
  },
}

export function BookingCard({ booking, onEdit, onDelete }: BookingCardProps) {
  const router = useRouter()
  const [showAllServices, setShowAllServices] = useState(false)
  const customer = booking.customer
  const services = booking.services ?? []

  // Calculate total price
  const servicesTotal = services.reduce((sum, s) => sum + Number(s.price) * (s.quantity || 1), 0)
  const additionalChargesTotal =
    booking.additional_charges?.reduce((sum, c) => sum + Number(c.rate) * Number(c.quantity), 0) || 0
  const discount = booking.discount || 0
  const totalPrice = servicesTotal + additionalChargesTotal - discount

  // Format time (e.g. "09:00:00" -> "9:00 AM")
  const formatTime = (timeStr?: string) => {
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

  // Calculate total duration (e.g. "2h 30m")
  const calculateDuration = (startTime?: string, endTime?: string) => {
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

  const isClickable = booking.status === "confirmed" || booking.status === "completed"
  const config = statusConfig[booking.status] || statusConfig.pending
  const duration = calculateDuration(booking.start_time, booking.end_time)

  return (
    <Card
      data-booking-id={booking.id}
      onClick={() => isClickable && router.push(`/bookings/${booking.id}`)}
      className={cn(
        "group relative flex max-w-full min-w-0 flex-col overflow-hidden rounded-xl border border-white/80 bg-white/90 shadow-lg shadow-slate-950/5 transition-all backdrop-blur",
        isClickable ? "hover:shadow-xl hover:shadow-slate-950/10 cursor-pointer hover:-translate-y-0.5" : ""
      )}
    >
      {/* 80% height left status accent bar */}
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
            {/* Connector line extending from card left border */}
            <div className="-ml-4 flex shrink-0 items-center sm:-ml-5">
              <span className={cn("h-[3px] w-3.5 shrink-0 rounded-r-md sm:w-4.5", config.dotColor)} />
            </div>

            {/* Capsule Badge Node attached to connector line */}
            <div
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-bold shadow-2xs backdrop-blur-xs transition-colors",
                config.badgeStyle
              )}
            >
              <span className="relative flex size-2 shrink-0 items-center justify-center">
                <span className={cn("absolute inline-flex size-full animate-ping rounded-full opacity-75", config.dotPulse)} />
                <span className={cn("relative inline-flex size-2 rounded-full", config.dotColor)} />
              </span>
              <span>{config.label}</span>
            </div>
          </div>

          {/* Right Side: Timeline Badge (Start to End Time & Duration) */}
          <div className="inline-flex min-w-0 items-center gap-1 rounded-md border border-slate-200/90 bg-slate-50/90 px-1.5 py-1 text-xs font-semibold text-slate-700 shadow-xs backdrop-blur-xs">
            <span className="truncate font-bold tracking-tight text-slate-800 sm:text-[13px]">
              {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
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
          {/* Floating Label sitting on top border (normal text) */}
          <span className="absolute -top-2 left-3 bg-white px-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Customer Details
          </span>

          {/* Inside: Customer Name (Left) + 3 Action Icons Only (Right) */}
          <div className="flex items-center justify-between gap-3">
            <h3 className="truncate text-base font-bold text-slate-900 sm:text-lg">
              {customer?.customer_name ?? "Unknown Customer"}
            </h3>

            {/* Segmented Pill Action Dock (Maps, Call, WhatsApp) */}
            <div className="flex shrink-0 items-center gap-1 rounded-md border border-slate-200/90 bg-white p-1 shadow-2xs">
              {/* Location / Maps Icon */}
              {booking.booking_address && (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(booking.booking_address)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex size-8 items-center justify-center rounded-md bg-blue-50 text-blue-600 transition-all hover:bg-blue-600 hover:text-white hover:shadow-xs active:scale-95 sm:size-8.5"
                  title={`Google Maps: ${booking.booking_address}`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <MapPin className="size-3.5 sm:size-4" />
                  <span className="sr-only">Google Maps</span>
                </a>
              )}

              {/* Call Icon */}
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

              {/* WhatsApp Icon */}
              {customer?.phone && (
                <a
                  href={`https://wa.me/${customer.phone.replace(/\D/g, "")}`}
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
        {services.length > 0 && (
          <div className="relative rounded-md border border-slate-200/90 bg-slate-50/40 p-2.5 pt-3.5 shadow-2xs transition-all hover:border-slate-300">
            {/* Floating Label sitting on top border (Left) */}
            <span className="absolute -top-2 left-3 bg-white px-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Services ({services.length})
            </span>

            {/* Floating Toggle Button sitting on top border (Right) */}
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
                <ChevronDown className={cn("size-3 transition-transform duration-200", showAllServices && "rotate-180")} />
              </button>
            )}

            {/* Bullet List Inside */}
            <div className="flex flex-col divide-y divide-slate-100/90">
              {(showAllServices ? services : services.slice(0, 1)).map((service) => (
                <div key={service.id} className="flex items-center gap-2 py-1.5 first:pt-0 last:pb-0">
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
        )}

        {/* Additional Request (if any) */}
        {/* {booking.additional_request && (
          <div className="flex min-w-0 items-start gap-2 rounded-xl border border-slate-200/60 bg-slate-50/60 p-2.5 text-xs text-slate-600">
            <FileText className="mt-0.5 size-3.5 shrink-0 text-slate-400" />
            <p className="line-clamp-2 min-w-0 leading-relaxed font-medium italic">
              {booking.additional_request}
            </p>
          </div>
        )} */}
      </CardContent>

      {/* Divider */}
      <Separator className=" border-dashed border-slate-200/80" />

      {/* Footer Row: Total Amount Value & Action Buttons */}
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        {/* Total Amount Value in Primary Color */}
        <div className="min-w-0">
          <p className="truncate text-xl font-black text-purple-600 sm:text-2xl">
            ₹{totalPrice.toLocaleString()}
          </p>
        </div>

        {/* Action Buttons: Edit, Delete, and Details Navigation Arrow */}
        <div className="flex shrink-0 items-center gap-1.5">
          <Button
            size="icon"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation()
              onEdit(booking)
            }}
            className="size-8.5 rounded-md border border-purple-200 bg-purple-50/80 text-purple-600 transition-all hover:border-purple-300 hover:bg-purple-600 hover:text-white sm:size-9"
            title="Edit booking"
          >
            <Edit className="size-4" />
            <span className="sr-only">Edit booking</span>
          </Button>

          <Button
            size="icon"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation()
              onDelete(booking)
            }}
            className="size-8.5 rounded-md border border-rose-200 bg-rose-50/80 text-rose-600 transition-all hover:border-rose-300 hover:bg-rose-600 hover:text-white sm:size-9"
            title="Delete booking"
          >
            <Trash className="size-4" />
            <span className="sr-only">Delete booking</span>
          </Button>

          {/* Inside Arrow for Confirmed & Completed bookings */}
          {isClickable && (
            <div
              className="flex size-8.5 items-center justify-center rounded-md border border-purple-200/80 bg-purple-50 text-purple-600 transition-all group-hover:border-purple-600 group-hover:bg-purple-600 group-hover:text-white sm:size-9"
              title="View booking details"
            >
              <ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              <span className="sr-only">View booking</span>
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}
