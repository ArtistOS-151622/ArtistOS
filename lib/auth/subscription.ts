import { SupabaseClient } from "@supabase/supabase-js"

const FREE_TRIAL_DAYS = 30
const READ_ONLY_CACHE_TTL_MS = 60 * 1000 // 60 seconds

interface ReadOnlyCacheEntry {
  isReadOnly: boolean
  expiresAt: number
}

const readOnlyCache = new Map<string, ReadOnlyCacheEntry>()

/**
 * Invalidates the in-memory read-only cache for a specific user or completely.
 */
export function invalidateReadOnlyCache(userId?: number | string) {
  if (userId !== undefined) {
    readOnlyCache.delete(String(userId))
  } else {
    readOnlyCache.clear()
  }
}

/**
 * Checks if a user has an active subscription or is within their free trial.
 * If neither, they are in read-only mode and this function will return true (isReadOnly = true).
 * Results are cached in memory for 60 seconds to eliminate duplicate remote DB queries.
 */
export async function checkIsReadOnly(
  supabase: SupabaseClient,
  userId: number | string,
  bypassCache = false
): Promise<boolean> {
  const numUserId = Number(userId)
  const cacheKey = String(numUserId)

  if (!bypassCache) {
    const cached = readOnlyCache.get(cacheKey)
    if (cached && cached.expiresAt > Date.now()) {
      return cached.isReadOnly
    }
  }

  const userQuery = supabase
    .from("users")
    .select("created_at, is_free_user")
    .eq("id", numUserId)
  const { data: user, error: userError } = typeof (userQuery as any).maybeSingle === "function"
    ? await (userQuery as any).maybeSingle()
    : await (userQuery as any).single()

  if (userError || !user) return true // default to restricted if user not found
  if (user.is_free_user) {
    readOnlyCache.set(cacheKey, { isReadOnly: false, expiresAt: Date.now() + READ_ONLY_CACHE_TTL_MS })
    return false // free users bypass read-only mode
  }

  const now = new Date()
  const msPerDay = 1000 * 60 * 60 * 24

  const { data: activeSub } = await supabase
    .from("user_subscriptions")
    .select("status, current_period_end, next_billing_at")
    .eq("user_id", userId)
    .in("status", ["active", "pending", "halted", "cancelled"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  let isReadOnly = false

  if (activeSub) {
    if (activeSub.status === "pending") {
      // Pending means payment failed but Razorpay is retrying. Give full access.
      isReadOnly = false
    } else if (activeSub.status === "halted") {
      // Halted means retries failed. Immediately restrict access (read-only mode).
      isReadOnly = true
    } else if (activeSub.status === "cancelled") {
      // Cancelled plan: if current billing period has expired, block action (read-only mode)
      const endDateStr = activeSub.next_billing_at || activeSub.current_period_end
      if (endDateStr && new Date(endDateStr) > now) {
        isReadOnly = false // Paid period still active
      } else {
        isReadOnly = true // Paid period ended, keep in read-only mode
      }
    } else if (activeSub.status === "active") {
      // If active plan has an end date that has passed, block actions (read-only mode)
      const endDateStr = activeSub.next_billing_at || activeSub.current_period_end
      if (endDateStr && new Date(endDateStr) <= now) {
        isReadOnly = true
      } else {
        isReadOnly = false
      }
    }
  } else {
    const createdAt = new Date(user.created_at)
    const daysSinceSignup = Math.floor((now.getTime() - createdAt.getTime()) / msPerDay)
    
    // 1 month free trial (30 days): if expired, block actions and keep in read-only mode
    isReadOnly = daysSinceSignup >= FREE_TRIAL_DAYS
  }

  // Prevent unbounded memory growth over long server uptimes
  if (readOnlyCache.size > 2000) {
    readOnlyCache.clear()
  }

  readOnlyCache.set(cacheKey, { isReadOnly, expiresAt: Date.now() + READ_ONLY_CACHE_TTL_MS })
  return isReadOnly
}
