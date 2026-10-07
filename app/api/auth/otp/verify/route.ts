import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import {
  verifyOtpInDatabase,
  verifyOtpStateToken,
  createRegistrationToken,
  TEST_USER_OTP,
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

    // Check if user exists in database (to check test account status)
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

    // 1. Verify OTP
    let isValidOtp = false
    let failureReason: string | undefined
    let isLocked = false
    let needsResend = false
    let attemptsRemaining: number | undefined

    if (user?.is_test_user) {
      if (otp === TEST_USER_OTP) {
        isValidOtp = true
      } else {
        failureReason = "Invalid OTP for test account. Please enter 123456."
      }
    } else {
      // First attempt DB verification
      const dbResult = await verifyOtpInDatabase(cleanPhone, otp)
      if (dbResult.valid) {
        isValidOtp = true
      } else {
        failureReason = dbResult.reason
        isLocked = Boolean(dbResult.isLocked)
        needsResend = Boolean(dbResult.needsResend)
        attemptsRemaining = dbResult.attemptsRemaining

        // If DB had a fatal error (e.g. Supabase unavailable), fallback to signed stateToken
        if (dbResult.reason === "db_error" && stateToken) {
          if (verifyOtpStateToken(stateToken, cleanPhone, otp)) {
            isValidOtp = true
            failureReason = undefined
            isLocked = false
            needsResend = false
          }
        }
      }
    }

    if (!isValidOtp) {
      return NextResponse.json(
        {
          error: failureReason || "Invalid or expired OTP. Please check the code and try again.",
          isLocked,
          needsResend,
          attemptsRemaining,
        },
        { status: isLocked ? 429 : 400 }
      )
    }

    // Case A: User exists with complete artist profile -> log them straight in
    if (user && user.artist_name && user.studio_name) {

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
