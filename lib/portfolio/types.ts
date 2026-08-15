export type SubscriptionStatus = "none" | "active" | "grace" | "expired"

export type PortfolioFolderRow = {
  id: number
  uuid: string
  user_id: number
  booking_id: number | null
  name: string
  description: string | null
  is_shared: boolean
  shared_expires_at: string | null
  created_by: number
  sort_order: number
  created_at: string
  updated_at: string
}

export type PortfolioFileRow = {
  id: number
  user_id: number
  folder_id: number
  section: string | null
  original_name: string
  storage_path: string
  mime_type: string
  extension: string
  file_size: number
  sort_order: number
  uploaded_by: number
  created_at: string
  updated_at: string
}

export type PortfolioStorageQuotaRow = {
  id: number
  user_id: number
  free_storage_bytes: number
  purchase_storage_bytes: number
  used_storage_bytes: number
  folder_view: string
  file_view: string
  expires_at: string | null
  created_at: string
  updated_at: string
}

export type StoragePlanRow = {
  id: number
  name: string
  storage_bytes: number
  price_inr: number
  razorpay_plan_id: string | null
  is_active: boolean
  sort_order: number
}

export type QuotaInfo = {
  free_bytes: number
  purchase_bytes: number
  total_bytes: number
  used_bytes: number
  remaining_bytes: number
  percentage_used: number
  subscription_status: SubscriptionStatus
  expires_at: string | null
  grace_ends_at: string | null
  folder_view: string
  file_view: string
  free_bytes_human: string
  total_bytes_human: string
  used_bytes_human: string
  remaining_bytes_human: string
}

export type PortfolioFileWithUrl = PortfolioFileRow & {
  public_url: string
}

export type PortfolioFolderWithStats = PortfolioFolderRow & {
  file_count?: number
  total_size?: number
  share_url?: string | null
  preview_files?: { id: number; public_url: string; mime_type: string }[]
}
