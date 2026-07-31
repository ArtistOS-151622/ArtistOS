"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Smartphone, Wifi, WifiOff, RefreshCw, QrCode, CheckCircle, AlertTriangle } from "lucide-react"
import { PageHeader } from "@/components/common/dashboard/dashboard-header-context"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { QRCodeSVG } from "qrcode.react"

type DeviceStatus = "DISCONNECTED" | "REQUESTING_QR" | "QR_READY" | "CONNECTED"

type WhatsAppDevice = {
  id: number
  name: string
  session_status: DeviceStatus
  last_connected_at: string | null
  session_data?: { qr?: string } | null
}

export default function WhatsAppDevicesPage() {
  const [device, setDevice] = useState<WhatsAppDevice | null>(null)
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const pollingRef = useRef<NodeJS.Timeout | null>(null)
  const prevStatusRef = useRef<DeviceStatus | null>(null)

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
      if (curr === "DISCONNECTED" && prev === "CONNECTED") {
        toast.warning("WhatsApp disconnected. Please reconnect.")
      }
    }
    prevStatusRef.current = curr
  }, [device])

  // Poll every 2s while connecting / waiting for QR / QR ready
  useEffect(() => {
    const needsPoll =
      device?.session_status === "REQUESTING_QR" ||
      device?.session_status === "QR_READY" ||
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

  // ── Actions ────────────────────────────────────────────────────────────────
  const handleConnect = async () => {
    if (!device) return
    setConnecting(true)
    try {
      await fetch(`/api/whatsapp/devices/${device.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_status: "REQUESTING_QR", session_data: null }),
      })
      await loadDevice()
    } catch {
      setConnecting(false)
      toast.error("Failed to start connection")
    }
  }

  const handleDisconnect = async () => {
    if (!device) return
    setConnecting(false)
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
        await fetch(`/api/whatsapp/devices/${data.device.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ session_status: "REQUESTING_QR", session_data: null }),
        })
        await loadDevice()
      }
    } catch {
      setConnecting(false)
      toast.error("Failed to provision device")
    }
  }

  // ── Derived state ──────────────────────────────────────────────────────────
  const status = device?.session_status ?? null
  const qrString = device?.session_data?.qr ?? null
  const isConnected = status === "CONNECTED"
  const isWaiting = status === "REQUESTING_QR" || (connecting && status === "DISCONNECTED")
  const isQrReady = status === "QR_READY" && !!qrString

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

        ) : isQrReady ? (
          /* ── QR READY STATE ── */
          <Card className="rounded-[1.75rem] border-slate-100 bg-white shadow-md">
            <CardContent className="py-8 flex flex-col items-center gap-6 text-center">
              <div className="w-16 h-16 rounded-full bg-[#7c3aed]/10 flex items-center justify-center">
                <QrCode className="size-8 text-[#7c3aed]" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 mb-1">Scan to Connect</h2>
                <p className="text-sm text-slate-500 max-w-xs">
                  Open WhatsApp → <strong>Settings</strong> → <strong>Linked Devices</strong> → scan this code
                </p>
              </div>

              <div className="p-4 bg-white rounded-2xl border-2 border-dashed border-slate-200 shadow-inner">
                <QRCodeSVG value={qrString!} size={220} level="M" />
              </div>

              <p className="text-xs text-slate-400">QR expires every ~60 seconds — it refreshes automatically</p>

              <Button
                variant="outline"
                className="rounded-xl w-full"
                onClick={handleDisconnect}
              >
                Cancel
              </Button>
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
                <h2 className="text-xl font-bold text-slate-900 mb-1">Starting Connection…</h2>
                <p className="text-sm text-slate-500">
                  Launching WhatsApp. Your QR code will appear in a few seconds.
                </p>
              </div>
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
                  Not connected — broadcasts are paused
                </div>
              )}

              <Button
                className="rounded-xl w-full h-12 bg-[#7c3aed] hover:bg-[#6d28d9] text-white shadow-md shadow-purple-950/10 text-base"
                onClick={device ? handleConnect : handleProvision}
                disabled={connecting}
              >
                {connecting
                  ? <><RefreshCw className="mr-2 size-4 animate-spin" />Starting…</>
                  : <><QrCode className="mr-2 size-5" />Connect via QR Code</>
                }
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  )
}
