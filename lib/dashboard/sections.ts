export const DASHBOARD_SECTIONS = [
  "bookings",
  "inquiries",
  "portfolio",
  "customers",
  "services",
  "courses",
  "reports",
  "calendar",
  "profile",
  "support",
  "billing",
  "notifications",
] as const

export type DashboardSection = (typeof DASHBOARD_SECTIONS)[number] | "dashboard"

/** Maps a dashboard pathname to the nav section it belongs to. */
export function getDashboardSection(pathname: string): DashboardSection {
  return DASHBOARD_SECTIONS.find((section) => pathname.includes(`/${section}`)) ?? "dashboard"
}
