import useSWR, { mutate } from "swr"

/** Unread notifications + new inquiries, for the sidebar and topbar badges. */
export const BADGES_URL = "/api/badges"
const BADGES_POLL_MS = 60_000

type BadgeCounts = {
  unread_notifications: number
  pending_inquiries: number
}

/** Every badge reads this one cache key, so the app polls once a minute in total. */
export function useBadges() {
  const { data } = useSWR<BadgeCounts>(BADGES_URL, { refreshInterval: BADGES_POLL_MS })
  return {
    unreadNotifications: data?.unread_notifications ?? 0,
    pendingInquiries: data?.pending_inquiries ?? 0,
  }
}

/** Refetch the counts now, e.g. after an inquiry is converted or cancelled. */
export function refreshBadges() {
  void mutate(BADGES_URL)
}

/** Update the unread count instantly (optimistic), without a request. */
export function updateUnreadNotifications(update: (count: number) => number) {
  void mutate<BadgeCounts>(
    BADGES_URL,
    (current) => current && { ...current, unread_notifications: Math.max(0, update(current.unread_notifications)) },
    { revalidate: false }
  )
}
