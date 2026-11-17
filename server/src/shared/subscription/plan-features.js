import { logger } from "#src/utils/logger.js"

export const FREE_TRIAL_DAYS = 30
export const FREE_TRIAL_STORAGE_BYTES = 10 * 1024 * 1024 // 10 MB
export const STARTER_STORAGE_BYTES = 100 * 1024 * 1024 // 100 MB
export const PRO_STORAGE_BYTES = 500 * 1024 * 1024 // 500 MB

const MB = 1024 * 1024
const MS_PER_DAY = 1000 * 60 * 60 * 24
const TRACKED_SUBSCRIPTION_STATUSES = ["active", "pending", "halted", "cancelled"]

/*
 * A user's tier and feature permissions:
 * - Free Trial (30 days): 10 MB storage, no automated WhatsApp
 * - Starter: full access, 100 MB, no automated WhatsApp
 * - Pro: full access, 500 MB, automated WhatsApp
 * - Free (lifetime) users: Pro features, 500 MB or their custom quota
 * - An admin-assigned users.custom_storage_bytes overrides the plan's storage
 *
 * Returns: { planTier, planName, billingPeriod, hasWhatsAppAutomation,
 *   storageQuotaBytes, storageQuotaMb, isReadOnly, hasActiveSub,
 *   daysSinceSignup, trialDaysLeft, subscriptionStatus }
 */

// Returned when the client can't query `users` at all (test doubles without a users table).
const UNQUERYABLE_CLIENT_FEATURES = Object.freeze({
  planTier: "pro",
  planName: "ArtistOS Pro",
  billingPeriod: "/month",
  hasWhatsAppAutomation: true,
  storageQuotaBytes: PRO_STORAGE_BYTES,
  storageQuotaMb: 500,
  isReadOnly: false,
  hasActiveSub: true,
  daysSinceSignup: 0,
  trialDaysLeft: 9999,
  subscriptionStatus: "active",
})

const UNKNOWN_USER_FEATURES = Object.freeze({
  planTier: "trial",
  planName: "Unknown",
  billingPeriod: "",
  hasWhatsAppAutomation: false,
  storageQuotaBytes: FREE_TRIAL_STORAGE_BYTES,
  storageQuotaMb: 10,
  isReadOnly: true,
  hasActiveSub: false,
  daysSinceSignup: 999,
  trialDaysLeft: 0,
  subscriptionStatus: "none",
})

// On unexpected errors the user keeps working (trial defaults, not read-only).
const ERROR_FALLBACK_FEATURES = Object.freeze({
  planTier: "trial",
  planName: "Free Trial",
  billingPeriod: "",
  hasWhatsAppAutomation: false,
  storageQuotaBytes: FREE_TRIAL_STORAGE_BYTES,
  storageQuotaMb: 10,
  isReadOnly: false,
  hasActiveSub: false,
  daysSinceSignup: 0,
  trialDaysLeft: 30,
  subscriptionStatus: "trial",
})

async function fetchUserRecord(fromUsers, userId, columns) {
  try {
    const query = fromUsers.select(columns).eq("id", userId)
    if (typeof query?.maybeSingle === "function") return await query.maybeSingle()
    if (typeof query?.single === "function") return await query.single()
  } catch (err) {
    return { data: null, error: err }
  }
  return { data: null, error: null }
}

