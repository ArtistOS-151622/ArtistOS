import { Suspense } from "react"
import { PageHeader } from "@/components/common/dashboard/dashboard-header-context"
import { BookingManager } from "@/components/common/bookings/booking-manager"
import { AppLoader } from "@/components/common/shared/app-loader"

export default function BookingsPage() {
  return (
    <>
      <PageHeader
        title="Bookings"
        description="Manage your schedule, appointment list, service assignments, and booking status in one place."
      />
      <Suspense fallback={<AppLoader label="Loading bookings" className="min-h-[52vh] rounded-[2rem] bg-white/45" />}>
        <BookingManager />
      </Suspense>
    </>
  )
}
