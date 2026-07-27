import { cn } from "@/lib/utils"

type StatBadgeProps = {
  children: React.ReactNode
  className?: string
}

/**
 * A small green pill badge used to display stat deltas like "+12.4%".
 * Appears in DashboardCard and the hero dashboard mockup.
 */
export function StatBadge({ children, className }: StatBadgeProps) {
  return (
    <span
      className={cn(
        "rounded-full bg-[#eafaf4] px-2 py-1 text-[0.65rem] font-semibold text-[#23a982]",
        className
      )}
    >
      {children}
    </span>
  )
}
