"use client"

import React from "react"
import { Calendar, Clock, MapPin, Phone, User, Edit, Trash, FileText, CheckCircle2 } from "lucide-react"

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
  const customer = booking.customer
  const services = booking.services ?? []
  
  // Calculate total price of services, additional charges, and discounts
  const servicesTotal = services.reduce((sum, s) => sum + (Number(s.price) * (s.quantity || 1)), 0)
  const additionalChargesTotal = booking.additional_charges?.reduce((sum, c) => sum + (Number(c.rate) * Number(c.quantity)), 0) || 0
  const discount = booking.discount || 0
  const totalPrice = servicesTotal + additionalChargesTotal - discount

  // Status badge styling
  const statusColors = {
    pending: "bg-amber-50 text-amber-600 border-amber-100",
    confirmed: "bg-blue-50 text-blue-600 border-blue-100",
    completed: "bg-emerald-50 text-emerald-600 border-emerald-100",
    canceled: "bg-rose-50 text-rose-600 border-rose-100",
  }

  const statusLabel = {
    pending: "Pending",
    confirmed: "Confirmed",
    completed: "Completed",
    canceled: "Canceled",
  }

  // Format date: e.g. "Jul 15, 2026"
  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr)
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    } catch {
      return dateStr
    }
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

  return (
    <Card 
      onClick={() => isClickable && router.push(`/bookings/${booking.id}`)}
      className={cn(
        "group relative overflow-hidden rounded-[1.75rem] border border-slate-100 bg-white/80 p-5 shadow-md shadow-purple-950/5 transition-all",
        isClickable ? "hover:bg-white hover:shadow-xl hover:shadow-purple-950/10 cursor-pointer" : ""
      )}
    >
      <CardContent className="p-0 space-y-4">
        {/* Header: Customer and Status */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-purple-50 text-[#7c3aed]">
              <User className="size-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 text-base leading-tight">
                {customer?.customer_name ?? "Unknown Customer"}
              </h3>
              <div className="flex items-center gap-1 text-slate-400 text-xs mt-1">
                <Phone className="size-3" />
                <span>{customer?.phone ?? "No phone"}</span>
              </div>
            </div>
          </div>
          <span className={`rounded-xl border px-2.5 py-1 text-xs font-semibold ${statusColors[booking.status]}`}>
            {statusLabel[booking.status]}
          </span>
        </div>

        {/* Date and Time Details */}
        <div className="grid grid-cols-2 gap-3 rounded-2xl bg-slate-50/50 p-3 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <Calendar className="size-4 text-[#7c3aed]" />
            <span className="font-semibold">{formatDate(booking.booking_date)}</span>
          </div>
          <div className="flex items-center gap-2 border-l border-slate-100 pl-3">
            <Clock className="size-4 text-[#7c3aed]" />
            <span className="font-semibold">
              {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
            </span>
          </div>
        </div>

        {/* Services List */}
        {services.length > 0 ? (
          <div className="space-y-1.5">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Services</p>
            <div className="flex flex-wrap gap-1.5">
              {services.map((service) => (
                <span
                  key={service.id}
                  className="inline-flex items-center rounded-xl bg-purple-50/50 border border-purple-100 px-2 py-0.5 text-[11px] font-medium text-[#7c3aed]"
                >
                  {service.service_name}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        {/* Booking Address */}
        <div className="space-y-1">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Location</p>
          <div className="flex items-start gap-1.5 text-xs text-slate-600">
            <MapPin className="size-3.5 text-slate-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed line-clamp-2">{booking.booking_address}</p>
          </div>
        </div>

        {/* Additional Requests if present */}
        {booking.additional_request ? (
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Additional Request</p>
            <div className="flex items-start gap-1.5 text-xs text-slate-500 italic">
              <FileText className="size-3.5 text-slate-300 shrink-0 mt-0.5" />
              <p className="leading-relaxed line-clamp-2">{booking.additional_request}</p>
            </div>
          </div>
        ) : null}

        {/* Divider */}
        <div className="h-px bg-slate-100 w-full" />

        {/* Total Price and Actions */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total price</p>
            <p className="text-lg font-bold text-slate-800 mt-0.5">
              ₹{totalPrice.toLocaleString()}
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              size="icon"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation()
                onEdit(booking)
              }}
              className="size-9 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-700"
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
              className="size-9 rounded-xl hover:bg-rose-50 text-slate-400 hover:text-rose-600"
              title="Delete booking"
            >
              <Trash className="size-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
