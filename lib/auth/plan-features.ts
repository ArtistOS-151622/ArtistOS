import { SupabaseClient } from "@supabase/supabase-js"

export const FREE_TRIAL_DAYS = 30
export const STARTER_STORAGE_BYTES = 10 * 1024 * 1024 // 10 MB = 10,485,760 bytes
export const PRO_STORAGE_BYTES = 100 * 1024 * 1024 // 100 MB = 104,857,600 bytes

export type PlanTier = "trial" | "starter" | "pro" | "free" | "test"

export interface UserPlanFeatures {
  planTier: PlanTier
  planName: string
  billingPeriod: string
  hasWhatsAppAutomation: boolean
  storageQuotaBytes: number
  storageQuotaMb: number
  isReadOnly: boolean
  hasActiveSub: boolean
  daysSinceSignup: number
  trialDaysLeft: number
  subscriptionStatus: string
}

/**
 * Determines a user's active tier and feature permissions:
 * - Starter (299/mo or 2999/yr): Full access, 10 MB storage, NO WhatsApp automated messages (create, confirm, 24h reminder)
 * - Pro (599/mo or 6999/yr): Full access, 100 MB storage, INCLUDES WhatsApp automated messages
 * - OTP Verification: Available for everyone
 * - Test users: Full access (Pro tier features)
 */
