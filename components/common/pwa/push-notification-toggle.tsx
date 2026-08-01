"use client"

import { BellRing, Loader2, Send } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const raw = window.atob(base64)

  const output = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i)

  return output
}

function isIos() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent)
}

function isStandalone() {
  const navigatorWithStandalone = window.navigator as Navigator & { standalone?: boolean }

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    navigatorWithStandalone.standalone === true
  )
}

export function PushNotificationToggle() {
  const [supported, setSupported] = useState(true)
  const [permission, setPermission] = useState<NotificationPermission>("default")
  const [subscription, setSubscription] = useState<PushSubscription | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [testing, setTesting] = useState(false)
  const [hint, setHint] = useState("")

  useEffect(() => {
    let cancelled = false

    async function detect() {
      const hasSupport =
        "Notification" in window && "PushManager" in window && "serviceWorker" in navigator

      if (!hasSupport) {
        return {
          supported: false,
          permission: "default" as NotificationPermission,
          existing: null,
          hint:
            isIos() && !isStandalone()
              ? "On iPhone, add ArtistOS to your home screen first — Safari only allows notifications for installed apps."
              : "This browser does not support push notifications.",
        }
      }

      const registration = await navigator.serviceWorker.ready
      const existing = await registration.pushManager.getSubscription().catch(() => null)

      return { supported: true, permission: Notification.permission, existing, hint: "" }
    }

    void detect()
      .then((state) => {
        if (cancelled) return
        setSupported(state.supported)
        setPermission(state.permission)
        setSubscription(state.existing)
        setHint(state.hint)
      })
      .catch(() => {
        if (!cancelled) setSubscription(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const enable = useCallback(async () => {
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

    if (!vapidKey) {
      toast.error("Push notifications are not configured on the server.")
      return
    }

    const result = await Notification.requestPermission()
    setPermission(result)

    if (result !== "granted") {
      setHint(
        result === "denied"
          ? "Notifications are blocked. Re-enable them for this site in your browser settings."
          : "Permission was dismissed. Try again to enable notifications."
      )
      return
    }

    const registration = await navigator.serviceWorker.ready
    const created = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
    })

    const res = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(created.toJSON()),
    })

    if (!res.ok) {
      // Don't leave a browser subscription the server has no record of.
      await created.unsubscribe()
      const data = await res.json().catch(() => null)
      throw new Error(data?.error || "Failed to enable notifications")
    }

    setSubscription(created)
    setHint("")
    toast.success("Notifications enabled on this device")
  }, [])

  const disable = useCallback(async () => {
    if (!subscription) return

    const endpoint = subscription.endpoint
    await subscription.unsubscribe()

    await fetch("/api/push/unsubscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint }),
    })

    setSubscription(null)
    setHint("")
    toast.success("Notifications turned off on this device")
  }, [subscription])

  async function handleToggle(checked: boolean) {
    setBusy(true)

    try {
      if (checked) await enable()
      else await disable()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setBusy(false)
    }
  }

  async function sendTest() {
    if (!subscription) return

    setTesting(true)

    try {
      const res = await fetch("/api/push/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: subscription.endpoint }),
      })
      const data = await res.json().catch(() => null)

      if (!res.ok) throw new Error(data?.error || "Failed to send test notification")

      toast.success("Test notification sent")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send test notification")
    } finally {
      setTesting(false)
    }
  }

  const enabled = Boolean(subscription)
  const blocked = permission === "denied"

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-[#7c3aed]">
            <BellRing className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="font-medium leading-5">Booking reminders</p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Get an alert on this device before a booking starts.
            </p>
          </div>
        </div>

        {loading ? (
          <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />
        ) : (
          <Switch
            checked={enabled}
            disabled={!supported || blocked || busy}
            onCheckedChange={handleToggle}
            aria-label="Enable booking reminder notifications"
          />
        )}
      </div>

      {enabled && (
        <Button
          type="button"
          variant="outline"
          className="rounded-2xl w-full sm:w-auto"
          onClick={sendTest}
          disabled={testing}
        >
          {testing ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Send className="mr-2 size-4" />
              Send test notification
            </>
          )}
        </Button>
      )}

      {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
    </div>
  )
}
