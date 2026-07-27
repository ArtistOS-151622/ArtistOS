import { PageHeader } from "@/components/common/dashboard/dashboard-header-context"
import { CustomerManager } from "@/components/common/customers/customer-manager"

export default function CustomersPage() {
  return (
    <>
      <PageHeader
        title="Customers"
        description="Manage your client directory — add, edit, or remove customer details and references."
      />
      <CustomerManager />
    </>
  )
}
