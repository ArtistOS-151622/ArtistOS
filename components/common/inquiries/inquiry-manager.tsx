"use client"

import { useEffect, useRef, useState } from "react"
import { Copy, Filter, Inbox, Link2, Search, TimerReset } from "lucide-react"
import { toast } from "sonner"

import { HeaderPortal } from "@/components/common/dashboard/dashboard-header-context"
import { InquiryCard } from "@/components/common/inquiries/inquiry-card"
import type { Inquiry } from "@/components/common/inquiries/inquiry-types"
import { SkeletonCard } from "@/components/common/shared/skeleton-card"
import { useGuardContext } from "@/components/common/subscription/subscription-guard-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

type InquiriesResponse = {
  inquiries?: Inquiry[]
  inquiry?: Inquiry
  hasMore?: boolean
  booking_id?: number
  error?: string
}

type FormLinkResponse = {
  code?: string
  active_until?: string | null
  is_active?: boolean
  error?: string
}

export function InquiryManager() {
  const { isReadOnly } = useGuardContext()
  const didInitialFetch = useRef(false)
  const [inquiries, setInquiries] = useState<Inquiry[]>([])
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState("all")
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [actingId, setActingId] = useState<number | null>(null)
  const [formLink, setFormLink] = useState<FormLinkResponse | null>(null)
  const [activatingLink, setActivatingLink] = useState(false)

  const inquiryLink = formLink?.code && typeof window !== "undefined"
    ? `${window.location.origin}/inquiry/f/${formLink.code}`
    : ""
  const isFormLinkActive = Boolean(formLink?.is_active)

  useEffect(() => {
    async function loadFormLink() {
      try {
        const res = await fetch("/api/inquiries/form-link")
        const data = (await res.json()) as FormLinkResponse
        if (!res.ok) {
          toast.error(data.error ?? "Unable to load inquiry link.")
          return
        }
        setFormLink(data)
      } catch {
        toast.error("Unable to load inquiry link.")
      }
    }

    void loadFormLink()
  }, [])

  async function fetchInquiries(pageNum: number, append = false) {
    if (pageNum === 1) {
      setLoading(true)
    } else {
      setLoadingMore(true)
    }

    try {
      const res = await fetch(
        `/api/inquiries?page=${pageNum}&search=${encodeURIComponent(search)}&status=${encodeURIComponent(status)}`,
      )
      const data = (await res.json()) as InquiriesResponse

      if (!res.ok) {
        toast.error(data.error ?? "Unable to load inquiries.")
        return
      }

      setInquiries((current) => append ? [...current, ...(data.inquiries ?? [])] : data.inquiries ?? [])
      setHasMore(data.hasMore ?? false)
      setPage(pageNum)
    } catch {
      toast.error("Unable to load inquiries.")
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      didInitialFetch.current = true
      void fetchInquiries(1)
    }, didInitialFetch.current ? 300 : 0)

    return () => window.clearTimeout(timer)
    // fetchInquiries intentionally reads current search/status.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, status])

  async function copyInquiryLink() {
    if (!inquiryLink) return
    if (isReadOnly) {
      toast.error("Your subscription has expired. Please upgrade to share inquiry links.")
      return
    }
    if (!isFormLinkActive) {
      toast.error("Activate the form link before sharing it.")
      return
    }

    try {
      await navigator.clipboard.writeText(inquiryLink)
      toast.success("Inquiry form link copied")
    } catch {
      toast.error("Unable to copy link.")
    }
  }

  async function activateFormLink() {
    if (isReadOnly) {
      toast.error("Your subscription has expired. Please upgrade to activate inquiry links.")
      return
    }

    setActivatingLink(true)
    try {
      const res = await fetch("/api/inquiries/form-link", { method: "POST" })
      const data = (await res.json()) as FormLinkResponse
      if (!res.ok) {
        toast.error(data.error ?? "Unable to activate inquiry link.")
        return
      }

      setFormLink(data)
      toast.success("Inquiry form link activated for 10 hours")
    } catch {
      toast.error("Unable to activate inquiry link.")
    } finally {
      setActivatingLink(false)
    }
  }

  function formatExpiry(value?: string | null) {
    if (!value) return "Not active"
    return new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(value))
  }

  async function convertInquiry(inquiry: Inquiry) {
    if (isReadOnly) {
      toast.error("Your subscription has expired. Please upgrade to confirm inquiries.")
      return
    }

    setActingId(inquiry.id)
    try {
      const res = await fetch(`/api/inquiries/${inquiry.id}/convert`, { method: "POST" })
      const data = (await res.json()) as InquiriesResponse

      if (!res.ok || !data.inquiry) {
        toast.error(data.error ?? "Unable to convert inquiry.")
        return
      }

      setInquiries((current) => current.map((item) => item.id === inquiry.id ? data.inquiry! : item))
      toast.success("Booking created from inquiry")
    } catch {
      toast.error("Unable to convert inquiry.")
    } finally {
      setActingId(null)
    }
  }

  async function cancelInquiry(inquiry: Inquiry) {
    if (isReadOnly) {
      toast.error("Your subscription has expired. Please upgrade to update inquiries.")
      return
    }

    setActingId(inquiry.id)
    try {
      const res = await fetch(`/api/inquiries/${inquiry.id}/cancel`, { method: "POST" })
      const data = (await res.json()) as InquiriesResponse

      if (!res.ok || !data.inquiry) {
        toast.error(data.error ?? "Unable to cancel inquiry.")
        return
      }

      setInquiries((current) => current.map((item) => item.id === inquiry.id ? data.inquiry! : item))
      toast.success("Inquiry cancelled")
    } catch {
      toast.error("Unable to cancel inquiry.")
    } finally {
      setActingId(null)
    }
  }

  return (
    <div className="w-full max-w-full min-w-0 space-y-4 overflow-hidden sm:space-y-5">
      <HeaderPortal
        search={
          <div className="relative w-full md:w-64 lg:w-72">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#858aa5]" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search inquiries..."
              className="h-11 w-full rounded-2xl border-white/80 bg-white/90 pl-10 text-sm shadow-md shadow-purple-950/5 backdrop-blur placeholder:text-slate-400"
            />
          </div>
        }
        actions={
          <div className="flex shrink-0 items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger
                className={cn(
                  "inline-flex h-11 w-11 items-center justify-center gap-2 rounded-2xl border border-white/80 bg-white/90 px-0 text-xs font-semibold shadow-md shadow-purple-950/5 outline-none transition hover:bg-slate-50 md:w-auto md:px-3",
                  status !== "all" && "border-purple-200 bg-purple-50 text-[#7c3aed]",
                )}
                aria-label="Filter inquiries"
              >
                <Filter className="size-4 text-[#7c3aed]" />
                <span className="hidden capitalize md:inline">
                  {status === "all" ? "Filter" : status}
                </span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 rounded-2xl p-1.5">
                <DropdownMenuLabel className="px-2 py-1 text-xs font-semibold text-slate-500">
                  Filter Status
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup value={status} onValueChange={setStatus}>
                  <DropdownMenuRadioItem value="all" className="cursor-pointer rounded-xl">
                    All inquiries
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="new" className="cursor-pointer rounded-xl">
                    New
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="booked" className="cursor-pointer rounded-xl">
                    Booking created
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="cancelled" className="cursor-pointer rounded-xl">
                    Not created
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              type="button"
              className="h-11 rounded-2xl bg-[#7c3aed] px-3 text-white shadow-md shadow-purple-950/10 hover:bg-[#6d28d9]"
              disabled={!inquiryLink || !isFormLinkActive || isReadOnly}
              onClick={copyInquiryLink}
            >
              <Copy className="size-4" />
              <span className="hidden md:inline">Copy form link</span>
            </Button>
          </div>
        }
      />

      {inquiryLink ? (
        <Card className="rounded-xl border border-white/80 bg-white/80 shadow-md shadow-purple-950/5 backdrop-blur">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-xl",
                isFormLinkActive ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600",
              )}>
                <Link2 className="size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-900">
                  {isFormLinkActive ? "Inquiry link active" : "Inquiry link inactive"}
                </p>
                <p className="truncate text-xs font-medium text-slate-500">{inquiryLink}</p>
                <p className="mt-1 text-xs font-semibold text-slate-400">
                  {isFormLinkActive ? `Expires ${formatExpiry(formLink?.active_until)}` : "Activate it before sharing. It will work for 10 hours."}
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              {!isFormLinkActive ? (
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 rounded-xl border-slate-200 bg-white hover:bg-slate-50"
                  onClick={activateFormLink}
                  disabled={activatingLink || isReadOnly}
                >
                  <TimerReset className="size-4" />
                  {activatingLink ? "Activating..." : "Activate 10h"}
                </Button>
              ) : null}
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-xl border-slate-200 bg-white hover:bg-slate-50"
                onClick={copyInquiryLink}
                disabled={!isFormLinkActive || isReadOnly}
              >
                <Copy className="size-4" />
                Copy
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {loading ? (
        <div className="grid min-w-0 grid-cols-1 gap-4 sm:gap-5 min-[900px]:grid-cols-3 2xl:grid-cols-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <SkeletonCard key={index} />
          ))}
        </div>
      ) : inquiries.length ? (
        <>
          <div className="grid min-w-0 grid-cols-1 gap-4 sm:gap-5 min-[900px]:grid-cols-3 2xl:grid-cols-4">
            {inquiries.map((inquiry) => (
              <InquiryCard
                key={inquiry.id}
                inquiry={inquiry}
                loading={actingId === inquiry.id}
                readOnly={isReadOnly}
                onConvert={convertInquiry}
                onCancel={cancelInquiry}
              />
            ))}
          </div>

          {hasMore ? (
            <div className="flex justify-center pt-4">
              <Button
                variant="outline"
                className="h-11 rounded-2xl border border-slate-100 bg-white px-6 shadow-sm hover:bg-slate-50"
                onClick={() => void fetchInquiries(page + 1, true)}
                disabled={loadingMore}
              >
                {loadingMore ? "Loading..." : "Load more"}
              </Button>
            </div>
          ) : null}
        </>
      ) : (
        <Card className="rounded-[1.5rem] border-dashed border-slate-200 bg-white/80 shadow-md shadow-purple-950/5 backdrop-blur">
          <CardContent className="flex flex-col items-center justify-center px-5 py-10 text-center sm:p-12">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-[#ede9fe] text-[#7c3aed]">
              <Inbox className="size-5" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">No inquiries yet</h3>
            <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
              Activate your secure form link for 10 hours, then share it to collect booking details while you are busy.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
