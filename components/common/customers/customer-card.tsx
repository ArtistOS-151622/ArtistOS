"use client"

import { Edit3, Mail, MapPin, Phone, Trash2, Users } from "lucide-react"

import type { Customer } from "@/components/common/customers/customer-types"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

type CustomerCardProps = {
  customer: Customer
  onEdit: (customer: Customer) => void
  onDelete: (customer: Customer) => void
}

export function CustomerCard({ customer, onEdit, onDelete }: CustomerCardProps) {
  const initials = customer.customer_name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  return (
    <Card className="rounded-[1.75rem] border-slate-100 bg-white shadow-md shadow-purple-950/5 transition hover:-translate-y-0.5">
      <CardContent className="space-y-4 p-5">
        <div className="flex items-center gap-3">
          <Avatar className="size-11">
            <AvatarFallback className="bg-[#f3e8ff] text-[#7c3aed] font-semibold text-sm">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{customer.customer_name}</p>
            {customer.reference_by ? (
              <Badge variant="secondary" className="mt-1 bg-[#f3e8ff] text-[#7c3aed] text-xs">
                Ref: {customer.reference_by}
              </Badge>
            ) : null}
          </div>
        </div>

        <Separator />

        <div className="space-y-2 text-sm text-[#5f637e]">
          <p className="flex items-center gap-2 truncate">
            <Phone className="size-4 shrink-0 text-[#7c3aed]" />
            {customer.phone}
            {customer.alt_phone ? ` / ${customer.alt_phone}` : ""}
          </p>
          <p className="flex items-center gap-2 truncate">
            <Mail className="size-4 shrink-0 text-[#7c3aed]" />
            {customer.email}
          </p>
          <p className="flex items-start gap-2">
            <MapPin className="size-4 shrink-0 translate-y-0.5 text-[#7c3aed]" />
            <span className="line-clamp-2">{customer.address}</span>
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" className="h-10 flex-1 rounded-2xl" onClick={() => onEdit(customer)}>
            <Edit3 className="size-4" />
            Edit
          </Button>
          <Button variant="destructive" className="h-10 flex-1 rounded-2xl" onClick={() => onDelete(customer)}>
            <Trash2 className="size-4" />
            Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
