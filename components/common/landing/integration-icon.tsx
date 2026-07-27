import { cn } from "@/lib/utils"

type IntegrationIconProps = {
  icon: React.ReactNode
  label: string
  className?: string
}

/**
 * Absolute-positioned floating pill showing an integration icon + label.
 * Used in the SyncSection orbital ring visual.
 */
export function IntegrationIcon({ icon, label, className }: IntegrationIconProps) {
  return (
    <div
      className={cn(
        "absolute z-10 flex items-center gap-2 rounded-2xl bg-white px-3 py-2 text-[#7c3aed] shadow-xl shadow-[#9ba0b8]/20",
        className
      )}
    >
      {icon}
      <span className="hidden text-xs font-semibold text-[#515672] sm:inline">
        {label}
      </span>
    </div>
  )
}
