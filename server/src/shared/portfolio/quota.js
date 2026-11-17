import { FREE_USER_STORAGE_BYTES, STORAGE_FREE_TIER_BYTES, STORAGE_GRACE_PERIOD_DAYS } from "#src/shared/portfolio/config.js"
import { formatBytes } from "#src/utils/format-bytes.js"

/*
 * portfolio_storage_quotas row: { id, user_id, free_storage_bytes, purchase_storage_bytes,
 *   used_storage_bytes, folder_view, file_view, expires_at, created_at, updated_at }
 * Purchased-storage status: "none" | "active" | "grace" | "expired".
 */

const MB = 1024 * 1024
const DAY_MS = 24 * 60 * 60 * 1000
const QUOTAS_TABLE = "portfolio_storage_quotas"

export class QuotaService {
  constructor(row) {
    this.row = row
  }

  static fromRow(row) {
    return new QuotaService(row)
  }

  getFreeStorageBytes() {
    return Math.max(Number(this.row.free_storage_bytes || 0), STORAGE_FREE_TIER_BYTES)
  }

  getPurchaseStorageBytes() {
    return Number(this.row.purchase_storage_bytes)
  }

  getUsedStorageBytes() {
    return Number(this.row.used_storage_bytes)
  }

  getTotalAvailableBytes() {
    return this.getFreeStorageBytes() + this.getPurchaseStorageBytes()
  }

  getRemainingBytes() {
    return Math.max(0, this.getTotalAvailableBytes() - this.getUsedStorageBytes())
  }

  getSubscriptionStatus() {
    const expiresAt = this.row.expires_at
    if (!expiresAt || this.getPurchaseStorageBytes() <= 0) return "none"

    const now = Date.now()
    const expiry = new Date(expiresAt).getTime()
    if (expiry > now) return "active"
    if (expiry + STORAGE_GRACE_PERIOD_DAYS * DAY_MS > now) return "grace"
    return "expired"
  }

  isActive() {
    return this.getSubscriptionStatus() === "active"
  }

  isInGracePeriod() {
    return this.getSubscriptionStatus() === "grace"
  }

  hasCapacity(bytes) {
    return this.getRemainingBytes() >= bytes
  }

  /** → { allowed, reason? } */
  canUpload(bytes) {
    if (!this.hasCapacity(bytes)) return { allowed: false, reason: "Storage quota exceeded" }

    if (this.getSubscriptionStatus() === "expired" && this.getUsedStorageBytes() + bytes > this.getFreeStorageBytes()) {
      return { allowed: false, reason: "Your storage plan has expired" }
    }
    return { allowed: true }
  }

  /** The storage summary the frontend renders (sizes in bytes plus human-readable strings). */
  getQuotaInfo() {
    const total = this.getTotalAvailableBytes()
    const used = this.getUsedStorageBytes()
    const remaining = this.getRemainingBytes()
    const status = this.getSubscriptionStatus()

    let graceEndsAt = null
    if (this.row.expires_at && status !== "none" && status !== "active") {
      const graceEnd = new Date(this.row.expires_at)
      graceEnd.setDate(graceEnd.getDate() + STORAGE_GRACE_PERIOD_DAYS)
      graceEndsAt = graceEnd.toISOString()
    }

    return {
      free_bytes: this.getFreeStorageBytes(),
      purchase_bytes: this.getPurchaseStorageBytes(),
      total_bytes: total,
      used_bytes: used,
      remaining_bytes: remaining,
      percentage_used: total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0,
      subscription_status: status,
      expires_at: this.row.expires_at,
      grace_ends_at: graceEndsAt,
      folder_view: this.row.folder_view,
      file_view: this.row.file_view,
      free_bytes_human: formatBytes(this.getFreeStorageBytes()),
      total_bytes_human: formatBytes(total),
      used_bytes_human: formatBytes(used),
      remaining_bytes_human: formatBytes(remaining),
    }
  }
}

/**
 * The user's quota row, created if missing, with free_storage_bytes synced to what
 * they're entitled to: admin custom override > free (lifetime) user 500 MB > active
 * paid plan's storage > free tier.
 */
