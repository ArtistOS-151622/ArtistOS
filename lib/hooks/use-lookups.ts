import { useMemo } from "react"
import useSWR, { mutate } from "swr"

import type { Customer } from "@/components/common/customers/customer-types"
import type { ArtistService } from "@/components/common/services/service-types"
import type { QuotaInfo, StoragePlanRow } from "@/lib/portfolio/types"

/**
 * Shared, cached lookups used by forms that open often (booking form, and
 * later courses / booking detail). Each key is one cache entry shared by every
 * component that reads it, so opening a form again reuses the data instead of
 * refetching it.
 */
export const SERVICES_URL = "/api/services"
/** First page (20 most recent) of customers, used for the booking form dropdown. */
export const CUSTOMER_LIST_URL = "/api/customers"
export const STORAGE_INFO_URL = "/api/portfolio/storage-info"

/**
 * Services and customers change only through the app's own forms, which call
 * invalidateServices() / invalidateCustomerList(). So they can be reused for a
 * minute without asking the server again.
 */
const LOOKUP_DEDUPE_MS = 60_000

type ServicesResponse = { services?: ArtistService[] }
type CustomersResponse = { customers?: Customer[] }
type StorageInfoResponse = {
  status: boolean
  data?: { quota?: QuotaInfo | null; plans?: StoragePlanRow[] }
}

export function useServices() {
  const { data, mutate: mutateServices } = useSWR<ServicesResponse>(SERVICES_URL, {
    dedupingInterval: LOOKUP_DEDUPE_MS,
  })
  const services = useMemo(() => data?.services ?? [], [data])

  /** Show a just-created service everywhere without refetching the list. */
  function addService(service: ArtistService) {
    void mutateServices(
      (current) => ({
        ...current,
        services: [service, ...(current?.services ?? []).filter((s) => s.id !== service.id)],
      }),
      { revalidate: false }
    )
  }

  return { services, addService }
}

export function useCustomerList() {
  const { data, mutate: mutateCustomers } = useSWR<CustomersResponse>(CUSTOMER_LIST_URL, {
    dedupingInterval: LOOKUP_DEDUPE_MS,
  })
  const customers = useMemo(() => data?.customers ?? [], [data])

  /** Show a just-created customer everywhere without refetching the list. */
  function addCustomer(customer: Customer) {
    void mutateCustomers(
      (current) => ({
        ...current,
        customers: [customer, ...(current?.customers ?? []).filter((c) => c.id !== customer.id)],
      }),
      { revalidate: false }
    )
  }

  return { customers, addCustomer }
}

/**
 * Storage quota + plans. Kept on the normal (short) dedupe window: the quota
 * changes with every upload, and the booking form uses it to block uploads
 * that would not fit.
 */
export function useStorageInfo() {
  const { data, mutate: mutateStorage } = useSWR<StorageInfoResponse>(STORAGE_INFO_URL)
  const quota = data?.status ? (data.data?.quota ?? null) : null
  const plans = useMemo(() => (data?.status ? (data.data?.plans ?? []) : []), [data])
  return { quota, plans, refresh: mutateStorage }
}

/**
 * Mark a list stale after it changed somewhere else (Customers / Services
 * pages, quick-add). No request is sent if nothing on screen uses it; the next
 * component that does will refetch instead of reusing the cached copy.
 */
export function invalidateServices() {
  void mutate(SERVICES_URL)
}

export function invalidateCustomerList() {
  void mutate(CUSTOMER_LIST_URL)
}

export function invalidateStorageInfo() {
  void mutate(STORAGE_INFO_URL)
}
