import { readFileSync } from "node:fs"

import { renderToBuffer } from "@react-pdf/renderer"

import { createDbClient } from "#src/integrations/supabase.js"
import { getPublicUrl } from "#src/integrations/r2/url.js"
import { QuotationPDF } from "#src/modules/bookings/pdf/quotation-pdf.js"

// The ArtistOS watermark, bundled with the server so rendering never depends on the
// frontend being reachable (the Next.js route fetched it from its own /brand URL).
const WATERMARK = {
  data: readFileSync(new URL("./assets/artistos-sort-watermark.png", import.meta.url)),
  format: "png",
}

const BOOKING_SELECT = `
  id,
  created_at,
  booking_date,
  start_time,
  end_time,
  booking_address,
  status,
  discount,
  customer:customers(customer_name, phone, email),
  booking_services(
    quantity,
    unit_price,
    service:services(service_name, price)
  ),
  booking_additional_charges(id, charge_name, quantity, rate)
`

/** Plain-text failures (the PDF endpoint never returned JSON). */
export class PdfError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

const sanitizeFilenamePart = (value, fallback) =>
  value
    .trim()
    // eslint-disable-next-line no-control-regex -- strip control characters from filenames
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[.-]+|[.-]+$/g, "") || fallback

/** Stable 6-digit code per booking (FNV-1a of created_at:id). */
function bookingCode(createdAt, bookingId) {
  const source = `${createdAt}:${bookingId}`
  let hash = 2166136261
  for (let i = 0; i < source.length; i += 1) {
    hash ^= source.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return String(hash >>> 0).slice(-6).padStart(6, "0")
}

/** "<Studio>-Quotation-<CustomerFirstName>-<code>.pdf" */
export function quotationFilename(studioName, customerName, createdAt, bookingId) {
  const studio = sanitizeFilenamePart(studioName || "", "Artist-Studio")
  const firstName = sanitizeFilenamePart(customerName?.trim().split(/\s+/)[0] || "Customer", "Customer")
  return `${studio}-Quotation-${firstName}-${bookingCode(createdAt, bookingId)}.pdf`
}

export function contentDisposition(filename) {
  const asciiFallback = filename.replace(/[^\x20-\x7e]/g, "") || "quotation.pdf"
  return `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(filename)}`
}

/** Renders the booking quotation. → { buffer, filename } */
export async function renderQuotation(userId, bookingId) {
  const supabase = createDbClient()

  const { data: booking, error } = await supabase
    .from("bookings")
    .select(BOOKING_SELECT)
    .eq("id", bookingId)
    .eq("user_id", userId)
    .single()
  if (error || !booking) throw new PdfError(404, "Booking not found")

  const customer = Array.isArray(booking.customer) ? booking.customer[0] : booking.customer
  const services =
    booking.booking_services?.map((bs) => ({
      service_name: bs.service?.service_name || "Unknown Service",
      quantity: bs.quantity ?? 1,
      price: bs.unit_price ?? bs.service?.price ?? 0,
    })) || []
  const additional_charges = booking.booking_additional_charges || []

  const { data: payments } = await supabase.from("booking_payments").select("amount").eq("booking_id", bookingId)
  const totalPaid = (payments || []).reduce((sum, p) => sum + Number(p.amount), 0)

  const servicesTotal = services.reduce((sum, s) => sum + Number(s.price) * (s.quantity ?? 1), 0)
  const additionalTotal = additional_charges.reduce((sum, c) => sum + Number(c.rate) * Number(c.quantity), 0)
  const subTotal = servicesTotal + additionalTotal
  const grandTotal = Math.max(0, subTotal - Number(booking.discount) - totalPaid)
  const calculations = { subTotal, discount: Number(booking.discount), grandTotal, totalPaid, dueAmount: grandTotal }

  const { data: artist, error: artistError } = await supabase
    .from("users")
    .select("artist_name, studio_name, phone, email, address, studio_logo_file_id")
    .eq("id", userId)
    .single()
  if (artistError || !artist) throw new PdfError(404, "Artist not found")

  let studio_logo_url = null
  if (artist.studio_logo_file_id) {
    const { data: file } = await supabase
      .from("portfolio_files")
      .select("storage_path")
      .eq("id", artist.studio_logo_file_id)
      .single()
    if (file?.storage_path) studio_logo_url = getPublicUrl(file.storage_path)
  }

  const formattedBooking = { ...booking, customer, services, additional_charges }
  const buffer = await renderToBuffer(
    QuotationPDF({
      booking: formattedBooking,
      artist: { ...artist, studio_logo_url },
      calculations,
      artistosLogoUrl: WATERMARK,
    })
  )

  return {
    buffer,
    filename: quotationFilename(artist.studio_name, customer?.customer_name || null, booking.created_at, booking.id),
  }
}
