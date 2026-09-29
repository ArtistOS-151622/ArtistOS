function readPushEnv(name: string): string | undefined {
  const value = process.env[name]?.trim().replace(/^["']|["']$/g, "")
  return value || undefined
}

export function getVapidPublicKey(): string | undefined {
  return readPushEnv("VAPID_PUBLIC_KEY") ?? readPushEnv("NEXT_PUBLIC_VAPID_PUBLIC_KEY")
}

export function getVapidPrivateKey(): string | undefined {
  return readPushEnv("VAPID_PRIVATE_KEY")
}

export function getVapidSubject(): string {
  return readPushEnv("VAPID_SUBJECT") ?? "mailto:support@artistos.app"
}

export function isPushConfigured(): boolean {
  return Boolean(getVapidPublicKey() && getVapidPrivateKey())
}

export const BOOKING_REMINDER_2H_MINUTES = Number(
  readPushEnv("BOOKING_REMINDER_2H_MINUTES") ?? 120
)

export const BOOKING_REMINDER_10M_MINUTES = Number(
  readPushEnv("BOOKING_REMINDER_10M_MINUTES") ?? 10
)

export const BOOKING_REMINDER_MINUTES_BEFORE = Number(
  readPushEnv("BOOKING_REMINDER_MINUTES_BEFORE") ?? 120
)

export const NOTIFICATION_MAX_ATTEMPTS = Number(readPushEnv("NOTIFICATION_MAX_ATTEMPTS") ?? 3)

export const NOTIFICATION_DISPATCH_BATCH_SIZE = 50
