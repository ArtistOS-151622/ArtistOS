import { PageHeader } from "@/components/common/dashboard/dashboard-header-context"
import { ServiceManager } from "@/components/common/services/service-manager"

export default function ServicesPage() {
  return (
    <>
      <PageHeader
        title="Services"
        description="Create your service menu with duration and pricing for mehendi, nails, bridal, and beauty work."
      />
      <ServiceManager />
    </>
  )
}
