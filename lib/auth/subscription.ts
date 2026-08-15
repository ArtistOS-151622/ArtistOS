import { SupabaseClient } from "@supabase/supabase-js"

const FREE_TRIAL_DAYS = 30

/**
 * Checks if a user has an active subscription or is within their free trial.
 * If neither, they are in read-only mode and this function will return true (isReadOnly = true).
 */
export async function checkIsReadOnly(supabase: SupabaseClient, userId: number): Promise<boolean> {
  const { data: user, error: userError } = await supabase
    .from("users")
    .select("created_at, is_test_user")
    .eq("id", userId)
    .single()

  if (userError || !user) return true // default to restricted if user not found
  if (user.is_test_user) return false // test users bypass read-only mode

  const now = new Date()
  const msPerDay = 1000 * 60 * 60 * 24

  const { data: activeSub } = await supabase
    .from("user_subscriptions")
    .select("current_period_end")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("current_period_end", { ascending: false })
    .limit(1)
    .maybeSingle()

  const hasActiveSub =
    !!activeSub &&
    (!activeSub.current_period_end || new Date(activeSub.current_period_end) > now)

  if (hasActiveSub) return false // Active sub = not read only

  const createdAt = new Date(user.created_at)
  const daysSinceSignup = Math.floor((now.getTime() - createdAt.getTime()) / msPerDay)
  
  // If no active sub, they are read-only if their trial is expired
  return daysSinceSignup >= FREE_TRIAL_DAYS
}
