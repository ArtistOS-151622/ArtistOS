"use client"

import { useEffect, useState } from "react"
import { useHeaderContext } from "@/components/common/dashboard/dashboard-header-context"
import { Loader2, Save, AlertTriangle, Shield, HardDrive, Percent, Server } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

type StoragePlan = {
  id: number
  name: string
  storage_bytes: number
  price_inr: number
  is_active: boolean
}

type PlatformSettings = {
  global_gst_rate?: string
  maintenance_mode?: string
}

const formatBytesToMB = (bytes: number) => {
  return Math.round(bytes / (1024 * 1024))
}

const formatMBToBytes = (mb: number) => {
  return mb * 1024 * 1024
}

export default function AdminSettingsPage() {
  const { setTitle } = useHeaderContext()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [plans, setPlans] = useState<StoragePlan[]>([])
  const [settings, setSettings] = useState<PlatformSettings>({})

  useEffect(() => {
    setTitle("Platform Settings")
    loadData()
  }, [setTitle])

  const loadData = async () => {
    try {
      const [settingsRes, plansRes] = await Promise.all([
        fetch("/api/admin/settings"),
        fetch("/api/admin/storage-plans")
      ])
      if (settingsRes.ok) setSettings(await settingsRes.json())
      if (plansRes.ok) setPlans(await plansRes.json())
    } catch (e) {
      console.error("Failed to load settings", e)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveSettings = async () => {
    setSaving(true)
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings)
      })
      if (res.ok) {
        toast.success("Platform settings saved successfully")
      } else {
        toast.error("Failed to save platform settings")
      }
    } catch (e) {
      console.error(e)
      toast.error("An error occurred")
    } finally {
      setSaving(false)
    }
  }

  const handleSaveAllPlans = async () => {
    setSaving(true)
    try {
      await Promise.all(plans.map(plan => 
        fetch("/api/admin/storage-plans", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(plan)
        })
      ))
      toast.success("All storage plans updated successfully")
    } catch (e) {
      console.error(e)
      toast.error("An error occurred")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-slate-400" />
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12 relative">
      <Tabs defaultValue="pricing" className="w-full">
        <TabsList className="bg-white border border-slate-200 rounded-xl p-1 mb-6">
          <TabsTrigger value="pricing" className="rounded-lg data-[state=active]:bg-red-50 data-[state=active]:text-red-700 data-[state=active]:shadow-none"><HardDrive className="size-4 mr-2" /> Storage Plans</TabsTrigger>
          <TabsTrigger value="billing" className="rounded-lg data-[state=active]:bg-red-50 data-[state=active]:text-red-700 data-[state=active]:shadow-none"><Percent className="size-4 mr-2" /> Billing & Tax</TabsTrigger>
          <TabsTrigger value="system" className="rounded-lg data-[state=active]:bg-red-50 data-[state=active]:text-red-700 data-[state=active]:shadow-none"><Server className="size-4 mr-2" /> System</TabsTrigger>
        </TabsList>

        <TabsContent value="pricing" className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-6 sm:p-8">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-slate-900">Storage Pricing Plans</h2>
              <p className="text-slate-500 text-sm mt-1">Changes made here will instantly reflect on the artist checkout page.</p>
            </div>

            <div className="space-y-8">
              {plans.map((plan, index) => (
                <div key={plan.id} className="relative group">
                  {index > 0 && <div className="absolute -top-4 left-0 right-0 h-px bg-slate-100" />}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
                    <div className="md:col-span-5 space-y-2">
                      <Label className="text-slate-500">Plan Name</Label>
                      <Input 
                        value={plan.name} 
                        onChange={e => setPlans(plans.map(p => p.id === plan.id ? {...p, name: e.target.value} : p))}
                        className="h-11 rounded-xl bg-slate-50 border-slate-200 focus-visible:ring-red-500"
                      />
                    </div>
                    <div className="md:col-span-3 space-y-2">
                      <Label className="text-slate-500">Storage (MB)</Label>
                      <Input 
                        type="number"
                        value={formatBytesToMB(plan.storage_bytes)}
                        onChange={e => setPlans(plans.map(p => p.id === plan.id ? {...p, storage_bytes: formatMBToBytes(Number(e.target.value))} : p))}
                        className="h-11 rounded-xl bg-slate-50 border-slate-200 focus-visible:ring-red-500"
                      />
                    </div>
                    <div className="md:col-span-4 space-y-2">
                      <Label className="text-slate-500">Price (INR)</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-3 text-slate-400">₹</span>
                        <Input 
                          type="number"
                          value={plan.price_inr} 
                          onChange={e => setPlans(plans.map(p => p.id === plan.id ? {...p, price_inr: Number(e.target.value)} : p))}
                          className="h-11 pl-8 rounded-xl bg-slate-50 border-slate-200 focus-visible:ring-red-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <Button 
                  onClick={handleSaveAllPlans}
                  disabled={saving}
                  className="h-11 px-8 rounded-xl bg-red-600 hover:bg-red-700 text-white"
                >
                  {saving ? <Loader2 className="size-4 animate-spin mr-2" /> : <Save className="size-4 mr-2" />}
                  Save All Plans
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="billing" className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-6 sm:p-8">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-slate-900">Tax Configuration</h2>
              <p className="text-slate-500 text-sm mt-1">Configure global tax rates applied to all purchases.</p>
            </div>

            <div className="max-w-md space-y-6">
              <div className="space-y-3">
                <Label className="text-slate-700 font-semibold">Global GST Rate (%)</Label>
                <div className="relative">
                  <Input 
                    type="number"
                    step="0.01"
                    value={settings.global_gst_rate ? Number(settings.global_gst_rate) * 100 : 18}
                    onChange={(e) => setSettings({...settings, global_gst_rate: String(Number(e.target.value) / 100)})}
                    className="h-12 pl-4 pr-10 rounded-xl bg-slate-50 border-slate-200 focus-visible:ring-red-500 text-lg"
                  />
                  <span className="absolute right-4 top-3 text-slate-400 font-medium">%</span>
                </div>
                <p className="text-xs text-slate-500">Currently applied to storage plan purchases at checkout.</p>
              </div>

              <Button 
                onClick={handleSaveSettings}
                disabled={saving}
                className="h-11 px-8 rounded-xl bg-red-600 hover:bg-red-700 text-white"
              >
                {saving ? <Loader2 className="size-4 animate-spin mr-2" /> : <Save className="size-4 mr-2" />}
                Save Tax Settings
              </Button>
            </div>
          </div>
          
          <div className="bg-amber-50 rounded-3xl border border-amber-200 shadow-sm overflow-hidden p-6 sm:p-8">
            <div className="flex gap-4">
              <Shield className="size-6 text-amber-600 shrink-0" />
              <div>
                <h3 className="font-bold text-amber-900">Payment Gateway Security</h3>
                <p className="text-amber-800/80 text-sm mt-1 leading-relaxed">
                  Razorpay API Keys (`RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`) are securely stored in your server's `.env.local` file. This prevents unauthorized database access from compromising your payment gateway. To change API keys, update the environment variables and restart the server.
                </p>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="system" className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-6 sm:p-8">
            <div className="mb-8">
              <h2 className="text-xl font-bold text-slate-900">System Controls</h2>
              <p className="text-slate-500 text-sm mt-1">Manage global platform accessibility.</p>
            </div>

            <div className="space-y-8">
              <div className="flex items-center justify-between p-5 rounded-2xl border border-slate-100 bg-slate-50/50">
                <div className="space-y-1">
                  <div className="font-semibold text-slate-900 flex items-center gap-2">
                    Maintenance Mode 
                    {settings.maintenance_mode === 'true' && <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">Active</span>}
                  </div>
                  <p className="text-sm text-slate-500">Temporarily block all non-admin users from accessing the platform.</p>
                </div>
                <Switch 
                  checked={settings.maintenance_mode === 'true'}
                  onCheckedChange={(checked) => setSettings({...settings, maintenance_mode: checked ? 'true' : 'false'})}
                />
              </div>

              <Button 
                onClick={handleSaveSettings}
                disabled={saving}
                className="h-11 px-8 rounded-xl bg-red-600 hover:bg-red-700 text-white"
              >
                {saving ? <Loader2 className="size-4 animate-spin mr-2" /> : <Save className="size-4 mr-2" />}
                Save System Config
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
