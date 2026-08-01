export type PushSubscriptionRow = {
  id: number
  user_id: number
  endpoint: string
  p256dh: string
  auth: string
  user_agent: string | null
  created_at: string
  updated_at: string
}

export type PushPayload = {
  title: string
  body: string
  url?: string | null
}

/** Result of a single send. "gone" means the subscription was stale and has been deleted. */
export type PushSendResult = "sent" | "gone" | "failed"

export type NotificationEventStatus = "pending" | "sent" | "failed" | "cancelled"

export type NotificationEventRow = {
  id: number
  user_id: number
  channel: string
  event_type: string
  entity_type: string | null
  entity_id: number | null
  title: string
  body: string
  url: string | null
  status: NotificationEventStatus
  attempts: number
  devices_sent: number
  last_error: string | null
  sent_at: string | null
  created_at: string
  updated_at: string
}
