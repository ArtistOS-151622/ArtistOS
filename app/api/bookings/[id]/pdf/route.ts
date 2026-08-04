import { NextRequest, NextResponse } from "next/server"
import { renderToStream } from "@react-pdf/renderer"
import { getArtistSession } from "@/lib/auth/session"
import { createClient } from "@/lib/supabase/server"
import { QuotationPDF } from "@/components/pdf/quotation-pdf"
import { getPublicUrl } from "@/lib/r2/url"

export const runtime = "nodejs"

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
      .from("payments")
      .select("amount")
      .eq("booking_id", bookingId)

    const totalPaid = (payments || []).reduce((acc: number, p: any) => acc + Number(p.amount), 0)

    // Calculate user_booking_index manually
    const { count: userBookingCount } = await supabase
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .eq("user_id", session.id)
      .lte("id", bookingId)

    // Format booking object
    const formattedBooking = {
      ...booking,
      user_booking_index: userBookingCount ?? bookingId,
      services,
      additional_charges,
    }

    // Calculations
    const servicesTotal = services.reduce((acc: number, s: any) => acc + (Number(s.price) * (s.quantity ?? 1)), 0)
    const additionalTotal = additional_charges.reduce((acc: number, c: any) => acc + (Number(c.rate) * Number(c.quantity)), 0)
    const subTotal = servicesTotal + additionalTotal
    const grandTotal = Math.max(0, subTotal - Number(booking.discount))
    const dueAmount = grandTotal - totalPaid

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

    // 5. Return PDF Response
    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="Quotation-${formattedBooking.user_booking_index}.pdf"`,
      },
    })

  } catch (error) {
    console.error("PDF Generation Error:", error)
    return new NextResponse("Internal Server Error generating PDF", { status: 500 })
  }
}
