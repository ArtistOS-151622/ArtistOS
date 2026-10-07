import { NextResponse } from "next/server"
import {
  generate6DigitOtp,
  hashOtp,
  persistOtpInDatabase,
  sendAdminDeleteOtp,
  ADMIN_SECURITY_PHONE,
  OTP_EXPIRY_MINUTES,
} from "@/lib/auth/otp"

export async function POST() {
  try {
    const otp = generate6DigitOtp()
    const otpHash = hashOtp(otp)
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000)

    // Save to database table whatsapp_otps
    await persistOtpInDatabase(ADMIN_SECURITY_PHONE, otpHash, expiresAt)

    // Dispatch WhatsApp template to 9313202075
    const sendResult = await sendAdminDeleteOtp(otp)

    if (!sendResult.success) {
      console.error("[Admin Delete OTP] Delivery failed:", sendResult.error)
      return NextResponse.json(
        { error: sendResult.error || "Failed to deliver OTP to admin WhatsApp number" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Security OTP sent to Admin WhatsApp (+91 ${ADMIN_SECURITY_PHONE})`,
      phone: ADMIN_SECURITY_PHONE,
    })
  } catch (error) {
    console.error("Error generating admin delete OTP:", error)
    return NextResponse.json(
      { error: "Internal server error generating admin OTP" },
      { status: 500 }
    )
  }
}
