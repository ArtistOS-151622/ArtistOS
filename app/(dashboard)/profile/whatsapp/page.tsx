"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Smartphone, Wifi, WifiOff, RefreshCw, Key, CheckCircle, AlertTriangle } from "lucide-react"
import { PageHeader } from "@/components/common/dashboard/dashboard-header-context"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

type DeviceStatus = "DISCONNECTED" | "REQUESTING_PAIRING_CODE" | "PAIRING_CODE_READY" | "CONNECTED"

type WhatsAppDevice = {
  id: number
  name: string
  session_status: DeviceStatus
  last_connected_at: string | null
  session_data?: {
    phoneNumber?: string
    pairingCode?: string | null
    pairingCodeGeneratedAt?: string | null
    requestedAt?: string
    lastError?: string | null
  } | null
}

export default function WhatsAppDevicesPage() {
  const [device, setDevice] = useState<WhatsAppDevice | null>(null)
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [phoneNumber, setPhoneNumber] = useState("")
  const [now, setNow] = useState(() => Date.now())
  const pollingRef = useRef<NodeJS.Timeout | null>(null)
  const prevStatusRef = useRef<DeviceStatus | null>(null)

  function cleanPhoneNumber(value: string) {
    return value.replace(/\D/g, "")
  }

  function getPairingPhoneNumber() {
    return cleanPhoneNumber(phoneNumber || device?.session_data?.phoneNumber || "")
  }

  // Load the single device (we only support one)
  const loadDevice = useCallback(async () => {
    try {
      const res = await fetch("/api/whatsapp/devices")
      const data = await res.json()
      if (res.ok) {
        const devices: WhatsAppDevice[] = data.devices || []
        setDevice(devices[0] ?? null)
      }
    } catch (err) {
      console.error("Failed to load device", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadDevice()
  }, [loadDevice])

  // Auto-detect status transitions
  useEffect(() => {
    if (!device) return
    const prev = prevStatusRef.current
    const curr = device.session_status

    if (prev && prev !== curr) {
      if (curr === "CONNECTED") {
        setConnecting(false)
        toast.success("WhatsApp connected successfully!")
      }
      if (curr === "DISCONNECTED") {
        setConnecting(false)
        if (prev === "CONNECTED") {
          toast.warning("WhatsApp disconnected. Please reconnect.")
        } else if (prev === "REQUESTING_PAIRING_CODE" || prev === "PAIRING_CODE_READY") {
          toast.error("Connection timed out. Please try again.")
        }
      }
      if (curr === "PAIRING_CODE_READY") {
        setConnecting(false)
      }
    }
    prevStatusRef.current = curr
  }, [device])

  // Poll every 2s while connecting / waiting for Pairing Code
  useEffect(() => {
    const needsPoll =
      device?.session_status === "REQUESTING_PAIRING_CODE" ||
      device?.session_status === "PAIRING_CODE_READY" ||
      connecting

    if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }

    if (needsPoll) {
      pollingRef.current = setInterval(loadDevice, 2000)
    }

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
        pollingRef.current = null
      }
    }
  }, [device?.session_status, connecting, loadDevice])

  useEffect(() => {
    const needsClock = device?.session_status === "REQUESTING_PAIRING_CODE" || connecting
    if (!needsClock) return

    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [device?.session_status, connecting])

  // ── Actions ────────────────────────────────────────────────────────────────
  const handleConnect = async () => {
    if (!device) return
    const cleanPhone = getPairingPhoneNumber()
    if (cleanPhone.length < 10 || cleanPhone.length > 15) {
      toast.error("Please enter a valid phone number with country code")
      return
    }
    setConnecting(true)
    try {
      const res = await fetch(`/api/whatsapp/devices/${device.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          session_status: "REQUESTING_PAIRING_CODE", 
          session_data: { phoneNumber: cleanPhone } 
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? "Failed to start connection")
      }
      await loadDevice()
    } catch (err) {
      setConnecting(false)
      toast.error(err instanceof Error ? err.message : "Failed to start connection")
    }
  }

  const handleDisconnect = async () => {
    if (!device) return
    setConnecting(false)
    setPhoneNumber("")
    try {
      await fetch(`/api/whatsapp/devices/${device.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_status: "DISCONNECTED", session_data: null }),
      })
      await loadDevice()
      toast.info("Device disconnected")
    } catch {
      toast.error("Failed to disconnect device")
    }
  }

  // Provision device if none exists yet
  const handleProvision = async () => {
    const cleanPhone = cleanPhoneNumber(phoneNumber)
    if (cleanPhone.length < 10 || cleanPhone.length > 15) {
      toast.error("Please enter a valid phone number with country code")
      return
    }
    setConnecting(true)
    try {
      const res = await fetch("/api/whatsapp/devices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "My WhatsApp" }),
      })
      if (res.ok) {
        await loadDevice()
        // Immediately trigger connect
        const data = await res.json()
        const connectRes = await fetch(`/api/whatsapp/devices/${data.device.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            session_status: "REQUESTING_PAIRING_CODE", 
            session_data: { phoneNumber: cleanPhone } 
          }),
        })
        if (!connectRes.ok) {
          const connectData = await connectRes.json()
          throw new Error(connectData.error ?? "Failed to start connection")
        }
        await loadDevice()
      } else {
        const data = await res.json()
        throw new Error(data.error ?? "Failed to provision device")
      }
    } catch (err) {
      setConnecting(false)
      toast.error(err instanceof Error ? err.message : "Failed to provision device")
    }
  }

  // ── Derived state ──────────────────────────────────────────────────────────
  const status = device?.session_status ?? null
  const pairingCode = device?.session_data?.pairingCode ?? null
  const pairingPhoneNumber = device?.session_data?.phoneNumber ?? getPairingPhoneNumber()
  const lastError = device?.session_data?.lastError ?? null
  const requestedAt = device?.session_data?.requestedAt
    ? new Date(device.session_data.requestedAt).getTime()
    : null
  const waitingSeconds = requestedAt ? Math.max(0, Math.floor((now - requestedAt) / 1000)) : 0
  const isWorkerLikelyOffline = status === "REQUESTING_PAIRING_CODE" && waitingSeconds > 75
  const isConnected = status === "CONNECTED"
  const isWaiting = status === "REQUESTING_PAIRING_CODE" || (connecting && status === "DISCONNECTED")
  const isPairingCodeReady = status === "PAIRING_CODE_READY" && !!pairingCode

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <PageHeader title="WhatsApp" />
      <div className="mx-auto max-w-lg space-y-6 pb-12">

        {loading ? (
          <div className="flex justify-center py-20">
            <RefreshCw className="size-8 animate-spin text-slate-300" />
          </div>
        ) : isConnected ? (
          /* ── CONNECTED STATE ── */
          <Card className="rounded-[1.75rem] border-emerald-100 bg-white shadow-md">
            <CardContent className="py-10 flex flex-col items-center gap-6 text-center">
              <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center">
                <Wifi className="size-10 text-emerald-600" />
              </div>
              <div>
                <div className="flex items-center justify-center gap-2 mb-1">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  </span>
                  <h2 className="text-lg font-semibold text-slate-900">WhatsApp Connected</h2>
                </div>
                <p className="text-sm text-slate-500">
                  {device?.name} — ready to send broadcasts
                </p>
                {device?.last_connected_at && (
                  <p className="text-xs text-slate-400 mt-1">
                    Connected since {new Date(device.last_connected_at).toLocaleString()}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="size-4 text-emerald-500" />
                <span className="text-sm text-emerald-700 font-medium">Session active</span>
              </div>
              <Button
                variant="outline"
                className="rounded-xl text-rose-500 border-rose-200 hover:bg-rose-50 hover:border-rose-300"
                onClick={handleDisconnect}
              >
                <WifiOff className="mr-2 size-4" />
                Disconnect
              </Button>
            </CardContent>
          </Card>

        ) : isPairingCodeReady ? (
          /* ── PAIRING CODE READY STATE ── */
          <Card className="rounded-[1.75rem] border-slate-100 bg-white shadow-md">
            <CardContent className="py-8 flex flex-col items-center gap-6 text-center">
              <div className="w-16 h-16 rounded-full bg-[#7c3aed]/10 flex items-center justify-center">
                <Key className="size-8 text-[#7c3aed]" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 mb-1">Enter Code in WhatsApp</h2>
                <p className="text-sm text-slate-500 max-w-xs mx-auto">
                  Open WhatsApp → <strong>Linked Devices</strong> → <strong>Link with phone number instead</strong>
                </p>
                {pairingPhoneNumber ? (
                  <p className="mt-2 text-xs font-semibold text-slate-500">
                    Code for +{pairingPhoneNumber}
                  </p>
                ) : null}
              </div>

              <div className="bg-slate-50 px-8 py-6 rounded-2xl border-2 border-dashed border-slate-200">
                <p className="font-mono text-4xl tracking-[0.2em] font-bold text-slate-800">
                  {pairingCode}
                </p>
              </div>

              <p className="text-xs text-slate-400">Enter this code on the WhatsApp account using the same phone number shown above.</p>

              <div className="grid w-full gap-2 sm:grid-cols-2">
                <Button
                  variant="outline"
                  className="rounded-xl w-full"
                  onClick={handleDisconnect}
                >
                  Cancel
                </Button>
                <Button
                  className="rounded-xl w-full bg-[#7c3aed] text-white hover:bg-[#6d28d9]"
                  onClick={handleConnect}
                  disabled={connecting || !pairingPhoneNumber}
                >
                  {connecting ? "Requesting..." : "Get new code"}
                </Button>
              </div>
            </CardContent>
          </Card>

        ) : isWaiting ? (
          /* ── LOADING / INITIALIZING STATE ── */
          <Card className="rounded-[1.75rem] border-slate-100 bg-white shadow-md">
            <CardContent className="py-10 flex flex-col items-center gap-6 text-center">
              <div className="w-20 h-20 rounded-full bg-[#7c3aed]/10 flex items-center justify-center">
                <RefreshCw className="size-10 text-[#7c3aed] animate-spin" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 mb-1">Requesting Code…</h2>
                <p className="text-sm text-slate-500">
                  Contacting WhatsApp to generate your secure pairing code. This should usually finish within a minute.
                </p>
                {pairingPhoneNumber ? (
                  <p className="mt-2 text-xs font-semibold text-slate-500">
                    Requesting for +{pairingPhoneNumber}
                  </p>
                ) : null}
              </div>
              {isWorkerLikelyOffline ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                  Still waiting after {waitingSeconds}s. Make sure the WhatsApp worker service is running in production.
                </div>
              ) : null}
              <div className="flex gap-1">
                {[0, 1, 2].map(i => (
                  <span
                    key={i}
                    className="w-2 h-2 rounded-full bg-[#7c3aed]/40 animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
              <Button variant="outline" className="rounded-xl w-full" onClick={handleDisconnect}>
                Cancel
              </Button>
            </CardContent>
          </Card>

        ) : (
          /* ── DISCONNECTED STATE ── */
          <Card className="rounded-[1.75rem] border-slate-100 bg-white shadow-md">
            <CardContent className="py-10 flex flex-col items-center gap-6 text-center">
              <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center">
                <Smartphone className="size-10 text-slate-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 mb-1">Connect WhatsApp</h2>
                <p className="text-sm text-slate-500 max-w-xs">
                  Link your WhatsApp to send broadcasts. Your session stays active until you disconnect.
                </p>
              </div>

              {status === "DISCONNECTED" && device && (
                <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2">
                  <AlertTriangle className="size-4 shrink-0" />
                  {lastError
                    ? `Not connected — ${lastError.replaceAll("_", " ").toLowerCase()}`
                    : "Not connected — broadcasts are paused"}
                </div>
              )}

              <div className="w-full text-left space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="phone">WhatsApp Phone Number</Label>
                  <Input
                    id="phone"
                    placeholder="e.g. 919876543210 (Include Country Code)"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(cleanPhoneNumber(e.target.value))}
                    className="h-12 rounded-xl bg-slate-50"
                  />
                  <p className="text-xs text-slate-400">Do not include + or spaces.</p>
                </div>
                <Button
                  className="rounded-xl w-full h-12 bg-[#7c3aed] hover:bg-[#6d28d9] text-white shadow-md shadow-purple-950/10 text-base"
                  onClick={device ? handleConnect : handleProvision}
                  disabled={connecting || !phoneNumber}
                >
                  {connecting
                    ? <><RefreshCw className="mr-2 size-4 animate-spin" />Requesting Code…</>
                    : <><Key className="mr-2 size-5" />Get Pairing Code</>
                  }
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  )
}
