"use client"

import { useState } from "react"
import { Edit, FileText, MessageCircle, PhoneCall, Trash } from "lucide-react"

import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

import type { Booking } from "@/components/common/bookings/booking-types"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

type BookingCardProps = {
  booking: Booking
  onEdit: (booking: Booking) => void
  onDelete: (booking: Booking) => void
}

export function BookingCard({ booking, onEdit, onDelete }: BookingCardProps) {
  const router = useRouter()
  const [showAllServices, setShowAllServices] = useState(false)
  const customer = booking.customer
  const services = booking.services ?? []

  // Calculate total price of services, additional charges, and discounts
  const servicesTotal = services.reduce((sum, s) => sum + (Number(s.price) * (s.quantity || 1)), 0)
  const additionalChargesTotal = booking.additional_charges?.reduce((sum, c) => sum + (Number(c.rate) * Number(c.quantity)), 0) || 0
  const discount = booking.discount || 0
  const totalPrice = servicesTotal + additionalChargesTotal - discount

  // Status badge styling matching the provided image
  const statusColors = {
    pending: "bg-amber-100 text-amber-700",
    confirmed: "bg-[#dbeafe] text-[#2563eb]", // Exact match for the image
    completed: "bg-emerald-100 text-emerald-700",
    canceled: "bg-rose-100 text-rose-700",
  }

  const statusLabel = {
    pending: "Pending",
    confirmed: "Confirmed",
    completed: "Completed",
    canceled: "Canceled",
  }

  // Format time: e.g. "09:00 AM" or keep raw time format
  const formatTime = (timeStr: string) => {
    // timeStr is e.g. "09:00:00" or "09:00"
    const parts = timeStr.split(":")
    if (parts.length >= 2) {
      const hour = parseInt(parts[0], 10)
      const minute = parts[1]
      const ampm = hour >= 12 ? "PM" : "AM"
      const displayHour = hour % 12 || 12
      return `${displayHour}:${minute} ${ampm}`
    }
    return timeStr
  }

  const isClickable = booking.status === "confirmed" || booking.status === "completed"
  const initials =
    customer?.customer_name
      ?.split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "A"

  return (
    <Card
      onClick={() => isClickable && router.push(`/bookings/${booking.id}`)}
      className={cn(
        "group relative flex h-full max-w-full min-w-0 flex-col overflow-hidden rounded-[1.5rem] border border-white/80 bg-white/90 shadow-lg shadow-purple-950/5 transition-all backdrop-blur",
        "border-l-[4px] border-l-[#7c3aed]", // Solid purple left border from image
        isClickable ? "hover:shadow-xl hover:shadow-purple-950/10 cursor-pointer hover:-translate-y-0.5" : ""
      )}
    >
      <CardContent className="min-w-0 flex-1 space-y-4 overflow-hidden p-4 sm:space-y-5 sm:p-5">
        {/* Top Row: Time and Status */}
        <div className="flex min-w-0 items-start justify-between gap-3 overflow-hidden">
          <h2 className="min-w-0 flex-1 truncate text-[15px] font-bold tracking-tight text-slate-700 sm:text-base">
            {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
          </h2>
          <span className={cn("shrink-0 rounded-full px-3 py-1 text-[11px] font-bold", statusColors[booking.status])}>
            {statusLabel[booking.status]}
          </span>
        </div>

        {/* Middle Row: Customer Info & Actions */}
        <div className="flex min-w-0 items-center justify-between gap-3 overflow-hidden">
          <div className="flex min-w-0 flex-1 items-center gap-3 overflow-hidden">
            {/* Avatar Placeholder */}
            <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#f5f3ff] to-[#e0f2fe] text-sm font-black text-[#6d28d9] sm:size-12">
              {initials}
            </div>
            <div className="min-w-0 flex-1 overflow-hidden">
              <h3 className="block max-w-full truncate text-[15px] font-bold leading-none text-slate-800 sm:text-[17px]">
                {customer?.customer_name ?? "Unknown Customer"}
              </h3>
              <p className="mt-1.5 block max-w-full truncate text-xs font-medium text-slate-400 sm:text-sm">
                {booking.booking_address || "No address provided"}
              </p>
            </div>
          </div>

          {/* Contact Action Buttons */}
          {customer?.phone && (
            <div className="flex shrink-0 items-center gap-2">
              <a
                href={`tel:${customer.phone}`}
                className="flex size-9 items-center justify-center rounded-2xl bg-slate-50 text-slate-500 transition-all hover:bg-slate-100 hover:text-slate-700 sm:size-10"
                title="Call customer"
                onClick={(e) => e.stopPropagation()}
              >
                <PhoneCall className="size-4" />
                <span className="sr-only">Call</span>
              </a>
              <a
                href={`https://wa.me/${customer.phone.replace(/\D/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex size-9 items-center justify-center rounded-2xl bg-[#ecfdf5] text-[#10b981] transition-all hover:bg-[#d1fae5] sm:size-10"
                title="WhatsApp customer"
                onClick={(e) => e.stopPropagation()}
              >
                <MessageCircle className="size-4" />
                <span className="sr-only">WhatsApp</span>
              </a>
            </div>
          )}
        </div>

        {/* Third Row: Services */}
        {services.length > 0 && (
          <div className="flex min-w-0 flex-wrap gap-2 overflow-hidden pt-1">
            {(showAllServices ? services : services.slice(0, 2)).map((service) => (
              <span
                key={service.id}
                className="inline-flex min-w-0 max-w-full items-center rounded-full bg-[#f5f3ff] px-3 py-1.5 text-[11px] font-bold text-[#7c3aed]"
              >
                <span className="truncate">{service.service_name}</span>
              </span>
            ))}
            {services.length > 2 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setShowAllServices(!showAllServices)
                }}
                className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1.5 text-[11px] font-bold text-slate-600 transition-colors hover:bg-slate-200"
              >
                {showAllServices ? "Show less" : `+${services.length - 2} more`}
              </button>
            )}
          </div>
        )}

        {/* Additional Request (if any) */}
        {booking.additional_request && (
          <div className="flex min-w-0 items-start gap-1.5 overflow-hidden pt-1 text-xs font-medium italic text-slate-500">
            <FileText className="mt-0.5 size-3.5 shrink-0 text-slate-300" />
            <p className="line-clamp-2 min-w-0 leading-relaxed">{booking.additional_request}</p>
          </div>
        )}
      </CardContent>

      {/* Divider */}
      <div className="px-4 sm:px-5">
        <div className="w-full border-t border-dashed border-slate-200" />
      </div>

      {/* Footer Row: Total Amount & Actions */}
      <div className="flex items-center justify-between gap-3 px-4 py-4 sm:px-5">
        <div className="min-w-0">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Total Amount</p>
          <p className="truncate text-xl font-black leading-none text-slate-800 sm:text-2xl">
            ₹{totalPrice.toLocaleString()}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            size="icon"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation()
              onEdit(booking)
            }}
            className="size-9 rounded-2xl border border-slate-100 bg-slate-50 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 sm:size-10"
            title="Edit booking"
          >
            <Edit className="size-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation()
              onDelete(booking)
            }}
            className="size-9 rounded-2xl border border-slate-100 bg-slate-50 text-slate-400 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 sm:size-10"
            title="Delete booking"
          >
            <Trash className="size-4" />
          </Button>
        </div>
      </div>
    </Card>
  )
}
