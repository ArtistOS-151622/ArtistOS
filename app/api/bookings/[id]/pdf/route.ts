import { NextRequest, NextResponse } from "next/server"
import { renderToStream } from "@react-pdf/renderer"
import { getArtistSession } from "@/lib/auth/session"
import { createClient } from "@/lib/supabase/server"
import { QuotationPDF } from "@/components/pdf/quotation-pdf"
import { getPublicUrl } from "@/lib/r2/url"

export const runtime = "nodejs"

function sanitizeFilenamePart(value: string, fallback: string) {
  return value
    .trim()
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[.-]+|[.-]+$/g, "") || fallback
}

function createBookingCode(createdAt: string, bookingId: number) {
  const source = `${createdAt}:${bookingId}`
  let hash = 2166136261

  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }

  return String(hash >>> 0).slice(-6).padStart(6, "0")
}

function createQuotationFilename(
  studioName: string | null,
  customerName: string | null,
  createdAt: string,
  bookingId: number,
) {
  const safeStudioName = sanitizeFilenamePart(studioName || "", "Artist-Studio")
  const customerFirstName = customerName?.trim().split(/\s+/)[0] || "Customer"
  const safeCustomerFirstName = sanitizeFilenamePart(customerFirstName, "Customer")
  const bookingCode = createBookingCode(createdAt, bookingId)

  return `${safeStudioName}-Quotation-${safeCustomerFirstName}-${bookingCode}.pdf`
}

function createContentDisposition(filename: string) {
  const asciiFallback = filename.replace(/[^\x20-\x7e]/g, "") || "quotation.pdf"
  return `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(filename)}`
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = getArtistSession(request)
    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const { id: paramId } = await params
    const bookingId = Number(paramId)
    if (Number.isNaN(bookingId)) {
      return new NextResponse("Booking ID is required", { status: 400 })
    }

    const supabase = await createClient()

    // 1. Fetch Booking Details
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select(`
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
      `)
      .eq("id", bookingId)
      .eq("user_id", session.id)
      .single()

    if (bookingError || !booking) {
      return new NextResponse("Booking not found", { status: 404 })
    }

    const customer = Array.isArray(booking.customer) ? booking.customer[0] : booking.customer

    // Format services
    const services = booking.booking_services?.map((bs: any) => ({
      service_name: bs.service?.service_name || "Unknown Service",
      quantity: bs.quantity ?? 1,
      price: bs.unit_price ?? bs.service?.price ?? 0,
    })) || []
    
    // Format additional charges
    const additional_charges = booking.booking_additional_charges || []

    // 2. Fetch Payments to calculate due amount
    const { data: payments } = await supabase
      .from("booking_payments")
      .select("amount")
      .eq("booking_id", bookingId)

    const totalPaid = (payments || []).reduce((acc: number, p: any) => acc + Number(p.amount), 0)

    // Format booking object
    const formattedBooking = {
      ...booking,
      customer,
      services,
      additional_charges,
    }

    // Calculations
    const servicesTotal = services.reduce((acc: number, s: any) => acc + (Number(s.price) * (s.quantity ?? 1)), 0)
    const additionalTotal = additional_charges.reduce((acc: number, c: any) => acc + (Number(c.rate) * Number(c.quantity)), 0)
    const subTotal = servicesTotal + additionalTotal
    const grandTotal = Math.max(0, subTotal - Number(booking.discount) - totalPaid)
    const dueAmount = grandTotal

    const calculations = {
      subTotal,
      discount: Number(booking.discount),
      grandTotal,
      totalPaid,
      dueAmount,
    }

    // 3. Fetch Artist (User) Details
    const { data: artist, error: artistError } = await supabase
      .from("users")
      .select(`
        artist_name,
        studio_name,
        phone,
        email,
        address,
        studio_logo_file_id
      `)
      .eq("id", session.id)
      .single()

    if (artistError || !artist) {
      return new NextResponse("Artist not found", { status: 404 })
    }

    // Resolve studio logo URL if it exists
    let studio_logo_url = null
    if (artist.studio_logo_file_id) {
      const { data: fileData } = await supabase
        .from("portfolio_files")
        .select("storage_path")
        .eq("id", artist.studio_logo_file_id)
        .single()
        
      if (fileData?.storage_path) {
        studio_logo_url = getPublicUrl(fileData.storage_path)
      }
    }

    const formattedArtist = {
      ...artist,
      studio_logo_url,
    }

    const protocol = request.headers.get("x-forwarded-proto") || "http"
    const host = request.headers.get("host") || "localhost:3000"
    const artistosLogoUrl = `${protocol}://${host}/brand/artistos-sort-watermark.png`

    // 4. Generate PDF Stream
    const stream = await renderToStream(
      QuotationPDF({ booking: formattedBooking, artist: formattedArtist, calculations, artistosLogoUrl })
    )

    // Convert Node ReadableStream to Buffer for NextResponse
    const chunks = []
    for await (const chunk of stream as any) {
      chunks.push(Buffer.from(chunk))
    }
    const pdfBuffer = Buffer.concat(chunks)
    const filename = createQuotationFilename(
      formattedArtist.studio_name,
      customer?.customer_name || null,
      formattedBooking.created_at,
      formattedBooking.id,
    )

    // 5. Return PDF Response
    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": createContentDisposition(filename),
      },
    })

  } catch (error) {
    console.error("PDF Generation Error:", error)
    return new NextResponse("Internal Server Error generating PDF", { status: 500 })
  }
}