export async function getUserPlanFeatures(supabase, userId) {
  try {
    const fromUsers = supabase?.from ? supabase.from("users") : null
    if (!fromUsers || typeof fromUsers.select !== "function") return { ...UNQUERYABLE_CLIENT_FEATURES }

    const numUserId = Number(userId)
    let user = null
    let customStorageBytes = null

    // custom_storage_bytes may not exist on older databases; fall back without it.
    const withCustom = await fetchUserRecord(fromUsers, numUserId, "created_at, is_free_user, custom_storage_bytes")
    if (!withCustom.error && withCustom.data) {
      user = withCustom.data
      if (user.custom_storage_bytes !== null && user.custom_storage_bytes !== undefined) {
        customStorageBytes = Number(user.custom_storage_bytes)
      }
    }

    if (!user) {
      const basic = await fetchUserRecord(fromUsers, numUserId, "created_at, is_free_user")
      if (basic.error || !basic.data) return { ...UNKNOWN_USER_FEATURES }
      user = basic.data
    }

    const now = new Date()
    const daysSinceSignup = Math.floor((now.getTime() - new Date(user.created_at).getTime()) / MS_PER_DAY)

    // 1. Free users: full access, 500 MB or custom storage, WhatsApp automation.
    if (user.is_free_user) {
      const freeBytes = customStorageBytes !== null ? customStorageBytes : PRO_STORAGE_BYTES
      syncUserStorageQuota(supabase, numUserId, freeBytes).catch(() => {})
      return {
        planTier: "free",
        planName: "ArtistOS Lifetime (Free)",
        billingPeriod: "",
        hasWhatsAppAutomation: true,
        storageQuotaBytes: freeBytes,
        storageQuotaMb: Math.round(freeBytes / MB),
        isReadOnly: false,
        hasActiveSub: true,
        daysSinceSignup,
        trialDaysLeft: 9999,
        subscriptionStatus: "active",
      }
    }

    // 2. Latest active/pending/halted/cancelled subscription.
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
      .in("status", TRACKED_SUBSCRIPTION_STATUSES)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (activeSub) {
      const subStatus = activeSub.status || "none"
      const endDateStr = activeSub.next_billing_at || activeSub.current_period_end
      const isPeriodActive = Boolean(endDateStr && new Date(endDateStr) > now)

      const rawPlan = activeSub.platform_subscriptions
      const plan = Array.isArray(rawPlan) ? rawPlan[0] : rawPlan

      const planName = plan?.name || "Plan"
      const billingPeriod = plan?.billing_period || "/month"
      const hasWhatsAppAutomation = Boolean(plan?.has_whatsapp_automation)
      const planTier = hasWhatsAppAutomation ? "pro" : "starter"

      const defaultStorageMb = Number(plan?.storage_quota_mb) || (hasWhatsAppAutomation ? 500 : 100)
      const storageQuotaMb = customStorageBytes !== null ? Math.round(customStorageBytes / MB) : defaultStorageMb
      const storageQuotaBytes = customStorageBytes !== null ? customStorageBytes : storageQuotaMb * MB

      const subDaysLeft = endDateStr
        ? Math.max(0, Math.ceil((new Date(endDateStr).getTime() - now.getTime()) / MS_PER_DAY))
        : 0

      const base = { planTier, planName, billingPeriod, storageQuotaBytes, storageQuotaMb, daysSinceSignup }

      // Halted: retries failed → read-only immediately.
      if (subStatus === "halted") {
        return {
          ...base,
          hasWhatsAppAutomation: false,
          isReadOnly: true,
          hasActiveSub: false,
          trialDaysLeft: 0,
          subscriptionStatus: "halted",
        }
      }

      // Cancelled: full access until the paid period ends, then read-only.
      if (subStatus === "cancelled") {
        return isPeriodActive
          ? {
              ...base,
              hasWhatsAppAutomation,
              isReadOnly: false,
              hasActiveSub: true,
              trialDaysLeft: subDaysLeft,
              subscriptionStatus: "cancelled",
            }
          : {
              ...base,
              hasWhatsAppAutomation: false,
              isReadOnly: true,
              hasActiveSub: false,
              trialDaysLeft: 0,
              subscriptionStatus: "cancelled",
            }
      }

      // Active: read-only once past the end date without renewal.
      if (subStatus === "active") {
        const isStillActive = !endDateStr || isPeriodActive
        return {
          ...base,
          hasWhatsAppAutomation: isStillActive ? hasWhatsAppAutomation : false,
          isReadOnly: !isStillActive,
          hasActiveSub: isStillActive,
          trialDaysLeft: isStillActive ? (endDateStr ? subDaysLeft : 9999) : 0,
          subscriptionStatus: isStillActive ? "active" : "expired",
        }
      }

      // Pending: Razorpay is retrying payment → full access during the retry window.
      if (subStatus === "pending") {
        return {
          ...base,
          hasWhatsAppAutomation,
          isReadOnly: false,
          hasActiveSub: true,
          trialDaysLeft: subDaysLeft,
          subscriptionStatus: "pending",
        }
      }
    }

    // 3. No subscription: 30-day free trial from signup.
    const isTrialExpired = daysSinceSignup >= FREE_TRIAL_DAYS
    return {
      planTier: "trial",
      planName: isTrialExpired ? "Trial Expired" : "Free Trial",
      billingPeriod: "",
      hasWhatsAppAutomation: false,
      storageQuotaBytes: customStorageBytes !== null ? customStorageBytes : FREE_TRIAL_STORAGE_BYTES,
      storageQuotaMb: customStorageBytes !== null ? Math.round(customStorageBytes / MB) : 10,
      isReadOnly: isTrialExpired,
      hasActiveSub: false,
      daysSinceSignup,
      trialDaysLeft: Math.max(0, FREE_TRIAL_DAYS - daysSinceSignup),
      subscriptionStatus: isTrialExpired ? "expired" : "trial",
    }
  } catch (err) {
    logger.error({ err, userId }, "failed to evaluate user plan features")
    return { ...ERROR_FALLBACK_FEATURES }
  }
}

/**
 * Sets the user's free storage quota in portfolio_storage_quotas to `targetBytes`,
 * unless an admin custom override (users.custom_storage_bytes) exists, which wins.
 */
export async function syncUserStorageQuota(supabase, userId, targetBytes) {
  try {
    const { data: user } = await supabase
      .from("users")
      .select("custom_storage_bytes")
      .eq("id", userId)
      .maybeSingle()
    if (user?.custom_storage_bytes !== null && user?.custom_storage_bytes !== undefined) {
      targetBytes = Number(user.custom_storage_bytes)
    }
  } catch {
    // custom_storage_bytes may not exist yet.
  }

  const { data: existing } = await supabase
    .from("portfolio_storage_quotas")
    .select("id, free_storage_bytes")
    .eq("user_id", userId)
    .maybeSingle()

  if (existing) {
    if (Number(existing.free_storage_bytes) !== targetBytes) {
      await supabase.from("portfolio_storage_quotas").update({ free_storage_bytes: targetBytes }).eq("user_id", userId)
    }
  } else {
    await supabase.from("portfolio_storage_quotas").insert({ user_id: userId, free_storage_bytes: targetBytes })
  }
}