export async function getOrCreateQuota(supabase, userId) {
  const numUserId = Number(userId)

  // Independent reads: load together.
  const [userRes, existingRes, activeSubRes] = await Promise.all([
    supabase.from("users").select("is_free_user, custom_storage_bytes").eq("id", numUserId).maybeSingle(),
    supabase.from(QUOTAS_TABLE).select("*").eq("user_id", numUserId).maybeSingle(),
    supabase
      .from("user_subscriptions")
      .select("status, platform_subscriptions(storage_quota_mb, has_whatsapp_automation)")
      .eq("user_id", numUserId)
      .in("status", ["active", "pending"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  const user = userRes.data
  const isFree = Boolean(user?.is_free_user)
  const customStorageBytes =
    user?.custom_storage_bytes !== null && user?.custom_storage_bytes !== undefined
      ? Number(user.custom_storage_bytes)
      : null

  const targetFreeBytes =
    customStorageBytes !== null ? customStorageBytes : isFree ? FREE_USER_STORAGE_BYTES : STORAGE_FREE_TIER_BYTES

  const existing = existingRes.data

  if (existing) {
    const setFreeBytes = async (bytes) => {
      await supabase.from(QUOTAS_TABLE).update({ free_storage_bytes: bytes }).eq("id", existing.id)
      existing.free_storage_bytes = bytes
    }
    const currentFree = Number(existing.free_storage_bytes || 0)

    if (customStorageBytes !== null) {
      if (currentFree !== customStorageBytes) await setFreeBytes(customStorageBytes)
    } else if (isFree && currentFree < targetFreeBytes) {
      await setFreeBytes(targetFreeBytes)
    } else if (!isFree) {
      const activeSub = activeSubRes.data
      const plan = activeSub?.platform_subscriptions
      let allowedFreeBytes = STORAGE_FREE_TIER_BYTES
      if (activeSub && plan) {
        allowedFreeBytes = (Number(plan.storage_quota_mb) || (plan.has_whatsapp_automation ? 500 : 100)) * MB
      }
      if (currentFree !== allowedFreeBytes) await setFreeBytes(allowedFreeBytes)
    }

    if (isFree) {
      existing.free_storage_bytes = Math.max(Number(existing.free_storage_bytes || 0), targetFreeBytes)
    }
    return existing
  }

  const { data, error } = await supabase
    .from(QUOTAS_TABLE)
    .insert({ user_id: numUserId, free_storage_bytes: targetFreeBytes })
    .select("*")
    .single()

  if (error) {
    // A concurrent request may have created it.
    const { data: retry } = await supabase.from(QUOTAS_TABLE).select("*").eq("user_id", numUserId).maybeSingle()
    if (retry) {
      if (isFree) retry.free_storage_bytes = Math.max(Number(retry.free_storage_bytes || 0), targetFreeBytes)
      return retry
    }
    throw new Error(error.message)
  }
  return data
}

async function setUsedBytes(supabase, userId, bytes) {
  const { error } = await supabase.from(QUOTAS_TABLE).update({ used_storage_bytes: bytes }).eq("user_id", userId)
  if (error) throw new Error(error.message)
}

export async function incrementUsage(supabase, userId, bytes) {
  const quota = await getOrCreateQuota(supabase, userId)
  await setUsedBytes(supabase, userId, Number(quota.used_storage_bytes) + bytes)
}

export async function decrementUsage(supabase, userId, bytes) {
  const quota = await getOrCreateQuota(supabase, userId)
  await setUsedBytes(supabase, userId, Math.max(0, Number(quota.used_storage_bytes) - bytes))
}

export async function adjustUsage(supabase, userId, deltaBytes) {
  if (deltaBytes > 0) await incrementUsage(supabase, userId, deltaBytes)
  else if (deltaBytes < 0) await decrementUsage(supabase, userId, Math.abs(deltaBytes))
}

/**
 * Moves the purchased-storage expiry to `currentEndUnix` (seconds), only forwards
 * (out-of-order webhooks can't shorten it).
 */
export async function extendSubscriptionPeriodToDate(supabase, userId, currentEndUnix) {
  const quota = await getOrCreateQuota(supabase, userId)
  const exactEndDate = new Date(currentEndUnix * 1000)
  const currentExpiry = quota.expires_at ? new Date(quota.expires_at) : new Date(0)
  if (exactEndDate <= currentExpiry) return

  const { error } = await supabase
    .from(QUOTAS_TABLE)
    .update({ expires_at: exactEndDate.toISOString() })
    .eq("user_id", userId)
  if (error) throw new Error(error.message)
}
