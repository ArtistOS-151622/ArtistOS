import webpush from "web-push"

import { config } from "#src/config/env.js"

let configured = false

export const getVapidPublicKey = () => config.push.vapidPublicKey
export const isPushConfigured = () => Boolean(config.push.vapidPublicKey && config.push.vapidPrivateKey)

export function getWebPushClient() {
  if (configured) return webpush

  const { vapidPublicKey, vapidPrivateKey, vapidSubject } = config.push
  if (!vapidPublicKey || !vapidPrivateKey) throw new Error("VAPID keys are not configured")

  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey)
  configured = true
  return webpush
}
