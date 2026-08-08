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
  { icon: Flower2, iconBg: "bg-blue-50/80 text-blue-600 border-blue-100", watermarkColor: "text-blue-500/[0.05]" },
  { icon: Sparkles, iconBg: "bg-pink-50/80 text-pink-600 border-pink-100", watermarkColor: "text-pink-500/[0.05]" },
  { icon: Palette, iconBg: "bg-purple-50/80 text-purple-600 border-purple-100", watermarkColor: "text-purple-500/[0.05]" },
  { icon: Brush, iconBg: "bg-orange-50/80 text-orange-600 border-orange-100", watermarkColor: "text-orange-500/[0.05]" },
  { icon: Gem, iconBg: "bg-emerald-50/80 text-emerald-600 border-emerald-100", watermarkColor: "text-emerald-500/[0.05]" },
  { icon: Crown, iconBg: "bg-rose-50/80 text-rose-600 border-rose-100", watermarkColor: "text-rose-500/[0.05]" },
  { icon: Wand2, iconBg: "bg-amber-50/80 text-amber-600 border-amber-100", watermarkColor: "text-amber-500/[0.05]" },
]

export function ServiceCard({ service, onEdit, onDelete }: ServiceCardProps) {
  // Use service ID for deterministic style selection so it doesn't change on render
  const styleConfig = STYLE_CONFIGS[service.id % STYLE_CONFIGS.length]
  const Icon = styleConfig.icon

  return (
    <Card className="group relative overflow-hidden min-w-0 w-full rounded-xl border border-slate-100/80 bg-white shadow-md shadow-purple-950/5 transition duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-purple-950/10">
      {/* Background Watermark Icon */}
      {/* <Icon className={`absolute -right-6 -bottom-6 z-0 size-48 ${styleConfig.watermarkColor} pointer-events-none transition-transform duration-500 group-hover:scale-110`} /> */}

      <CardContent className="relative z-10 p-3 min-w-0 w-full space-y-3">
        {/* Top Section: Icon, Service Name, Duration & Actions */}
        <div className="flex items-start justify-between gap-3 min-w-0 w-full">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className={`flex size-11 shrink-0 items-center justify-center rounded-xl border ${styleConfig.iconBg} shadow-xs transition-transform duration-300 group-hover:scale-105`}>
              <Icon className="size-5" />
            </div>
            <div className="min-w-0 flex-1 space-y-0.5 overflow-hidden">
              <h3 className="block min-w-0 w-full truncate text-base sm:text-lg font-bold text-slate-900 tracking-tight" title={service.service_name}>
                {service.service_name}
              </h3>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                <Clock className="size-3.5 text-slate-400 shrink-0" />
                <span>{formatDuration(service.duration_minutes)}</span>
              </div>
            </div>
          </div>

          {/* Edit & Delete Action Buttons */}
          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              variant="outline"
              size="icon"
              className="size-8 rounded-md border-purple-200 bg-purple-50/40 text-[#7c3aed] hover:bg-purple-100/70 hover:border-purple-300 hover:text-[#6d28d9] shadow-2xs transition-colors"
              onClick={() => onEdit(service)}
            >
              <Edit3 className="size-4" />
              <span className="sr-only">Edit service</span>
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="size-8 rounded-md border-rose-200 bg-rose-50/40 text-rose-600 hover:bg-rose-100/70 hover:border-rose-300 hover:text-rose-700 shadow-2xs transition-colors"
              onClick={() => onDelete(service)}
            >
              <Trash2 className="size-4" />
              <span className="sr-only">Delete service</span>
            </Button>
          </div>
        </div>

        {/* Bottom Section: Service Rate Label & Price Badge */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100/80 min-w-0 w-full">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Service Rate
          </span>
          <span className="text-[#7c3aed] font-extrabold text-base sm:text-lg tracking-tight">
            {formatPrice(service.price)}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

