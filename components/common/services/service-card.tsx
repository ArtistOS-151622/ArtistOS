"use client"

import { Clock, Edit3, Trash2, Flower2, Sparkles, Palette, Brush, Gem, Crown, Wand2 } from "lucide-react"

import {
  formatDuration,
  formatPrice,
  type ArtistService,
} from "@/components/common/services/service-types"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

type ServiceCardProps = {
  service: ArtistService
  onEdit: (service: ArtistService) => void
  onDelete: (service: ArtistService) => void
}

const STYLE_CONFIGS = [
  { icon: Flower2, bgColor: "bg-blue-50", iconColor: "text-blue-500" },
  { icon: Sparkles, bgColor: "bg-pink-50", iconColor: "text-pink-500" },
  { icon: Palette, bgColor: "bg-purple-50", iconColor: "text-purple-500" },
  { icon: Brush, bgColor: "bg-orange-50", iconColor: "text-orange-500" },
  { icon: Gem, bgColor: "bg-emerald-50", iconColor: "text-emerald-500" },
  { icon: Crown, bgColor: "bg-rose-50", iconColor: "text-rose-500" },
  { icon: Wand2, bgColor: "bg-amber-50", iconColor: "text-amber-500" },
]

export function ServiceCard({ service, onEdit, onDelete }: ServiceCardProps) {
  // Use service ID for a deterministic selection so it doesn't change on every render
  const styleConfig = STYLE_CONFIGS[service.id % STYLE_CONFIGS.length]
  const Icon = styleConfig.icon

  return (
    <Card className="relative overflow-hidden min-w-0 w-full rounded-xl border-slate-100 bg-white shadow-md shadow-purple-950/5 transition hover:-translate-y-0.5">
      <CardContent className="p-4 min-w-0 w-full">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 w-full">
          <div className="flex items-start gap-3 min-w-0">
            <div
              className={`flex size-12 shrink-0 items-center justify-center rounded-lg ${styleConfig.bgColor}`}
            >
              <Icon className={`size-6 ${styleConfig.iconColor}`} />
            </div>
            <div className="min-w-0 flex-1 pr-3">
              <h3 className="truncate text-lg sm:text-xl font-semibold tracking-tight">{service.service_name}</h3>
              <div className="flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground font-semibold">
                <Clock className="size-3.5 sm:size-4" />
                {formatDuration(service.duration_minutes)}
              </div>
            </div>
          </div>
          
          <div className="flex shrink-0 flex-col items-end gap-1">
            <div className="absolute right-0 top-0 flex items-center gap-2 rounded-bl-[1.5rem] bg-purple-50/80 py-1 pl-5 pr-4 font-bold tracking-wide text-[#7c3aed] border-b border-l border-purple-100">
              <span>{formatPrice(service.price)}</span>
            </div>
            <div className="mt-5 flex gap-2">
              <Button
                variant="outline"
                size="icon"
                className="size-6 rounded-md"
                onClick={() => onEdit(service)}
              >
                <Edit3 className="size-3" />
                <span className="sr-only">Edit</span>
              </Button>
              <Button
                variant="destructive"
                size="icon"
                className="size-6 rounded-md"
                onClick={() => onDelete(service)}
              >
                <Trash2 className="size-3" />
                <span className="sr-only">Delete</span>
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
