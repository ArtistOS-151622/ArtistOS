import { cn } from "@/lib/utils"

type FloatingMetricProps = {
  title: string
  value: string
  helper: string
  className?: string
}

/**
 * Absolute-positioned floating widget that overlays the hero dashboard mockup.
 * Shows a title, large value, and a subtle helper string.
 */
export function FloatingMetric({
  title,
  value,
  helper,
  className,
}: FloatingMetricProps) {
  return (
    <div
      className={cn(
        "absolute hidden w-48 rounded-sm bg-white p-4 shadow-xl shadow-[#8d92ab]/25 lg:block",
        className
      )}
    >
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[0.65rem] font-semibold text-[#70758f]">{title}</p>
        <span className="size-1 rounded-full bg-[#a8aecb]" />
      </div>
      <p className="text-lg font-semibold">{value}</p>
      <p className="mt-1 text-[0.65rem] text-[#58a890]">{helper}</p>
    </div>
  )
}
