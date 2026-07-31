"use client";

import {
  Edit3,
  MapPin,
  MessageCircle,
  Phone,
  PhoneCall,
  Trash2,
  Users,
} from "lucide-react";

import type { Customer } from "@/components/common/customers/customer-types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type CustomerCardProps = {
  customer: Customer;
  onEdit: (customer: Customer) => void;
  onDelete: (customer: Customer) => void;
};



export function CustomerCard({
  customer,
  onEdit,
  onDelete,
}: CustomerCardProps) {
  const initials =
    customer.customer_name
      .split(" ")
      .map((p) => p[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "CU";

  const cleanPhone = customer.phone.replace(/[^0-9]/g, "");

  return (
    <Card className="group relative overflow-hidden min-w-0 w-full rounded-xl border-slate-100 bg-white shadow-md shadow-purple-950/5 transition duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-purple-950/10">
      {/* Background Watermark Icon */}
      <Users className="absolute -left-6 -top-6 z-0 size-64 text-[#7c3aed]/[0.07]" />
      
      <CardContent className="relative z-10 p-4 min-w-0 w-full">
        {/* Header: Avatar + Customer Name + Action Buttons */}
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 w-full">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-purple-100 text-[#7c3aed] border-[#7c3aed] font-bold text-sm sm:text-lg tracking-wider shadow-sm border">
              {initials}
            </div>
            <h3 className="truncate text-base sm:text-lg font-bold text-slate-900">
              {customer.customer_name}
            </h3>
          </div>

          {/* Action Buttons */}
          <div className="flex shrink-0 items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="size-8 rounded-md"
              onClick={() => onEdit(customer)}
            >
              <Edit3 className="size-4" />
              <span className="sr-only">Edit</span>
            </Button>
            <Button
              variant="destructive"
              size="icon"
              className="size-8 rounded-md"
              onClick={() => onDelete(customer)}
            >
              <Trash2 className="size-4" />
              <span className="sr-only">Delete</span>
            </Button>
          </div>
        </div>

        {/* Contact Information Body */}
        <div className="mt-3 space-y-2.5 rounded-xl bg-slate-50 p-3 text-xs sm:text-sm text-slate-700 font-medium border border-slate-200/80 min-w-0 w-full">
          {/* Phone Row + Quick Actions */}
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 w-full">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-white text-[#7c3aed] shadow-sm border border-purple-200/50">
                <Phone className="size-3.5" />
              </div>
              <span className="truncate text-slate-900 font-bold">
                {customer.phone}
              </span>
            </div>

            {/* Quick Call & WhatsApp Action Buttons */}
            <div className="flex items-center gap-2 shrink-0">
              <a
                href={`tel:${customer.phone}`}
                className="flex size-7 items-center justify-center rounded-md bg-white text-slate-600 hover:text-white hover:bg-[#7c3aed] hover:border-[#7c3aed] shadow-sm border border-slate-200 transition-all"
                title="Call customer"
              >
                <PhoneCall className="size-3.5" />
                <span className="sr-only">Call</span>
              </a>

              <a
                href={`https://wa.me/${cleanPhone}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex size-7 items-center justify-center rounded-md bg-emerald-50 text-emerald-700 hover:bg-[#25D366] hover:text-white hover:border-[#25D366] shadow-sm border border-emerald-200 transition-all"
                title="WhatsApp customer"
              >
                <MessageCircle className="size-3.5" />
                <span className="sr-only">WhatsApp</span>
              </a>
            </div>
          </div>

          {/* Address Row */}
          {customer.address && (
            <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 pt-2 border-t border-slate-200 mt-2">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-white text-[#7c3aed] shadow-sm border border-purple-200/50">
                <MapPin className="size-3.5" />
              </div>
              <span className="line-clamp-1 text-slate-700 leading-relaxed font-medium break-words">
                {customer.address}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