export async function getUserPlanFeatures(
  supabase: SupabaseClient,
  userId: number
): Promise<UserPlanFeatures> {
  try {
    const fromUsers = supabase?.from ? supabase.from("users") : null
    if (!fromUsers || typeof fromUsers.select !== "function") {
      return {
        planTier: "pro",
        planName: "ArtistOS Pro",
        billingPeriod: "/month",
        hasWhatsAppAutomation: true,
        storageQuotaBytes: PRO_STORAGE_BYTES,
        storageQuotaMb: 100,
        isReadOnly: false,
        hasActiveSub: true,
        daysSinceSignup: 0,
        trialDaysLeft: 9999,
        subscriptionStatus: "active",
      }
    }

    const numUserId = Number(userId)
    const userQuery = fromUsers
      .select("created_at, is_free_user")
      .eq("id", numUserId)
    const { data: user, error: userError } = typeof (userQuery as any).maybeSingle === "function"
      ? await (userQuery as any).maybeSingle()
      : await (userQuery as any).single()

    const now = new Date()
    const msPerDay = 1000 * 60 * 60 * 24

    if (userError || !user) {
      return {
        planTier: "trial",
        planName: "Unknown",
        billingPeriod: "",
        hasWhatsAppAutomation: false,
        storageQuotaBytes: STARTER_STORAGE_BYTES,
        storageQuotaMb: 10,
        isReadOnly: true,
        hasActiveSub: false,
        daysSinceSignup: 999,
        trialDaysLeft: 0,
        subscriptionStatus: "none",
      }
    }

    // 1. Free Users bypass all restrictions (Full access: 100MB storage, WhatsApp automation, no billing required)
    if (user.is_free_user) {
      // Opportunistically ensure storage quota row has 100 MB
      syncUserStorageQuota(supabase, numUserId, PRO_STORAGE_BYTES).catch(() => {})
      return {
        planTier: "free",
        planName: "ArtistOS Lifetime (Free)",
        billingPeriod: "",
        hasWhatsAppAutomation: true,
        storageQuotaBytes: PRO_STORAGE_BYTES,
        storageQuotaMb: 100,
        isReadOnly: false,
        hasActiveSub: true,
        daysSinceSignup: Math.floor((now.getTime() - new Date(user.created_at).getTime()) / msPerDay),
        trialDaysLeft: 9999,
        subscriptionStatus: "active",
      }
    }

  // 2. Fetch active/pending/halted subscription
  const { data: activeSub } = await supabase
    .from("user_subscriptions")
    .select(`
      id,
      status,
      current_period_end,
      next_billing_at,
      platform_subscriptions (
        id,
        name,
        amount_inr,
        billing_period,
        has_whatsapp_automation,
        storage_quota_mb,
        features
      )
    `)
    .eq("user_id", userId)
    .in("status", ["active", "pending", "halted", "cancelled"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  const subStatus = activeSub?.status || "none"
  const endDateStr = activeSub?.next_billing_at || activeSub?.current_period_end
  const isPending = subStatus === "pending"
  const isPeriodActive = Boolean(endDateStr && new Date(endDateStr) > now)

  const daysSinceSignup = Math.floor(
    (now.getTime() - new Date(user.created_at).getTime()) / msPerDay
  )

  if (activeSub) {
    const rawPlan = activeSub.platform_subscriptions
    const plan = Array.isArray(rawPlan) ? rawPlan[0] : rawPlan

    const planName = plan?.name || "Plan"
    const billingPeriod = plan?.billing_period || "/month"

    const hasWhatsAppAutomation = Boolean(plan?.has_whatsapp_automation)
    const storageQuotaMb = Number(plan?.storage_quota_mb) || (hasWhatsAppAutomation ? 100 : 10)
    const storageQuotaBytes = storageQuotaMb * 1024 * 1024

    let subDaysLeft = 0
    if (endDateStr) {
      const periodEnd = new Date(endDateStr)
      subDaysLeft = Math.max(0, Math.ceil((periodEnd.getTime() - now.getTime()) / msPerDay))
    }

    // 1. Halted subscription -> Immediately block actions, keep in read-only mode
    if (subStatus === "halted") {
      return {
        planTier: hasWhatsAppAutomation ? "pro" : "starter",
        planName,
        billingPeriod,
        hasWhatsAppAutomation: false,
        storageQuotaBytes,
        storageQuotaMb,
        isReadOnly: true,
        hasActiveSub: false,
        daysSinceSignup,
        trialDaysLeft: 0,
        subscriptionStatus: "halted",
      }
    }

    // 2. Cancelled subscription -> If billing period ended, block actions in read-only mode
    if (subStatus === "cancelled") {
      if (isPeriodActive) {
        return {
          planTier: hasWhatsAppAutomation ? "pro" : "starter",
          planName,
          billingPeriod,
          hasWhatsAppAutomation,
          storageQuotaBytes,
          storageQuotaMb,
          isReadOnly: false,
          hasActiveSub: true,
          daysSinceSignup,
          trialDaysLeft: subDaysLeft,
          subscriptionStatus: "cancelled",
        }
      } else {
        return {
          planTier: hasWhatsAppAutomation ? "pro" : "starter",
          planName,
          billingPeriod,
          hasWhatsAppAutomation: false,
          storageQuotaBytes,
          storageQuotaMb,
          isReadOnly: true,
          hasActiveSub: false,
          daysSinceSignup,
          trialDaysLeft: 0,
          subscriptionStatus: "cancelled",
        }
      }
    }

    // 3. Active subscription -> If past end date without renewal, block actions in read-only mode
    if (subStatus === "active") {
      const isStillActive = !endDateStr || isPeriodActive
      return {
        planTier: hasWhatsAppAutomation ? "pro" : "starter",
        planName,
        billingPeriod,
        hasWhatsAppAutomation: isStillActive ? hasWhatsAppAutomation : false,
        storageQuotaBytes,
        storageQuotaMb,
        isReadOnly: !isStillActive,
        hasActiveSub: isStillActive,
        daysSinceSignup,
        trialDaysLeft: isStillActive ? (endDateStr ? subDaysLeft : 9999) : 0,
        subscriptionStatus: isStillActive ? "active" : "expired",
      }
    }

    // 4. Pending payment retry -> full access during retry window
    if (isPending) {
      return {
        planTier: hasWhatsAppAutomation ? "pro" : "starter",
        planName,
        billingPeriod,
        hasWhatsAppAutomation,
        storageQuotaBytes,
        storageQuotaMb,
        isReadOnly: false,
        hasActiveSub: true,
        daysSinceSignup,
        trialDaysLeft: subDaysLeft,
        subscriptionStatus: "pending",
      }
    }
  }

  // 5. 1-Month Free Trial check (30 days from signup)
  const isTrialExpired = daysSinceSignup >= FREE_TRIAL_DAYS
  const trialDaysLeft = Math.max(0, FREE_TRIAL_DAYS - daysSinceSignup)

  return {
    planTier: "trial",
    planName: isTrialExpired ? "Trial Expired" : "Free Trial",
    billingPeriod: "",
    hasWhatsAppAutomation: false,
    storageQuotaBytes: STARTER_STORAGE_BYTES,
    storageQuotaMb: 10,
    isReadOnly: isTrialExpired,
    hasActiveSub: false,
    daysSinceSignup,
    trialDaysLeft,
    subscriptionStatus: isTrialExpired ? "expired" : "trial",
  }
} catch (err) {
  console.error("Error evaluating user plan features:", err)
  return {
    planTier: "trial",
    planName: "Free Trial",
    billingPeriod: "",
    hasWhatsAppAutomation: false,
    storageQuotaBytes: STARTER_STORAGE_BYTES,
    storageQuotaMb: 10,
    isReadOnly: false,
    hasActiveSub: false,
    daysSinceSignup: 0,
    trialDaysLeft: 30,
    subscriptionStatus: "trial",
  }
}
}

/**
 * Updates a user's free storage quota in `portfolio_storage_quotas`
 * based on their active plan tier (10 MB vs 100 MB).
 */
export async function syncUserStorageQuota(
  supabase: SupabaseClient,
  userId: number,
  targetBytes: number
): Promise<void> {
  const { data: existing } = await supabase
    .from("portfolio_storage_quotas")
    .select("id, free_storage_bytes")
    .eq("user_id", userId)
    .maybeSingle()

  if (existing) {
    if (Number(existing.free_storage_bytes) !== targetBytes) {
      await supabase
        .from("portfolio_storage_quotas")
        .update({ free_storage_bytes: targetBytes })
        .eq("user_id", userId)
    }
  } else {
    await supabase.from("portfolio_storage_quotas").insert({
      user_id: userId,
      free_storage_bytes: targetBytes,
    })
  }
}
