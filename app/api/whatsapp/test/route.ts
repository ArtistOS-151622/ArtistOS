import { NextResponse, type NextRequest } from "next/server"
import { getArtistSession } from "@/lib/auth/session"
import { sendWhatsAppTemplate, formatWhatsAppPhoneNumber } from "@/lib/whatsapp/client"

export async function POST(request: NextRequest) {
  const session = getArtistSession(request)
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json().catch(() => ({}))
    const to = body.to || "918849264807"
    const templateName = body.templateName || "create_booking" // or "booking_confirmed"

    const formattedPhone = formatWhatsAppPhoneNumber(to)
    if (!formattedPhone) {
      return NextResponse.json(
        { error: "Invalid phone number format" },
        { status: 400 },
      )
    }

    // Default test parameters matching the 7 template variables
    const bodyParameters = body.parameters || [
      body.customerName || "Test Customer",
      session.artist_name || "Artist Name",
      session.studio_name || session.artist_name || "Studio Name",
      "30 Sept 2026",
      "05:30 PM",
      "Mehandi Service",
      "500",
    ]

    const result = await sendWhatsAppTemplate({
      to: formattedPhone,
      templateName,
      bodyParameters,
    })

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          details: result.details,
        },
        { status: 400 },
      )
    }

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
      sentTo: formattedPhone,
      templateName,
      bodyParameters,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to send test WhatsApp message" },
      { status: 500 },
    )
  }
}
