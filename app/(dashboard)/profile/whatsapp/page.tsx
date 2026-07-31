"use client"

import { useState, useEffect, useCallback } from "react"
import { Smartphone, Plus, RefreshCw, Trash2, QrCode } from "lucide-react"
import { PageHeader } from "@/components/common/dashboard/dashboard-header-context"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ConfirmDialog } from "@/components/common/shared/confirm-dialog"
import { toast } from "sonner" // Assuming sonner is used for toasts, if not we'll use a basic error display

import { QRCodeSVG } from "qrcode.react"

type WhatsAppDevice = {
  id: number
  name: string
  session_status: "DISCONNECTED" | "QR_READY" | "CONNECTED"
  last_connected_at: string | null
  session_data?: { qr?: string } | null
}

export default function WhatsAppDevicesPage() {
  const [devices, setDevices] = useState<WhatsAppDevice[]>([])
  const [loading, setLoading] = useState(true)
  const [newDeviceName, setNewDeviceName] = useState("")
  const [creating, setCreating] = useState(false)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [qrCode, setQrCode] = useState<string | null>(null) // Base64 image
  const [connectingId, setConnectingId] = useState<number | null>(null)

  const loadDevices = useCallback(async () => {
    try {
      const res = await fetch("/api/whatsapp/devices")
      const data = await res.json()
      if (res.ok) {
        setDevices(data.devices || [])
      }
    } catch (error) {
      console.error("Failed to load devices", error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadDevices()
  }, [loadDevices])

  // Polling logic when connecting
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (connectingId) {
      interval = setInterval(() => {
        loadDevices()
      }, 3000)
    }
    return () => clearInterval(interval)
  }, [connectingId, loadDevices])

  // Clear connecting state if device connects
  useEffect(() => {
    if (connectingId) {
      const device = devices.find(d => d.id === connectingId)
      if (device?.session_status === 'CONNECTED') {
        setConnectingId(null)
        toast.success("WhatsApp Connected!")
      }
    }
  }, [devices, connectingId])

  const handleAddDevice = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newDeviceName.trim()) return

    setCreating(true)
    try {
      const res = await fetch("/api/whatsapp/devices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newDeviceName }),
      })
      if (res.ok) {
        setNewDeviceName("")
        loadDevices()
      } else {
        const err = await res.json()
        toast.error(err.error || "Failed to create device")
      }
    } catch (error) {
      toast.error("Failed to create device")
    } finally {
      setCreating(false)
    }
  }

  const handleDeleteDevice = async () => {
    if (!deleteId) return
    try {
      const res = await fetch(`/api/whatsapp/devices/${deleteId}`, {
        method: "DELETE",
      })
      if (res.ok) {
        loadDevices()
      } else {
        const err = await res.json()
        toast.error(err.error || "Failed to delete device")
      }
    } catch (error) {
      toast.error("Failed to delete device")
    } finally {
      setDeleteId(null)
    }
  }

  const handleConnect = async (deviceId: number) => {
    setConnectingId(deviceId)
    
    // Set device state to REQUESTING_QR so the backend worker knows to spin up the client
    try {
      await fetch(`/api/whatsapp/devices/${deviceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_status: "REQUESTING_QR", session_data: null })
      })
      loadDevices()
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <>
      <PageHeader title="WhatsApp Integration" />
      <div className="mx-auto max-w-4xl space-y-6 pb-12">
        {devices.length === 0 && !loading && (
        <Card className="rounded-[1.75rem] border-slate-100 bg-white/90 shadow-md shadow-purple-950/5">
          <CardHeader>
            <CardTitle className="text-xl">Add New Device</CardTitle>
            <CardDescription>
              Connect a WhatsApp account to use for broadcast messaging. You can add multiple devices to distribute the sending load.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddDevice} className="flex gap-4">
              <div className="flex-1">
                <Label htmlFor="deviceName" className="sr-only">Device Name</Label>
                <div className="relative">
                  <Smartphone className="absolute left-3 top-3 size-4 text-slate-400" />
                  <Input
                    id="deviceName"
                    placeholder="e.g., Support Phone, John's iPhone"
                    value={newDeviceName}
                    onChange={(e) => setNewDeviceName(e.target.value)}
                    className="h-11 rounded-2xl pl-10 border-slate-200 bg-white focus:border-[#7c3aed]"
                    disabled={creating}
                  />
                </div>
              </div>
              <Button 
                type="submit" 
                disabled={!newDeviceName.trim() || creating}
                className="h-11 rounded-2xl bg-[#7c3aed] text-white px-6 hover:bg-[#6d28d9] transition-all"
              >
                {creating ? <RefreshCw className="mr-2 size-4 animate-spin" /> : <Plus className="mr-2 size-4" />}
                Add Device
              </Button>
            </form>
          </CardContent>
        </Card>
        )}

        <Card className="rounded-[1.75rem] border-slate-100 bg-white/90 shadow-md shadow-purple-950/5">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-xl">Your WhatsApp Account</CardTitle>
              <CardDescription>
                Manage your active WhatsApp session used for broadcasting.
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={loadDevices} className="rounded-xl">
              <RefreshCw className="mr-2 size-4" /> Refresh
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8 text-slate-400">
                <RefreshCw className="size-6 animate-spin" />
              </div>
            ) : devices.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <Smartphone className="size-12 mx-auto text-slate-300 mb-3" />
                <h3 className="text-sm font-medium text-slate-900">No devices found</h3>
                <p className="text-sm text-slate-500 mt-1">Add a device above to get started.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {devices.map((device) => (
                  <div key={device.id} className="flex items-center justify-between p-4 border rounded-2xl bg-white shadow-sm">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-xl ${device.session_status === 'CONNECTED' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                        <Smartphone className="size-5" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-900">{device.name}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="relative flex h-2 w-2">
                            {device.session_status === 'CONNECTED' && (
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            )}
                            <span className={`relative inline-flex rounded-full h-2 w-2 ${device.session_status === 'CONNECTED' ? 'bg-emerald-500' : 'bg-slate-300'}`}></span>
                          </span>
                          <span className="text-xs text-slate-500 capitalize">{device.session_status.toLowerCase().replace('_', ' ')}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {(device.session_status === 'DISCONNECTED' || device.session_status === 'QR_READY') && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="rounded-xl"
                          onClick={() => handleConnect(device.id)}
                          disabled={connectingId === device.id}
                        >
                          <QrCode className="mr-2 size-4" /> 
                          {connectingId === device.id ? "Connecting..." : "Connect"}
                        </Button>
                      )}
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="rounded-xl text-rose-500 hover:bg-rose-50 hover:text-rose-600"
                        onClick={() => setDeleteId(device.id)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={!!deleteId}
        title="Delete Device?"
        description="Are you sure you want to remove this device? Active broadcasts using this device will be interrupted."
        confirmText="Delete"
        onCancel={() => setDeleteId(null)}
        onConfirm={handleDeleteDevice}
      />

      {/* QR Code Modal Overlay */}
      {connectingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center relative">
            <h3 className="text-2xl font-bold text-slate-900 mb-2">Link WhatsApp</h3>
            <p className="text-slate-500 mb-8">
              Open WhatsApp on your phone, tap Menu or Settings and select <strong>Linked Devices</strong>. Point your phone to this screen to capture the code.
            </p>
            <div className="flex justify-center bg-white p-4 rounded-xl border-2 border-dashed border-slate-200 mx-auto w-fit">
              {devices.find(d => d.id === connectingId)?.session_data?.qr ? (
                <QRCodeSVG 
                  value={devices.find(d => d.id === connectingId)!.session_data!.qr!} 
                  size={256} 
                />
              ) : (
                <div className="size-[256px] flex items-center justify-center text-slate-400">
                  <RefreshCw className="size-8 animate-spin" />
                </div>
              )}
            </div>
            <Button 
              variant="outline" 
              className="mt-8 rounded-xl w-full"
              onClick={() => setConnectingId(null)}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </>
  )
}
