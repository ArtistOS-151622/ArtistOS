import { FREE_TRIAL_DAYS } from "#src/shared/subscription/plan-features.js"

const READ_ONLY_CACHE_TTL_MS = 60 * 1000
const READ_ONLY_CACHE_MAX_ENTRIES = 2000
const MS_PER_DAY = 1000 * 60 * 60 * 24

// userId → { isReadOnly, expiresAt }. One long-lived process on Render, so this
// cache is shared by every request (on Vercel it was per serverless instance).
const readOnlyCache = new Map()

/** Drops one user's cached result, or all of them. */
export function invalidateReadOnlyCache(userId) {
  if (userId !== undefined) readOnlyCache.delete(String(userId))
  else readOnlyCache.clear()
}

function evaluateSubscription(activeSub, now) {
  const endDateStr = activeSub.next_billing_at || activeSub.current_period_end
  switch (activeSub.status) {
    case "pending":
      // Payment failed but Razorpay is retrying: full access.
      return false
    case "halted":
      // Retries failed: read-only.
      return true
    case "cancelled":
      // Read-only once the paid period has ended.
      return !(endDateStr && new Date(endDateStr) > now)
    case "active":
      // Read-only once past the end date without renewal.
      return Boolean(endDateStr && new Date(endDateStr) <= now)
    default:
      return false
  }
}

/**
 * True when the user has neither an active subscription nor a running free trial
 * (they can read but not write). Cached for 60 s per user unless `bypassCache`.
 */
export async function checkIsReadOnly(supabase, userId, bypassCache = false) {
  const numUserId = Number(userId)
  const cacheKey = String(numUserId)

  if (!bypassCache) {
    const cached = readOnlyCache.get(cacheKey)
    if (cached && cached.expiresAt > Date.now()) return cached.isReadOnly
  }

  const userQuery = supabase.from("users").select("created_at, is_free_user").eq("id", numUserId)
  const { data: user, error: userError } =
    typeof userQuery.maybeSingle === "function" ? await userQuery.maybeSingle() : await userQuery.single()

  if (userError || !user) return true // unknown user → restricted

  let isReadOnly = false
  if (!user.is_free_user) {
    const now = new Date()
    const { data: activeSub } = await supabase
      .from("user_subscriptions")
      .select("status, current_period_end, next_billing_at")
      .eq("user_id", userId)
      .in("status", ["active", "pending", "halted", "cancelled"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (activeSub) {
      isReadOnly = evaluateSubscription(activeSub, now)
    } else {
      const daysSinceSignup = Math.floor((now.getTime() - new Date(user.created_at).getTime()) / MS_PER_DAY)
      isReadOnly = daysSinceSignup >= FREE_TRIAL_DAYS
    }
  }

  // Bound memory over long uptimes.
  if (readOnlyCache.size > READ_ONLY_CACHE_MAX_ENTRIES) readOnlyCache.clear()
  readOnlyCache.set(cacheKey, { isReadOnly, expiresAt: Date.now() + READ_ONLY_CACHE_TTL_MS })
  return isReadOnly
}
