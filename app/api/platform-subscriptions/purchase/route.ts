import { type NextRequest, NextResponse } from "next/server"
import { getArtistSession } from "@/lib/auth/session"
import { createPlatformPurchase } from "@/lib/platform-billing"
import { portfolioError, portfolioSuccess } from "@/lib/portfolio/response"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(request: NextRequest) {
  try {
    const session = getArtistSession(request)

    if (!session) {
      return portfolioError("Unauthorized", 401)
    }

    let body: { plan_id?: unknown }
    try {
      body = await request.json()
    } catch {
      return portfolioError("Invalid JSON body", 400)
    }

    const planId = Number(body?.plan_id)

    if (Number.isNaN(planId)) {
      return portfolioError("plan_id is required", 400)
    }

    const supabase = createAdminClient()

    const result = await createPlatformPurchase(supabase, session.id, planId)

    return portfolioSuccess("Purchase initiated", result, 201)
  } catch (err: unknown) {
    const purchaseError = err as {
      message?: string
      statusCode?: number
      error?: { code?: string; description?: string }
    }
    const errorDescription =
      purchaseError.error?.description ||
      (err instanceof Error ? err.message : "Purchase failed")

    console.error("[Platform Purchase] Request failed", {
      statusCode: purchaseError.statusCode || 500,
      errorCode: purchaseError.error?.code,
    })

    return NextResponse.json(
      {
        status: false,
        message: errorDescription,
        data: null,
      },
      { status: 500 }
    )
  }
}


