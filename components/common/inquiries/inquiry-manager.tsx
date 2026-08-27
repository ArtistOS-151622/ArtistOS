"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import {
  Calendar,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  Filter,
  Inbox,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Search,
  Sparkles,
  TimerReset,
  TrendingUp,
  Users,
  X,
  XCircle,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { HeaderPortal } from "@/components/common/dashboard/dashboard-header-context"
import { InquiryCard } from "@/components/common/inquiries/inquiry-card"
import type { Inquiry } from "@/components/common/inquiries/inquiry-types"
import { formatPrice } from "@/components/common/services/service-types"
import { SkeletonCard } from "@/components/common/shared/skeleton-card"
import { useGuardContext } from "@/components/common/subscription/subscription-guard-provider"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { useIsMobile } from "@/lib/hooks/use-is-mobile"
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

const AVATAR_GRADIENTS = [
  "from-purple-500 to-indigo-600 text-white",
  "from-pink-500 to-rose-500 text-white",
  "from-blue-500 to-cyan-600 text-white",
  "from-emerald-500 to-teal-600 text-white",
  "from-amber-500 to-orange-500 text-white",
]

function getAvatarGradient(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  const index = Math.abs(hash) % AVATAR_GRADIENTS.length
  return AVATAR_GRADIENTS[index]
}

function formatDate(value: string) {
  if (!value) return "—"
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value))
}

function formatTime(value: string) {
  if (!value) return ""
  const [hourValue, minute = "00"] = value.split(":")
  const hour = Number(hourValue)
  if (!Number.isFinite(hour)) return value
  const ampm = hour >= 12 ? "PM" : "AM"
  const displayHour = hour % 12 || 12
  return `${displayHour}:${minute} ${ampm}`
}

