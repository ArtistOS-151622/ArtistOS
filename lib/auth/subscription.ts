import { SupabaseClient } from "@supabase/supabase-js"

const FREE_TRIAL_DAYS = 30

/**
 * Checks if a user has an active subscription or is within their free trial.
 * If neither, they are in read-only mode and this function will return true (isReadOnly = true).
 */
export async function checkIsReadOnly(supabase: SupabaseClient, userId: number | string): Promise<boolean> {
  const numUserId = Number(userId)
  const userQuery = supabase
    .from("users")
    .select("created_at, is_free_user")
    .eq("id", numUserId)
  const { data: user, error: userError } = typeof (userQuery as any).maybeSingle === "function"
    ? await (userQuery as any).maybeSingle()
    : await (userQuery as any).single()

  if (userError || !user) return true // default to restricted if user not found
  if (user.is_free_user) return false // free users bypass read-only mode

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

  if (activeSub) {
    if (activeSub.status === "pending") {
      // Pending means payment failed but Razorpay is retrying. Give full access.
      return false
    }

    if (activeSub.status === "halted") {
      // Halted means retries failed. Immediately restrict access (read-only mode).
      return true
    }

    if (activeSub.status === "cancelled") {
      // Cancelled plan: if current billing period has expired, block action (read-only mode)
      const endDateStr = activeSub.next_billing_at || activeSub.current_period_end
      if (endDateStr && new Date(endDateStr) > now) {
        return false // Paid period still active
      }
      return true // Paid period ended, keep in read-only mode
    }

    if (activeSub.status === "active") {
      // If active plan has an end date that has passed, block actions (read-only mode)
      const endDateStr = activeSub.next_billing_at || activeSub.current_period_end
      if (endDateStr && new Date(endDateStr) <= now) {
        return true
      }
      return false
    }
  }

  const createdAt = new Date(user.created_at)
  const daysSinceSignup = Math.floor((now.getTime() - createdAt.getTime()) / msPerDay)
  
  // 1 month free trial (30 days): if expired, block actions and keep in read-only mode
  return daysSinceSignup >= FREE_TRIAL_DAYS
}
