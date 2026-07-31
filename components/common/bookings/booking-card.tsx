"use client"

import React, { useState } from "react"
import { Calendar, Clock, MapPin, Phone, User, Edit, Trash, FileText, CheckCircle2, PhoneCall, MessageCircle } from "lucide-react"

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

  // Status badge styling
  const statusColors = {
    pending: "bg-amber-50 text-amber-600 border-amber-100",
    confirmed: "bg-blue-50 text-blue-600 border-blue-100",
    completed: "bg-emerald-50 text-emerald-600 border-emerald-100",
    canceled: "bg-rose-50 text-rose-600 border-rose-100",
  }

  const statusBorder = {
    pending: "bg-amber-400",
    confirmed: "bg-blue-500",
    completed: "bg-emerald-500",
    canceled: "bg-rose-500",
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
        "group relative overflow-hidden rounded-lg border border-slate-100 bg-white shadow-md shadow-purple-950/5 transition-all flex flex-col",
        isClickable ? "hover:shadow-xl hover:shadow-purple-950/10 cursor-pointer hover:-translate-y-0.5" : ""
      )}
    >
      {/* Left Edge Status Bar */}
      <div className={cn("absolute left-0 top-0 bottom-0 w-1.5", statusBorder[booking.status])} />
      
      {/* Main Content (Top) */}
      <CardContent className="p-4 pl-5 flex-1 space-y-3.5">
        {/* Header: Date & Status */}
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 truncate">Event Date</p>
            <h2 className="text-lg sm:text-xl font-black text-slate-800 tracking-tight leading-tight mt-0.5 truncate">
              {formatDate(booking.booking_date)}
            </h2>
            <div className="flex items-center gap-1 mt-0.5 text-xs font-semibold text-[#7c3aed]">
              <Clock className="size-3.5" />
              <span>{formatTime(booking.start_time)} - {formatTime(booking.end_time)}</span>
            </div>
          </div>
          <span className={cn("rounded-xl border px-3 py-1 text-xs font-bold uppercase tracking-wider", statusColors[booking.status])}>
            {statusLabel[booking.status]}
          </span>
        </div>

        {/* Customer & Location Info */}
        <div className="flex flex-col bg-slate-50 rounded-xl p-3 border border-slate-200/80">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm border border-slate-100 text-slate-400">
                <User className="size-5" />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-slate-700 leading-none truncate">{customer?.customer_name ?? "Unknown Customer"}</h3>
                {booking.booking_address && (
                  <div className="flex items-start gap-1.5 mt-1 text-[11px] font-medium text-slate-500">
                    <MapPin className="size-3 text-slate-400 shrink-0 mt-[1.5px]" />
                    <p className="leading-tight break-words">{booking.booking_address}</p>
                  </div>
                )}
              </div>
            </div>
            
            {/* Quick Action Icons */}
            {customer?.phone && (
              <div className="flex items-center gap-1.5 shrink-0">
                <a
                  href={`tel:${customer.phone}`}
                  className="flex size-7 items-center justify-center rounded-md bg-white text-slate-600 hover:text-white hover:bg-[#7c3aed] hover:border-[#7c3aed] shadow-sm border border-slate-200 transition-all"
                  title="Call customer"
                  onClick={(e) => e.stopPropagation()}
                >
                  <PhoneCall className="size-3.5" />
                  <span className="sr-only">Call</span>
                </a>
                <a
                  href={`https://wa.me/${customer.phone.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex size-7 items-center justify-center rounded-md bg-emerald-50 text-emerald-700 hover:bg-[#25D366] hover:text-white hover:border-[#25D366] shadow-sm border border-emerald-200 transition-all"
                  title="WhatsApp customer"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MessageCircle className="size-3.5" />
                  <span className="sr-only">WhatsApp</span>
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Services List */}
        {services.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Services</p>
            <div className="flex flex-wrap gap-1.5">
              {(showAllServices ? services : services.slice(0, 2)).map((service) => (
                <span
                  key={service.id}
                  className="inline-flex items-center rounded-lg bg-purple-50 px-2.5 py-1 text-xs font-bold text-[#7c3aed]"
                >
                  {service.service_name}
                </span>
              ))}
              {services.length > 2 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowAllServices(!showAllServices)
                  }}
                  className="inline-flex items-center rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors"
                >
                  {showAllServices ? "Show less" : `+${services.length - 2} more`}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Additional Info */}
        {booking.additional_request && (
           <div className="space-y-1.5">
             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Additional Request</p>
             <div className="flex items-start gap-1.5 text-xs font-medium text-slate-500 italic">
               <FileText className="size-4 text-slate-300 shrink-0 mt-0.5" />
               <p className="leading-relaxed line-clamp-2">{booking.additional_request}</p>
             </div>
           </div>
        )}
      </CardContent>

      {/* Ticket Perforation Dashed Line */}
      <div className="relative h-px w-full my-0">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-[calc(100%-1.5rem)] border-t border-dashed border-slate-200" />
        </div>
        {/* Left Cutout */}
        <div className="absolute left-[-6px] top-1/2 -translate-y-1/2 size-3 rounded-full bg-[#f8fafc] shadow-[inset_-1px_0_2px_rgba(0,0,0,0.02)]" />
        {/* Right Cutout */}
        <div className="absolute right-[-6px] top-1/2 -translate-y-1/2 size-3 rounded-full bg-[#f8fafc] shadow-[inset_1px_0_2px_rgba(0,0,0,0.02)]" />
      </div>

      {/* Ticket Stub (Footer) */}
      <div className="p-3 pl-5 bg-slate-50/50 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 mt-auto">
        <div className="min-w-0">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5 truncate">Total Amount</p>
          <p className="text-lg font-black text-slate-800 leading-none truncate">
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
            className="size-8 rounded-lg bg-white shadow-sm border border-slate-200 hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition"
            title="Edit booking"
          >
            <Edit className="size-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation()
              onDelete(booking)
            }}
            className="size-8 rounded-lg bg-white shadow-sm border border-slate-200 hover:bg-rose-50 text-slate-400 hover:text-rose-600 hover:border-rose-200 transition"
            title="Delete booking"
          >
            <Trash className="size-3.5" />
          </Button>
        </div>
      </div>
    </Card>
  )
}
