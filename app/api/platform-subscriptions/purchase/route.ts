import { type NextRequest, NextResponse } from "next/server"
import { getArtistSession } from "@/lib/auth/session"
import { createPlatformPurchase } from "@/lib/platform-billing"
import { isRazorpayConfigured } from "@/lib/razorpay/client"
import { portfolioError, portfolioSuccess } from "@/lib/portfolio/response"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(request: NextRequest) {
  // Breakpoint for debugger (if inspector attached)
  debugger;

  console.log("\n==================== [DEBUG: PURCHASE API START] ====================")
  console.log("[DEBUG] Timestamp:", new Date().toISOString())
  console.log("[DEBUG] Razorpay Config Check:", {
    hasKeyId: Boolean(process.env.RAZORPAY_KEY_ID),
    hasKeySecret: Boolean(process.env.RAZORPAY_KEY_SECRET),
    hasNextPublicKeyId: Boolean(process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID),
    isConfigured: isRazorpayConfigured(),
  })

  try {
    const session = getArtistSession(request)
    console.log("[DEBUG] Session check:", session ? { id: session.id, artist: session.artist_name, studio: session.studio_name } : "NULL / UNAUTHORIZED")
    
    if (!session) {
      console.error("[DEBUG] Unauthorized: No active artist session found in cookies/headers")
      console.log("==================== [DEBUG: PURCHASE API END (401)] ====================\n")
      return portfolioError("Unauthorized", 401)
    }

    let body: any
    try {
      body = await request.json()
      console.log("[DEBUG] Request body parsed:", JSON.stringify(body, null, 2))
    } catch (parseError) {
      console.error("[DEBUG] Failed to parse request JSON body:", parseError)
      console.log("==================== [DEBUG: PURCHASE API END (400)] ====================\n")
      return portfolioError("Invalid JSON body", 400)
    }

    const planId = Number(body?.plan_id)
    console.log(`[DEBUG] Target Plan ID: ${planId} (raw input: ${body?.plan_id})`)

    if (Number.isNaN(planId)) {
      console.error("[DEBUG] Missing or invalid plan_id in request body:", body)
      console.log("==================== [DEBUG: PURCHASE API END (400)] ====================\n")
      return portfolioError("plan_id is required", 400)
    }

    const supabase = createAdminClient()

    console.log(`[DEBUG] Executing createPlatformPurchase for userId=${session.id}, planId=${planId}...`)
    const result = await createPlatformPurchase(supabase, session.id, planId)

    console.log("[DEBUG] Purchase created successfully:", JSON.stringify(result, null, 2))
    console.log("==================== [DEBUG: PURCHASE API SUCCESS] ====================\n")

    return portfolioSuccess("Purchase initiated", result, 201)
  } catch (err: any) {
    // Triggers debugger breakpoint on error
    debugger;

    const errorDescription =
      err?.error?.description ||
      (err instanceof Error ? err.message : "Purchase failed")

    console.error("\n==================== [DEBUG: PURCHASE API ERROR] ====================")
    console.error("[DEBUG] Error Message:", err?.message)
    console.error("[DEBUG] Resolved Description:", errorDescription)
    console.error("[DEBUG] Status Code:", err?.statusCode || 500)
    console.error("[DEBUG] Razorpay Error Obj:", err?.error)
    console.error("[DEBUG] Stack Trace:\n", err?.stack)
    console.error("[DEBUG] Raw Error Dump:", err)
    console.error("======================================================================\n")

    return NextResponse.json(
      {
        status: false,
        message: errorDescription,
        data: null,
        debug: {
          message: err?.message,
          errorDescription,
          name: err?.name,
          statusCode: err?.statusCode,
          razorpayError: err?.error,
          stack: err?.stack,
          env: {
            hasKeyId: Boolean(process.env.RAZORPAY_KEY_ID),
            hasKeySecret: Boolean(process.env.RAZORPAY_KEY_SECRET),
            hasNextPublicKeyId: Boolean(process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID),
          },
        },
      },
      { status: 500 }
    )
  }
}


