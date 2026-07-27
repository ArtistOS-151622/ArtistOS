import { StatBadge } from "@/components/common/shared/stat-badge"

type DashboardCardProps = {
  label: string
  value: string
  helper: string
}

/**
 * A small stat card used inside the hero DashboardMockup.
 * Shows a label, large value, and a green StatBadge with a delta.
 */
export function DashboardCard({ label, value, helper }: DashboardCardProps) {
  return (
    <div className="rounded-2xl border border-[#edf0fa] bg-white p-4">
      <p className="text-[0.68rem] font-medium text-[#717694]">{label}</p>
      <div className="mt-3 flex items-end justify-between gap-3">
        <p className="text-2xl font-semibold tracking-tight">{value}</p>
        <StatBadge>{helper}</StatBadge>
      </div>
    </div>
  )
}
