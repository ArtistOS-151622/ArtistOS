import webpush from "web-push"

import { getVapidPrivateKey, getVapidPublicKey, getVapidSubject } from "@/lib/push/config"

let configured = false

export function getWebPushClient(): typeof webpush {
  if (configured) return webpush

  const publicKey = getVapidPublicKey()
  const privateKey = getVapidPrivateKey()

  if (!publicKey || !privateKey) {
    throw new Error("VAPID keys are not configured")
  }

  webpush.setVapidDetails(getVapidSubject(), publicKey, privateKey)
  configured = true

  return webpush
}
