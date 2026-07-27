"use client"

import { Clock, Edit3, Trash2 } from "lucide-react"

import {
  formatDuration,
  formatPrice,
  type ArtistService,
} from "@/components/common/services/service-types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

type ServiceCardProps = {
  service: ArtistService
  onEdit: (service: ArtistService) => void
  onDelete: (service: ArtistService) => void
}

export function ServiceCard({ service, onEdit, onDelete }: ServiceCardProps) {
  return (
    <Card className="rounded-[1.75rem] border-slate-100 bg-white shadow-md shadow-purple-950/5 transition hover:-translate-y-0.5">
      <CardContent className="space-y-5 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <Badge variant="secondary" className="bg-[#f3e8ff] text-[#7c3aed]">
              Beauty service
            </Badge>
            <h3 className="mt-3 text-xl font-semibold tracking-tight">{service.service_name}</h3>
          </div>
          <p className="text-2xl font-semibold text-[#7c3aed]">{formatPrice(service.price)}</p>
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="size-4 text-[#7c3aed]" />
          {formatDuration(service.duration_minutes)}
        </div>

        <div className="flex gap-2">
          <Button variant="outline" className="h-10 flex-1 rounded-2xl" onClick={() => onEdit(service)}>
            <Edit3 className="size-4" />
            Edit
          </Button>
          <Button
            variant="destructive"
            className="h-10 flex-1 rounded-2xl"
            onClick={() => onDelete(service)}
          >
            <Trash2 className="size-4" />
            Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
