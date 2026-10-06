import { NextResponse } from "next/server"
import {
  generate6DigitOtp,
  hashOtp,
  createOtpStateToken,
  sendOtpToWhatsApp,
  persistOtpInDatabase,
  OTP_COOLDOWN_SECONDS,
  OTP_EXPIRY_MINUTES,
} from "@/lib/auth/otp"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const rawPhone = String(body?.phone || "").trim()
    const cleanPhone = rawPhone.replace(/\D/g, "").slice(-10)

    if (cleanPhone.length !== 10) {
      return NextResponse.json(
        { error: "Please enter a valid 10-digit mobile number." },
        { status: 400 }
      )
    }

    const otp = generate6DigitOtp()
    const otpHash = hashOtp(otp)
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000)

    // Save to database
    await persistOtpInDatabase(cleanPhone, otpHash, expiresAt)

    // Dispatch WhatsApp message
    const sendResult = await sendOtpToWhatsApp(cleanPhone, otp)

    if (!sendResult.success) {
      console.error("[OTP Send] WhatsApp delivery failed:", sendResult.error)
      return NextResponse.json(
        {
          error:
            sendResult.error ||
            "Failed to send OTP via WhatsApp. Please ensure your WhatsApp number is active and try again.",
        },
        { status: 500 }
      )
    }

    const stateToken = createOtpStateToken(cleanPhone, otpHash, expiresAt.getTime())

    return NextResponse.json({
      success: true,
      message: "OTP sent successfully to your WhatsApp.",
      stateToken,
      cooldownSeconds: OTP_COOLDOWN_SECONDS,
    })
  } catch (err: any) {
    console.error("[OTP Send] Unexpected error:", err)
    return NextResponse.json(
      { error: err?.message || "An unexpected error occurred while sending OTP." },
      { status: 500 }
    )
  }
}
