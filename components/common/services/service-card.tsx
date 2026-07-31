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
  { icon: Flower2, bgColor: "bg-blue-100", iconColor: "text-blue-600" },
  { icon: Sparkles, bgColor: "bg-pink-100", iconColor: "text-pink-600" },
  { icon: Palette, bgColor: "bg-purple-100", iconColor: "text-purple-600" },
  { icon: Brush, bgColor: "bg-orange-100", iconColor: "text-orange-600" },
  { icon: Gem, bgColor: "bg-emerald-100", iconColor: "text-emerald-600" },
  { icon: Crown, bgColor: "bg-rose-100", iconColor: "text-rose-600" },
  { icon: Wand2, bgColor: "bg-amber-100", iconColor: "text-amber-600" },
]

export function ServiceCard({ service, onEdit, onDelete }: ServiceCardProps) {
  // Use service ID for a deterministic selection so it doesn't change on every render
  const styleConfig = STYLE_CONFIGS[service.id % STYLE_CONFIGS.length]
  const Icon = styleConfig.icon

  return (
    <Card className="relative overflow-hidden rounded-xl border-slate-100 bg-white shadow-md shadow-purple-950/5 transition hover:-translate-y-0.5">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-1 items-start gap-3 min-w-0">
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
            <div className="absolute right-0 top-0 flex items-center gap-2 rounded-bl-[1.5rem] bg-gradient-to-br from-[#8b5cf6] to-[#6d28d9] py-1 pl-5 pr-4 font-bold tracking-wide text-white shadow-sm">
              {/* <div className="h-1.5 w-1.5 rounded-full bg-white/90 shadow-[inset_0_1px_2px_rgba(0,0,0,0.2)]" /> */}
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
