import { cn } from "@/lib/utils"

type FloatingClientChipProps = {
  name: string
  role: string
  initials: string
  gradient: string
  className?: string
  style?: React.CSSProperties
}

/**
 * Small pill-shaped avatar card that floats over the hero showcase image,
 * mimicking a live customer/booking recommendation chip.
 */
export function FloatingClientChip({
  name,
  role,
  initials,
  gradient,
  className,
  style,
}: FloatingClientChipProps) {
  return (
    <div
      style={style}
      className={cn(
        "animate-float-small absolute flex items-center gap-2 rounded-full border border-black/5 bg-white py-[5px] pl-[6px] pr-3.5 shadow-[0_5px_20px_rgba(0,0,0,0.08)] transition-transform duration-300 hover:-translate-y-1",
        className
      )}
    >
      <span
        className="flex size-8 shrink-0 items-center justify-center rounded-full text-[0.6rem] font-semibold text-white sm:size-9"
        style={{ background: gradient }}
      >
        {initials}
      </span>
      <div className="min-w-0 leading-tight">
        <p className="truncate text-xs font-medium text-[#161616]">{name}</p>
        <p className="truncate text-[0.6rem] text-[#9a9a9a]">{role}</p>
      </div>
    </div>
  )
}
