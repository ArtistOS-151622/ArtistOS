import type { SupabaseClient } from "@supabase/supabase-js"

import {
  STORAGE_FREE_TIER_BYTES,
  STORAGE_GRACE_PERIOD_DAYS,
} from "@/lib/portfolio/config"
import type {
  PortfolioStorageQuotaRow,
  QuotaInfo,
  SubscriptionStatus,
} from "@/lib/portfolio/types"
import { formatBytes } from "@/lib/portfolio/response"

export class QuotaService {
  constructor(private row: PortfolioStorageQuotaRow) {}

  static fromRow(row: PortfolioStorageQuotaRow): QuotaService {
    return new QuotaService(row)
  }

  getFreeStorageBytes(): number {
    return Number(this.row.free_storage_bytes)
  }

  getPurchaseStorageBytes(): number {
    return Number(this.row.purchase_storage_bytes)
  }

  getUsedStorageBytes(): number {
    return Number(this.row.used_storage_bytes)
  }

  getTotalAvailableBytes(): number {
    return this.getFreeStorageBytes() + this.getPurchaseStorageBytes()
  }

  getRemainingBytes(): number {
    return Math.max(0, this.getTotalAvailableBytes() - this.getUsedStorageBytes())
  }

  getSubscriptionStatus(): SubscriptionStatus {
    const purchaseBytes = this.getPurchaseStorageBytes()
    const expiresAt = this.row.expires_at

    if (!expiresAt || purchaseBytes <= 0) return "none"

    const now = Date.now()
    const expiry = new Date(expiresAt).getTime()
    const graceMs = STORAGE_GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000

    if (expiry > now) return "active"
    if (expiry + graceMs > now) return "grace"
    return "expired"
  }

  isActive(): boolean {
    return this.getSubscriptionStatus() === "active"
  }

  isInGracePeriod(): boolean {
    return this.getSubscriptionStatus() === "grace"
  }

  hasCapacity(bytes: number): boolean {
    return this.getRemainingBytes() >= bytes
  }

  canUpload(bytes: number): { allowed: boolean; reason?: string } {
    if (!this.hasCapacity(bytes)) {
      return { allowed: false, reason: "Storage quota exceeded" }
    }

    const status = this.getSubscriptionStatus()
    if (status === "expired" && this.getUsedStorageBytes() + bytes > this.getFreeStorageBytes()) {
      return { allowed: false, reason: "Your storage plan has expired" }
    }

    return { allowed: true }
  }

  getQuotaInfo(): QuotaInfo {
    const total = this.getTotalAvailableBytes()
    const used = this.getUsedStorageBytes()
    const remaining = this.getRemainingBytes()
    const status = this.getSubscriptionStatus()

    let graceEndsAt: string | null = null
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

export async function getOrCreateQuota(
  supabase: SupabaseClient,
  userId: number
): Promise<PortfolioStorageQuotaRow> {
  const { data: existing } = await supabase
    .from("portfolio_storage_quotas")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle()

  if (existing) return existing as PortfolioStorageQuotaRow

  const { data, error } = await supabase
    .from("portfolio_storage_quotas")
    .insert({
      user_id: userId,
      free_storage_bytes: STORAGE_FREE_TIER_BYTES,
    })
    .select("*")
    .single()

  if (error) throw new Error(error.message)
  return data as PortfolioStorageQuotaRow
}

export async function incrementUsage(
  supabase: SupabaseClient,
  userId: number,
  bytes: number
): Promise<void> {
  const quota = await getOrCreateQuota(supabase, userId)
  const newUsed = Number(quota.used_storage_bytes) + bytes

  const { error } = await supabase
    .from("portfolio_storage_quotas")
    .update({ used_storage_bytes: newUsed })
    .eq("user_id", userId)

  if (error) throw new Error(error.message)
}

export async function decrementUsage(
  supabase: SupabaseClient,
  userId: number,
  bytes: number
): Promise<void> {
  const quota = await getOrCreateQuota(supabase, userId)
  const newUsed = Math.max(0, Number(quota.used_storage_bytes) - bytes)

  const { error } = await supabase
    .from("portfolio_storage_quotas")
    .update({ used_storage_bytes: newUsed })
    .eq("user_id", userId)

  if (error) throw new Error(error.message)
}

export async function adjustUsage(
  supabase: SupabaseClient,
  userId: number,
  deltaBytes: number
): Promise<void> {
  if (deltaBytes > 0) {
    await incrementUsage(supabase, userId, deltaBytes)
  } else if (deltaBytes < 0) {
    await decrementUsage(supabase, userId, Math.abs(deltaBytes))
  }
}

export async function applyPurchaseToQuota(
  supabase: SupabaseClient,
  userId: number,
  storageBytes: number,
  isAddon: boolean,
  currentEndUnix?: number
): Promise<void> {
  const quota = await getOrCreateQuota(supabase, userId)
  const now = new Date()
  const newPurchaseBytes = Number(quota.purchase_storage_bytes) + storageBytes

  let expiresAt: string
  if (isAddon && quota.expires_at && new Date(quota.expires_at) > now) {
    expiresAt = quota.expires_at
  } else {
    const expiry = currentEndUnix ? new Date(currentEndUnix * 1000) : new Date(now)
    if (!currentEndUnix) {
      expiry.setDate(expiry.getDate() + 30) // Fallback default
    }
    expiresAt = expiry.toISOString()
  }

  const { error } = await supabase
    .from("portfolio_storage_quotas")
    .update({
      purchase_storage_bytes: newPurchaseBytes,
      expires_at: expiresAt,
    })
    .eq("user_id", userId)

  if (error) throw new Error(error.message)
}

export async function extendSubscriptionPeriodToDate(
  supabase: SupabaseClient,
  userId: number,
  currentEndUnix: number
): Promise<void> {
  const quota = await getOrCreateQuota(supabase, userId)
  
  const exactEndDate = new Date(currentEndUnix * 1000)

  // Only update if the new date is actually in the future compared to current expiry (handles out of order webhooks)
  const currentExpiry = quota.expires_at ? new Date(quota.expires_at) : new Date(0)
  if (exactEndDate <= currentExpiry) {
    return
  }

  const { error } = await supabase
    .from("portfolio_storage_quotas")
    .update({ expires_at: exactEndDate.toISOString() })
    .eq("user_id", userId)

  if (error) throw new Error(error.message)
}
