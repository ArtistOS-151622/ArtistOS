import { ArtistCalendar } from "@/components/common/calendar/artist-calendar"
import { PageHeader } from "@/components/common/dashboard/dashboard-header-context"

export default function CalendarPage() {
  return (
    <>
      <PageHeader
        title="Calendar"
        description="View artist orders, booking times, and daily studio work in one large calendar."
      />
      <ArtistCalendar />
    </>
  )
}
