import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import {
  verifyOtpInDatabase,
  verifyOtpStateToken,
  createRegistrationToken,
  isTestPhoneNumber,
  TEST_OTP_CODE,
} from "@/lib/auth/otp"
import { createArtistToken, SESSION_MAX_AGE_SECONDS } from "@/lib/auth/session"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const rawPhone = String(body?.phone || "").trim()
    const cleanPhone = rawPhone.replace(/\D/g, "").slice(-10)
    const otp = String(body?.otp || "").trim()
    const stateToken = body?.stateToken ? String(body.stateToken) : null

    if (cleanPhone.length !== 10) {
      return NextResponse.json(
        { error: "Please provide a valid 10-digit mobile number." },
        { status: 400 }
      )
    }

    if (otp.length !== 6 || !/^\d{6}$/.test(otp)) {
      return NextResponse.json(
        { error: "Please enter the complete 6-digit OTP received on WhatsApp." },
        { status: 400 }
      )
    }

    // 1. Verify OTP
    let isValidOtp = false
    let failureReason: string | undefined

    if (isTestPhoneNumber(cleanPhone)) {
      if (otp === TEST_OTP_CODE) {
        isValidOtp = true
      } else {
        failureReason = "Invalid or expired OTP. Please check the code and try again."
      }
    } else {
      // First attempt DB verification
      const dbResult = await verifyOtpInDatabase(cleanPhone, otp)
      if (dbResult.valid) {
        isValidOtp = true
      } else if (dbResult.reason !== "db_error") {
        failureReason = dbResult.reason
      }

      // If DB check failed or wasn't available, check the signed fallback stateToken
      if (!isValidOtp && stateToken) {
        if (verifyOtpStateToken(stateToken, cleanPhone, otp)) {
          isValidOtp = true
          failureReason = undefined
        }
      }
    }

    if (!isValidOtp) {
      return NextResponse.json(
        { error: failureReason || "Invalid or expired OTP. Please check the code and try again." },
        { status: 400 }
      )
    }

    // 2. Check if user already exists
    const supabase = createAdminClient()
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("phone", cleanPhone)
      .maybeSingle()

    if (userError && userError.code !== "42P01") {
      console.error("[OTP Verify] Supabase user query error:", userError)
      return NextResponse.json(
        { error: "Failed to verify account records. Please try again." },
        { status: 500 }
      )
    }

    // Case A: User exists with complete artist profile -> log them straight in
    if (user && user.artist_name && user.studio_name) {
      if (isTestPhoneNumber(cleanPhone) && !user.is_test_user) {
        await supabase
          .from("users")
          .update({ is_test_user: true })
          .eq("id", user.id)
      }

      const sessionData = {
        id: user.id,
        phone: user.phone,
        artist_name: user.artist_name,
        studio_name: user.studio_name,
      }

      const token = createArtistToken(sessionData)
      const response = NextResponse.json({
        success: true,
        isNewUser: false,
        redirectUrl: "/dashboard",
        user: sessionData,
        token,
      })

      response.cookies.set("artist_session", token, {
        path: "/",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: SESSION_MAX_AGE_SECONDS, // 1 year
      })

      return response
    }

    // Case B: First-time user -> issue registration token for studio profile setup
    const registrationToken = createRegistrationToken(cleanPhone)

    return NextResponse.json({
      success: true,
      isNewUser: true,
      registrationToken,
      phone: cleanPhone,
    })
  } catch (err: any) {
    console.error("[OTP Verify] Unexpected error:", err)
    return NextResponse.json(
      { error: err?.message || "An unexpected error occurred during OTP verification." },
      { status: 500 }
    )
  }
}
