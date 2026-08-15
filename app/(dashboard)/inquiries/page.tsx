import { Suspense } from "react"

import { PageHeader } from "@/components/common/dashboard/dashboard-header-context"
import { InquiryManager } from "@/components/common/inquiries/inquiry-manager"
import { AppLoader } from "@/components/common/shared/app-loader"

export default function InquiriesPage() {
  return (
    <>
      <PageHeader
        title="Inquiries"
        description="Review customer form submissions, cancel weak leads, or convert ready inquiries into bookings."
      />
      <Suspense fallback={<AppLoader label="Loading inquiries" className="min-h-[52vh] rounded-[2rem] bg-white/45" />}>
        <InquiryManager />
      </Suspense>
    </>
  )
}
