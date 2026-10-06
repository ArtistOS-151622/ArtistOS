import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getArtistSession } from "@/lib/auth/session"
import { getUserPlanFeatures } from "@/lib/auth/plan-features"

export async function GET(request: NextRequest) {
  const session = getArtistSession(request)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supabase = await createClient()

  try {
    const features = await getUserPlanFeatures(supabase, session.id)

    return NextResponse.json(
      {
        trialDaysLeft: features.trialDaysLeft,
        isTrialExpired: features.isReadOnly && !features.hasActiveSub,
        hasActiveSub: features.hasActiveSub,
        isReadOnly: features.isReadOnly,
        subscriptionStatus: features.subscriptionStatus,
        daysSinceSignup: features.daysSinceSignup,
        planTier: features.planTier,
        planName: features.planName,
        billingPeriod: features.billingPeriod,
        hasWhatsAppAutomation: features.hasWhatsAppAutomation,
        storageQuotaMb: features.storageQuotaMb,
        storageQuotaBytes: features.storageQuotaBytes,
      },
      { headers: { "Cache-Control": "no-store" } }
    )
  } catch (error) {
    console.error("Error checking subscription status:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