export function InquiryManager() {
  const router = useRouter()
  const isMobile = useIsMobile()
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
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null)

  const inquiryLink =
    formLink?.code && typeof window !== "undefined"
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
        `/api/inquiries?page=${pageNum}&search=${encodeURIComponent(search)}&status=${encodeURIComponent(status)}`
      )
      const data = (await res.json()) as InquiriesResponse

      if (!res.ok) {
        toast.error(data.error ?? "Unable to load inquiries.")
        return
      }

      setInquiries((current) =>
        append ? [...current, ...(data.inquiries ?? [])] : data.inquiries ?? []
      )
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
    const timer = window.setTimeout(
      () => {
        didInitialFetch.current = true
        void fetchInquiries(1)
      },
      didInitialFetch.current ? 300 : 0
    )

    return () => window.clearTimeout(timer)
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
      toast.success("Inquiry form link copied to clipboard")
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
      const res = await fetch(`/api/inquiries/${inquiry.id}/convert`, {
        method: "POST",
      })
      const data = (await res.json()) as InquiriesResponse

      if (!res.ok || !data.inquiry) {
        toast.error(data.error ?? "Unable to convert inquiry.")
        return
      }

      setInquiries((current) =>
        current.map((item) => (item.id === inquiry.id ? data.inquiry! : item))
      )
      if (selectedInquiry?.id === inquiry.id) {
        setSelectedInquiry(data.inquiry)
      }
      toast.success("Booking created successfully from inquiry!")
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
      const res = await fetch(`/api/inquiries/${inquiry.id}/cancel`, {
        method: "POST",
      })
      const data = (await res.json()) as InquiriesResponse

      if (!res.ok || !data.inquiry) {
        toast.error(data.error ?? "Unable to cancel inquiry.")
        return
      }

      setInquiries((current) =>
        current.map((item) => (item.id === inquiry.id ? data.inquiry! : item))
      )
      if (selectedInquiry?.id === inquiry.id) {
        setSelectedInquiry(data.inquiry)
      }
      toast.success("Inquiry marked as cancelled")
    } catch {
      toast.error("Unable to cancel inquiry.")
    } finally {
      setActingId(null)
    }
  }

  // Quick stats calculation
  const stats = useMemo(() => {
    const total = inquiries.length
    const newCount = inquiries.filter((i) => i.status === "new").length
    const bookedCount = inquiries.filter((i) => i.status === "booked").length
    const conversionRate = total > 0 ? Math.round((bookedCount / total) * 100) : 0
    return { total, newCount, bookedCount, conversionRate }
  }, [inquiries])

  // Selected Inquiry Services Total
  const selectedServices = selectedInquiry?.services ?? []
  const selectedTotal = selectedServices.reduce(
    (sum, s) => sum + Number(s.price) * (s.quantity ?? 1),
    0
  )

  return (
    <div className="w-full max-w-full min-w-0 space-y-4 overflow-hidden sm:space-y-5">
      {/* HeaderPortal matching Bookings */}
      <HeaderPortal
        search={
          <div className="relative w-full md:w-64 lg:w-72">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#858aa5]" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search inquiries..."
              className="h-11 w-full rounded-2xl border-white/80 bg-white/90 pl-10 text-sm shadow-md shadow-purple-950/5 backdrop-blur placeholder:text-slate-400"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
        }
        actions={
          <div className="flex shrink-0 items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger
                className={cn(
                  "inline-flex h-11 w-11 items-center justify-center gap-2 rounded-2xl border border-white/80 bg-white/90 px-0 text-xs font-semibold shadow-md shadow-purple-950/5 outline-none transition hover:bg-slate-50 md:w-auto md:px-3 shrink-0",
                  status !== "all" && "border-purple-200 bg-purple-50 text-[#7c3aed]"
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
                    New inquiry
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="booked" className="cursor-pointer rounded-xl">
                    Booking created
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="cancelled" className="cursor-pointer rounded-xl">
                    Cancelled
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              type="button"
              className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#7c3aed] px-0 text-white shadow-md shadow-purple-950/10 hover:bg-[#6d28d9] md:w-auto md:px-4 shrink-0"
              disabled={!inquiryLink || !isFormLinkActive || isReadOnly}
              onClick={copyInquiryLink}
            >
              <Copy className="size-5 md:size-4" />
              <span className="hidden ml-1.5 font-semibold md:inline">Copy form link</span>
            </Button>
          </div>
        }
      />

      {/* KPI Summary Stat Cards - 3 in row on mobile, 4 on desktop */}
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 sm:gap-3 lg:gap-3.5 w-full min-w-0">
        {/* Card 1: Total Inquiries */}
        <div className="relative flex flex-col justify-between overflow-hidden rounded-xl sm:rounded-2xl border border-purple-100/90 bg-white/95 p-2 sm:p-3 lg:p-3.5 shadow-xs sm:shadow-sm transition-all hover:shadow-md min-w-0">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[9px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 truncate">
              <span className="hidden sm:inline">Total </span>Inquiries
            </span>
            <div className="flex size-5 sm:size-6 lg:size-7 items-center justify-center rounded-lg bg-purple-100 text-[#7c3aed] shrink-0">
              <Users className="size-3 sm:size-3.5" />
            </div>
          </div>
          <div className="mt-1 sm:mt-1.5 flex items-baseline justify-between gap-1 min-w-0">
            <p className="text-base sm:text-xl lg:text-2xl font-black text-slate-900 tracking-tight leading-none truncate">
              {stats.total}
            </p>
            <p className="text-[9px] sm:text-[11px] text-slate-400 truncate shrink-0 font-medium">
              <span className="hidden sm:inline">Form </span>leads
            </p>
          </div>
        </div>

        {/* Card 2: New Inquiries (Green) */}
        <div className="relative flex flex-col justify-between overflow-hidden rounded-xl sm:rounded-2xl border border-emerald-100/90 bg-white/95 p-2 sm:p-3 lg:p-3.5 shadow-xs sm:shadow-sm transition-all hover:shadow-md min-w-0">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[9px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 truncate">
              <span className="hidden sm:inline">New </span>Leads
            </span>
            <div className="flex size-5 sm:size-6 lg:size-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 shrink-0">
              <Sparkles className="size-3 sm:size-3.5" />
            </div>
          </div>
          <div className="mt-1 sm:mt-1.5 flex items-baseline justify-between gap-1 min-w-0">
            <p className="text-base sm:text-xl lg:text-2xl font-black text-emerald-600 tracking-tight leading-none truncate">
              {stats.newCount}
            </p>
            <p className="text-[9px] sm:text-[11px] text-emerald-600/90 font-semibold truncate shrink-0">
              {stats.newCount > 0 ? "Awaiting" : "Cleared"}
            </p>
          </div>
        </div>

        {/* Card 3: Booking Created (Primary Purple) */}
        <div className="relative flex flex-col justify-between overflow-hidden rounded-xl sm:rounded-2xl border border-purple-100/90 bg-white/95 p-2 sm:p-3 lg:p-3.5 shadow-xs sm:shadow-sm transition-all hover:shadow-md min-w-0">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[9px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 truncate">
              <span className="hidden sm:inline">Booking </span>Booked
            </span>
            <div className="flex size-5 sm:size-6 lg:size-7 items-center justify-center rounded-lg bg-purple-100 text-[#7c3aed] shrink-0">
              <TrendingUp className="size-3 sm:size-3.5" />
            </div>
          </div>
          <div className="mt-1 sm:mt-1.5 flex items-baseline justify-between gap-1 min-w-0">
            <p className="text-base sm:text-xl lg:text-2xl font-black text-[#7c3aed] tracking-tight leading-none truncate">
              {stats.bookedCount}
            </p>
            <p className="text-[9px] sm:text-[11px] text-purple-600/90 font-semibold truncate shrink-0">
              {stats.conversionRate}%<span className="hidden sm:inline"> conv</span>
            </p>
          </div>
        </div>

        {/* Card 4: Public Form Link (Hidden on mobile, visible on sm and up) */}
        <div className="relative hidden sm:flex flex-col justify-between overflow-hidden rounded-xl sm:rounded-2xl border border-slate-200/90 bg-white/95 p-2 sm:p-3 lg:p-3.5 shadow-xs sm:shadow-sm transition-all hover:shadow-md min-w-0">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[9px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 truncate">
              <span className="hidden sm:inline">Form </span>Link
            </span>
            {/* Quick Action Button */}
            {isFormLinkActive ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-5 sm:h-6 rounded-md sm:rounded-lg border-purple-200 bg-purple-50 text-[#7c3aed] hover:bg-[#7c3aed] hover:text-white px-1 sm:px-2 text-[9px] sm:text-xs font-bold transition shadow-2xs shrink-0"
                onClick={copyInquiryLink}
                disabled={isReadOnly}
                title="Copy inquiry link"
              >
                <Copy className="size-2.5 sm:size-3 mr-0.5 sm:mr-1" />
                <span>Copy</span>
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                className="h-5 sm:h-6 rounded-md sm:rounded-lg bg-[#7c3aed] hover:bg-[#6d28d9] text-white px-1 sm:px-2 text-[9px] sm:text-xs font-bold transition shadow-2xs shrink-0"
                onClick={activateFormLink}
                disabled={activatingLink || isReadOnly}
                title="Activate inquiry link"
              >
                <TimerReset className="size-2.5 sm:size-3 mr-0.5 sm:mr-1" />
                <span>Act</span>
              </Button>
            )}
          </div>

          <div className="mt-1 sm:mt-1.5 flex items-center justify-between gap-1 min-w-0">
            <div className="flex items-center gap-1 min-w-0">
              <span
                className={cn(
                  "size-1.5 sm:size-2 rounded-full shrink-0",
                  isFormLinkActive ? "bg-emerald-500 animate-pulse" : "bg-amber-400"
                )}
              />
              <p className="text-xs sm:text-base lg:text-lg font-black text-slate-900 tracking-tight truncate leading-none">
                {isFormLinkActive ? "Active" : "Inactive"}
              </p>
            </div>
            <p className="text-[9px] sm:text-[11px] text-slate-400 truncate font-medium shrink-0">
              {isFormLinkActive
                ? `Exp ${formatExpiry(formLink?.active_until)}`
                : "10h auto"}
            </p>
          </div>
        </div>
      </div>

      {/* Bookings-Style Responsive Grid Layout */}
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
              <div key={inquiry.id} className="min-w-0" data-inquiry-id={inquiry.id}>
                <InquiryCard
                  inquiry={inquiry}
                  loading={actingId === inquiry.id}
                  readOnly={isReadOnly}
                  onConvert={convertInquiry}
                  onCancel={cancelInquiry}
                  onSelect={(inq) => setSelectedInquiry(inq)}
                />
              </div>
            ))}
          </div>

          {hasMore ? (
            <div className="flex justify-center pt-4">
              <Button
                variant="outline"
                className="h-11 rounded-2xl border border-slate-100 bg-white px-6 shadow-sm hover:bg-slate-50 text-xs sm:text-sm font-semibold"
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
            <h3 className="mt-4 text-lg font-semibold text-slate-900">No inquiries yet</h3>
            <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
              Activate your secure form link for 10 hours, then share it to collect booking details while you are busy.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Responsive Inquiry Detail Drawer / Modal */}
      <Sheet
        open={!!selectedInquiry}
        onOpenChange={(o) => {
          if (!o) setSelectedInquiry(null)
        }}
      >
        <SheetContent
          side={isMobile ? "bottom" : "right"}
          showCloseButton={false}
          className={cn(
            "p-0 bg-slate-50/70 border-slate-200/80 shadow-2xl flex flex-col focus:outline-none",
            isMobile
              ? "w-full max-h-[88vh] rounded-t-[28px] border-t overflow-hidden"
              : "w-full sm:max-w-xl md:max-w-2xl h-full border-l overflow-y-auto"
          )}
        >
          {selectedInquiry && (
            <div className="flex flex-col h-full w-full min-w-0 overflow-hidden">
              {/* Mobile Drag Indicator */}
              <div className="sm:hidden flex flex-col items-center pt-2.5 pb-1 bg-white border-b border-slate-100/60 shrink-0">
                <div className="h-1.5 w-12 rounded-full bg-slate-300" />
              </div>

              {/* Header */}
              <SheetHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-4 sm:pb-5 border-b border-slate-200/80 bg-white shrink-0 relative">
                <div className="flex items-start justify-between gap-3 pr-8 sm:pr-10">
                  <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                    <Avatar className="size-12 sm:size-14 rounded-2xl shadow-sm ring-2 ring-purple-100 shrink-0">
                      <AvatarFallback
                        className={cn(
                          "bg-gradient-to-br font-bold text-base sm:text-lg rounded-2xl",
                          getAvatarGradient(
                            selectedInquiry.customer?.customer_name ?? "Client"
                          )
                        )}
                      >
                        {(
                          selectedInquiry.customer?.customer_name ?? "CL"
                        ).slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <SheetTitle className="text-base sm:text-xl font-extrabold text-slate-900 truncate">
                          {selectedInquiry.customer?.customer_name ?? "Customer Submission"}
                        </SheetTitle>
                        <Badge
                          variant="outline"
                          className={cn(
                            "font-bold text-[10px] sm:text-xs shrink-0 rounded-lg",
                            selectedInquiry.status === "new"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : selectedInquiry.status === "booked"
                                ? "bg-purple-50 text-[#7c3aed] border-purple-200"
                                : "bg-rose-50 text-rose-700 border-rose-200"
                          )}
                        >
                          {selectedInquiry.status === "new"
                            ? "New Inquiry"
                            : selectedInquiry.status === "booked"
                              ? "Booking Created"
                              : "Cancelled"}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5 font-medium truncate">
                        <Phone className="size-3 text-slate-400 shrink-0" />
                        <span>{selectedInquiry.customer?.phone ?? "No phone"}</span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Close Button */}
                <button
                  onClick={() => setSelectedInquiry(null)}
                  className="absolute right-3.5 top-3.5 sm:top-5 size-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 flex items-center justify-center transition-colors"
                  aria-label="Close"
                >
                  <X className="size-4" />
                </button>

                {/* Quick Action Contact Buttons */}
                {selectedInquiry.customer?.phone && (
                  <div className="grid grid-cols-3 gap-2 mt-3.5 pt-3 border-t border-slate-100">
                    <a
                      href={`tel:${selectedInquiry.customer.phone}`}
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-purple-200 bg-purple-50/50 hover:bg-purple-100/60 py-2 text-xs font-bold text-[#7c3aed] shadow-xs transition"
                    >
                      <Phone className="size-3.5 shrink-0" />
                      <span>Call</span>
                    </a>
                    <a
                      href={`https://wa.me/${selectedInquiry.customer.phone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(`Hi ${selectedInquiry.customer.customer_name ?? ""}, we have received your booking inquiry for ${formatDate(selectedInquiry.booking_date)}. Let's confirm your appointment details!`)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50/60 hover:bg-emerald-100/70 py-2 text-xs font-bold text-emerald-700 shadow-xs transition"
                    >
                      <MessageCircle className="size-3.5 shrink-0" />
                      <span>WhatsApp</span>
                    </a>
                    {selectedInquiry.customer.email ? (
                      <a
                        href={`mailto:${selectedInquiry.customer.email}`}
                        className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 py-2 text-xs font-bold text-slate-700 shadow-xs transition truncate"
                      >
                        <Mail className="size-3.5 text-blue-600 shrink-0" />
                        <span>Email</span>
                      </a>
                    ) : (
                      <button
                        disabled
                        className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-100 bg-slate-50 py-2 text-xs font-bold text-slate-400 opacity-60 cursor-not-allowed"
                      >
                        <Mail className="size-3.5 shrink-0" />
                        <span>Email</span>
                      </button>
                    )}
                  </div>
                )}
              </SheetHeader>

              {/* Scrollable Content Body */}
              <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-5 space-y-4 sm:space-y-5">
                {/* Appointment Schedule & Location */}
                <div className="rounded-2xl border border-slate-200/80 bg-white p-3.5 sm:p-4 shadow-xs space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Event & Venue Details
                  </h3>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-xl bg-slate-50 p-2.5 sm:p-3 border border-slate-100">
                      <div className="flex items-center gap-1.5 text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                        <Calendar className="size-3 text-[#7c3aed]" />
                        <span>Event Date</span>
                      </div>
                      <p className="text-xs sm:text-sm font-extrabold text-slate-900 mt-1 truncate">
                        {formatDate(selectedInquiry.booking_date)}
                      </p>
                    </div>

                    <div className="rounded-xl bg-slate-50 p-2.5 sm:p-3 border border-slate-100">
                      <div className="flex items-center gap-1.5 text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                        <Clock className="size-3 text-[#7c3aed]" />
                        <span>Time Slot</span>
                      </div>
                      <p className="text-xs sm:text-sm font-extrabold text-slate-900 mt-1 truncate">
                        {formatTime(selectedInquiry.start_time)} - {formatTime(selectedInquiry.end_time)}
                      </p>
                    </div>
                  </div>

                  {selectedInquiry.booking_address && (
                    <div className="rounded-xl bg-slate-50 p-2.5 sm:p-3 border border-slate-100 text-xs text-slate-700 flex items-center justify-between gap-2.5">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-1">
                          <MapPin className="size-3 text-[#7c3aed]" />
                          <span>Location</span>
                        </div>
                        <p className="font-semibold text-slate-800 break-words text-xs sm:text-sm leading-snug">
                          {selectedInquiry.booking_address}
                        </p>
                      </div>
                      <a
                        href={`https://maps.google.com/?q=${encodeURIComponent(selectedInquiry.booking_address)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex size-8.5 items-center justify-center rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition-all shadow-2xs shrink-0 border border-blue-200/80"
                        title="Open on Google Maps"
                      >
                        <MapPin className="size-4" />
                        <span className="sr-only">Open on Google Maps</span>
                      </a>
                    </div>
                  )}
                </div>

                {/* Requested Services */}
                <div className="rounded-2xl border border-slate-200/80 bg-white p-3.5 sm:p-4 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Requested Services ({selectedServices.length})
                    </h3>
                    <span className="text-sm font-extrabold text-[#7c3aed]">
                      {formatPrice(selectedTotal)}
                    </span>
                  </div>

                  {selectedServices.length > 0 ? (
                    <div className="divide-y divide-slate-100 rounded-xl border border-slate-100 overflow-hidden">
                      {selectedServices.map((s) => (
                        <div
                          key={s.id}
                          className="flex items-center justify-between p-2.5 text-xs bg-slate-50/50"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <Sparkles className="size-3.5 text-purple-600 shrink-0" />
                            <span className="font-bold text-slate-800 truncate">
                              {s.service_name}
                            </span>
                            {(s.quantity ?? 1) > 1 && (
                              <Badge variant="outline" className="text-[10px] px-1 py-0 font-bold">
                                Qty: {s.quantity}
                              </Badge>
                            )}
                          </div>
                          <span className="font-extrabold text-slate-900 shrink-0">
                            {formatPrice(Number(s.price) * (s.quantity ?? 1))}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">No specific services pre-selected.</p>
                  )}
                </div>

                {/* Additional Client Notes */}
                {selectedInquiry.additional_request && (
                  <div className="rounded-2xl border border-amber-200/70 bg-amber-50/40 p-3.5 sm:p-4 shadow-xs space-y-1.5">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-amber-800">
                      Special Client Instructions
                    </h3>
                    <p className="text-xs text-slate-700 leading-relaxed break-words italic">
                      &ldquo;{selectedInquiry.additional_request}&rdquo;
                    </p>
                  </div>
                )}

                {/* Metadata */}
                <div className="text-[11px] text-slate-400 flex items-center justify-between px-1">
                  <span>Submitted: {formatDate(selectedInquiry.created_at)}</span>
                  <span>Inquiry ID #{selectedInquiry.id}</span>
                </div>
              </div>

              {/* Action Bottom Bar */}
              <div className="p-4 sm:p-5 border-t border-slate-200/80 bg-white shrink-0">
                {selectedInquiry.status === "new" ? (
                  <div className="grid grid-cols-2 gap-2.5">
                    <Button
                      type="button"
                      variant="outline"
                      className="h-11 rounded-xl border-rose-200 bg-white text-xs sm:text-sm font-bold text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                      disabled={actingId === selectedInquiry.id || isReadOnly}
                      onClick={() => cancelInquiry(selectedInquiry)}
                    >
                      <XCircle className="size-4 mr-1.5" />
                      <span>Cancel Lead</span>
                    </Button>
                    <Button
                      type="button"
                      className="h-11 rounded-xl bg-[#7c3aed] hover:bg-[#6d28d9] text-xs sm:text-sm font-bold text-white shadow-md shadow-purple-950/10"
                      disabled={actingId === selectedInquiry.id || isReadOnly}
                      onClick={() => convertInquiry(selectedInquiry)}
                    >
                      <CheckCircle2 className="size-4 mr-1.5" />
                      <span>Confirm & Book</span>
                    </Button>
                  </div>
                ) : selectedInquiry.status === "booked" && selectedInquiry.booking_id ? (
                  <Button
                    type="button"
                    onClick={() => {
                      const id = selectedInquiry.booking_id
                      setSelectedInquiry(null)
                      router.push(`/bookings/${id}`)
                    }}
                    className="w-full h-11 rounded-xl bg-[#7c3aed] hover:bg-[#6d28d9] text-white font-bold text-xs sm:text-sm shadow-md flex items-center justify-center gap-2"
                  >
                    <span>View Booking #{selectedInquiry.booking_id}</span>
                    <ExternalLink className="size-4" />
                  </Button>
                ) : (
                  <div className="w-full py-2.5 text-center text-xs font-bold text-rose-700 bg-rose-50 rounded-xl border border-rose-100">
                    This inquiry was cancelled
                  </div>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
