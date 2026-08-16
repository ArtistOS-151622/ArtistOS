import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getArtistSession } from "@/lib/auth/session"

const FREE_TRIAL_DAYS = 30

export async function GET(request: NextRequest) {
  const session = getArtistSession(request)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supabase = await createClient()

  // 1. Get the user's created_at and test status to calculate trial age
  const { data: user, error: userError } = await supabase
    .from("users")
    .select("created_at, is_test_user")
    .eq("id", session.id)
    .single()

  if (userError || !user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  const now = new Date()
  const msPerDay = 1000 * 60 * 60 * 24

  if (user.is_test_user) {
    return NextResponse.json(
      {
        trialDaysLeft: 9999,
        isTrialExpired: false,
        hasActiveSub: true,
        isReadOnly: false,
        daysSinceSignup: Math.floor((now.getTime() - new Date(user.created_at).getTime()) / msPerDay),
      },
      { headers: { "Cache-Control": "no-store" } }
    )
  }

  // 2. Check for any active subscription
  const { data: activeSub } = await supabase
    .from("user_subscriptions")
    .select("id, current_period_end, next_billing_at, status")
    .eq("user_id", session.id)
    .eq("status", "active")
    .order("current_period_end", { ascending: false })
    .limit(1)
    .maybeSingle()

  const endDateStr = activeSub?.next_billing_at
  // Active = has a row AND period hasn't expired
  const hasActiveSub =
    !!activeSub &&
    (!endDateStr ||
      new Date(endDateStr) > now)

  // 3. If user has an active subscription, return days left in that subscription period
  if (hasActiveSub) {
    if (!endDateStr) {
      return NextResponse.json(
        {
          trialDaysLeft: 9999,
          isTrialExpired: false,
          hasActiveSub: true,
          isReadOnly: false,
          daysSinceSignup: Math.floor((now.getTime() - new Date(user.created_at).getTime()) / msPerDay),
        },
        { headers: { "Cache-Control": "no-store" } }
      )
    }

    const periodEnd = new Date(endDateStr)
    const subDaysLeft = Math.max(0, Math.ceil((periodEnd.getTime() - now.getTime()) / msPerDay))

    return NextResponse.json(
      {
        trialDaysLeft: subDaysLeft,   // days left in the purchased plan
        isTrialExpired: false,        // never expired while subscribed
        hasActiveSub: true,
        isReadOnly: false,
        daysSinceSignup: Math.floor((now.getTime() - new Date(user.created_at).getTime()) / msPerDay),
      },
      { headers: { "Cache-Control": "no-store" } }
    )
  }

  // 4. No active subscription — calculate free trial status from signup date
  const createdAt = new Date(user.created_at)
  const daysSinceSignup = Math.floor((now.getTime() - createdAt.getTime()) / msPerDay)
  const trialDaysLeft = Math.max(0, FREE_TRIAL_DAYS - daysSinceSignup)
  const isTrialExpired = daysSinceSignup >= FREE_TRIAL_DAYS

  return NextResponse.json(
    {
      trialDaysLeft,
      isTrialExpired,
      hasActiveSub: false,
      isReadOnly: isTrialExpired,
      daysSinceSignup,
    },
    { headers: { "Cache-Control": "no-store" } }
  )
}
