import { useState, useEffect } from "react"
import { Loader2, Plus, Save, Trash2, ShieldCheck, Crown, Pencil, X, ExternalLink, AlertTriangle } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { FloatingInput } from "@/components/common/shared/floating-input"
import { FloatingTextarea } from "@/components/common/shared/floating-input"
import { Switch } from "@/components/ui/switch"

export type PlatformSubscription = {
  id?: number
  name: string
  description: string
  amount_inr: number
  billing_period: string
  features: string[]
  is_active: boolean
  is_featured: boolean
  duration_in_days: number
  display_order: number
}

export function PlatformSubscriptionsTab() {
  const [plans, setPlans] = useState<PlatformSubscription[]>([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<number | 'new' | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)
  
  const [editingPlan, setEditingPlan] = useState<PlatformSubscription | null>(null)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)

  useEffect(() => {
    loadPlans()
  }, [])

  const loadPlans = async () => {
    try {
      const res = await fetch("/api/admin/platform-subscriptions")
      if (res.ok) {
        setPlans(await res.json())
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleAddPlan = () => {
    setEditingIndex(null)
    setEditingPlan({
      name: "New Plan",
      description: "",
      amount_inr: 0,
      billing_period: "/month",
      features: ["One Month Free to Use", "Client CRM", "Portfolio gallery", "Booking calendar"],
      is_active: true,
      is_featured: false,
      duration_in_days: 30,
      display_order: 0
    })
  }

  const handleEditPlan = (plan: PlatformSubscription, index: number) => {
    setEditingIndex(index)
    // Create a deep copy so we can edit without affecting the list until saved
    setEditingPlan(JSON.parse(JSON.stringify(plan)))
  }

  const handleCloseDrawer = () => {
    setEditingPlan(null)
    setEditingIndex(null)
  }

  const updateDraft = (field: keyof PlatformSubscription, value: any) => {
    if (!editingPlan) return
    setEditingPlan({ ...editingPlan, [field]: value })
  }

  const updateDraftFeature = (featureIndex: number, value: string) => {
    if (!editingPlan) return
    const newFeatures = [...editingPlan.features]
    newFeatures[featureIndex] = value
    updateDraft("features", newFeatures)
  }

  const addDraftFeature = () => {
    if (!editingPlan) return
    updateDraft("features", [...editingPlan.features, ""])
  }

  const removeDraftFeature = (featureIndex: number) => {
    if (!editingPlan) return
    updateDraft("features", editingPlan.features.filter((_, i) => i !== featureIndex))
  }

  const handleSavePlan = async () => {
    if (!editingPlan) return
    const isNew = !editingPlan.id
    setSavingId(isNew ? 'new' : editingPlan.id!)
    
    try {
      const url = isNew ? "/api/admin/platform-subscriptions" : `/api/admin/platform-subscriptions/${editingPlan.id}`
      const method = isNew ? "POST" : "PUT"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingPlan)
      })

      if (res.ok) {
        const result = await res.json()
        toast.success(isNew ? "Plan created successfully" : "Plan updated successfully")
        
        const updatedPlans = [...plans]
        if (isNew) {
          updatedPlans.push(result.data)
        } else if (editingIndex !== null) {
          updatedPlans[editingIndex] = result.data
        }
        setPlans(updatedPlans)
        handleCloseDrawer()
      } else {
        toast.error("Failed to save plan")
      }
    } catch (e) {
      console.error(e)
      toast.error("An error occurred")
    } finally {
      setSavingId(null)
    }
  }

  const handleDeletePlan = async (id: number | undefined) => {
    if (!id) return
    setConfirmDeleteId(id)
  }

  const confirmDelete = async () => {
    const id = confirmDeleteId
    if (!id) return
    setConfirmDeleteId(null)
    setDeletingId(id)
    try {
      const res = await fetch(`/api/admin/platform-subscriptions/${id}`, { method: "DELETE" })
      if (res.ok) {
        toast.success("Plan deleted successfully")
        setPlans(plans.filter(p => p.id !== id))
      } else {
        toast.error("Failed to delete plan")
      }
    } catch (e) {
      console.error(e)
      toast.error("An error occurred")
    } finally {
      setDeletingId(null)
    }
  }

  // Quick toggle from list view
  const handleToggleActive = async (plan: PlatformSubscription, index: number, active: boolean) => {
    if (!plan.id) return
    const updated = { ...plan, is_active: active }
    
    // Optimistic update
    const updatedPlans = [...plans]
    updatedPlans[index] = updated
    setPlans(updatedPlans)

    try {
      await fetch(`/api/admin/platform-subscriptions/${plan.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated)
      })
    } catch (e) {
      // Revert on failure
      const revertedPlans = [...plans]
      revertedPlans[index] = plan
      setPlans(revertedPlans)
      toast.error("Failed to update status")
    }
  }

  if (loading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <Loader2 className="size-6 animate-spin text-slate-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Crown className="size-5 text-purple-600" /> Platform Subscriptions
          </h2>
          <p className="text-slate-500 text-sm mt-1">Manage the pricing plans shown on the landing page.</p>
        </div>
        <Button 
          onClick={handleAddPlan}
          className="h-11 rounded-xl bg-purple-600 hover:bg-purple-700 text-white"
        >
          <Plus className="size-4 mr-2" /> Add Plan
        </Button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {plans.length === 0 ? (
          <div className="text-center py-12">
            <Crown className="size-12 mx-auto text-slate-300 mb-4" />
            <h3 className="text-lg font-semibold text-slate-900">No subscriptions created</h3>
            <p className="text-slate-500 text-sm mt-1 mb-6">Create your first platform subscription plan.</p>
            <Button onClick={handleAddPlan} className="rounded-xl bg-purple-600 hover:bg-purple-700 text-white">
              <Plus className="size-4 mr-2" /> Add Plan
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {plans.map((plan, index) => (
              <div key={plan.id} className="p-6 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                <div className="flex items-center gap-6">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-bold text-slate-900 text-lg">{plan.name}</h3>
                      {plan.is_featured && (
                        <span className="bg-purple-100 text-purple-700 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border border-purple-200/50">
                          Featured
                        </span>
                      )}
                      {!plan.is_active && (
                        <span className="bg-slate-100 text-slate-600 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border border-slate-200/50">
                          Inactive
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-slate-500">
                      {plan.amount_inr === 0 ? "Custom Price" : `₹${plan.amount_inr}`} {plan.billing_period}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-3 border-r border-slate-200 pr-6">
                    <span className="text-sm font-medium text-slate-600">Active</span>
                    <Switch 
                      checked={plan.is_active} 
                      onCheckedChange={v => handleToggleActive(plan, index, v)} 
                    />
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      onClick={() => handleEditPlan(plan, index)}
                      className="rounded-xl h-10 px-4 text-purple-600 hover:text-purple-700 hover:bg-purple-50 border-purple-200"
                    >
                      <Pencil className="size-4 mr-2" /> Show Detail
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => handleDeletePlan(plan.id)}
                      disabled={deletingId === plan.id}
                      className="rounded-xl h-10 w-10 text-slate-400 hover:text-red-600 hover:bg-red-50"
                    >
                      {deletingId === plan.id ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Right-side Drawer / Modal */}
      {editingPlan && (
        <>
          <div 
            className="fixed inset-0 z-50 bg-slate-900/20 backdrop-blur-sm transition-opacity" 
            onClick={handleCloseDrawer}
          />
          <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-white shadow-2xl border-l border-slate-200 flex flex-col animate-in slide-in-from-right duration-300">
            
            {/* Drawer Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
              <h2 className="text-lg font-bold text-slate-900">
                {editingPlan.id ? "Edit Subscription Plan" : "Create New Plan"}
              </h2>
              <Button variant="ghost" size="icon" onClick={handleCloseDrawer} className="rounded-full h-8 w-8 -mr-2">
                <X className="size-4" />
              </Button>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
              
              {/* Toggles */}
              <div className="flex items-center gap-6 p-4 rounded-2xl border border-slate-100 bg-white shadow-sm">
                <div className="flex-1 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Active Status</p>
                    <p className="text-xs text-slate-500">Show on landing page</p>
                  </div>
                  <Switch 
                    checked={editingPlan.is_active} 
                    onCheckedChange={v => updateDraft("is_active", v)} 
                  />
                </div>
                <div className="w-px h-8 bg-slate-100" />
                <div className="flex-1 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-purple-900">Featured</p>
                    <p className="text-xs text-purple-600/70">Mark as "Best value"</p>
                  </div>
                  <Switch 
                    checked={editingPlan.is_featured} 
                    onCheckedChange={v => updateDraft("is_featured", v)} 
                  />
                </div>
              </div>

              {/* Basic Details */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <ExternalLink className="size-4 text-slate-400" /> Basic Details
                </h3>
                <FloatingInput 
                  label="Plan Name" 
                  value={editingPlan.name} 
                  onChange={e => updateDraft("name", e.target.value)} 
                />
                <div className="grid grid-cols-2 gap-4">
                  <FloatingInput 
                    label="Amount (₹)" 
                    type="number"
                    value={editingPlan.amount_inr}
                    onChange={(e) => setEditingPlan({ ...editingPlan, amount_inr: Number(e.target.value) })}
                  />
                  <FloatingInput 
                    label="Duration (in days)" 
                    type="number"
                    value={editingPlan.duration_in_days || 30}
                    onChange={(e) => setEditingPlan({ ...editingPlan, duration_in_days: Number(e.target.value) })}
                  />
                  <FloatingInput 
                    label="Display Order (Lowest First)" 
                    type="number"
                    value={editingPlan.display_order ?? 0}
                    onChange={(e) => setEditingPlan({ ...editingPlan, display_order: Number(e.target.value) })}
                  />
                  <FloatingInput 
                    label="Billing Period Text (e.g. /month)" 
                    value={editingPlan.billing_period}
                    onChange={(e) => setEditingPlan({ ...editingPlan, billing_period: e.target.value })}
                  />
                </div>
                <FloatingTextarea 
                  label="Description" 
                  value={editingPlan.description || ""} 
                  onChange={e => updateDraft("description", e.target.value)} 
                  className="min-h-[80px]"
                />
              </div>

              {/* Benefits */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                    <ShieldCheck className="size-4 text-emerald-500" /> Plan Benefits
                  </h3>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="h-8 text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                    onClick={addDraftFeature}
                  >
                    <Plus className="size-3 mr-1" /> Add
                  </Button>
                </div>
                
                <div className="space-y-3">
                  {editingPlan.features.map((feature, fIndex) => (
                    <div key={fIndex} className="flex gap-2 items-center">
                      <FloatingInput 
                        label={`Benefit ${fIndex + 1}`} 
                        value={feature} 
                        onChange={e => updateDraftFeature(fIndex, e.target.value)}
                        containerClassName="flex-1"
                      />
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="h-10 w-10 shrink-0 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                        onClick={() => removeDraftFeature(fIndex)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  ))}
                  {editingPlan.features.length === 0 && (
                    <p className="text-sm text-slate-500 text-center py-4 border border-dashed rounded-xl">
                      No benefits added yet.
                    </p>
                  )}
                </div>
              </div>
              
            </div>

            {/* Drawer Footer */}
            <div className="p-6 border-t border-slate-100 bg-white">
              <Button 
                onClick={handleSavePlan}
                disabled={savingId !== null}
                className="w-full h-12 rounded-xl bg-purple-600 hover:bg-purple-700 text-white shadow-md shadow-purple-600/20 text-base"
              >
                {savingId !== null ? <Loader2 className="size-4 animate-spin mr-2" /> : <Save className="size-4 mr-2" />}
                {editingPlan.id ? "Save Changes" : "Create Plan"}
              </Button>
            </div>

          </div>
        </>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDeleteId !== null && (
        <>
          <div
            className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setConfirmDeleteId(null)}
          />
          <div className="fixed left-1/2 top-1/2 z-[61] w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-3xl bg-white p-7 shadow-2xl shadow-slate-900/20">
            <div className="flex flex-col items-center text-center">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-red-50 mb-4">
                <AlertTriangle className="size-7 text-red-500" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Delete Plan?</h3>
              <p className="mt-2 text-sm text-slate-500 leading-relaxed">
                This plan will be permanently removed and will no longer appear on the landing page. This action cannot be undone.
              </p>
            </div>
            <div className="mt-6 flex gap-3">
              <Button
                variant="outline"
                className="flex-1 h-11 rounded-xl border-slate-200"
                onClick={() => setConfirmDeleteId(null)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 h-11 rounded-xl bg-red-600 hover:bg-red-700 text-white"
                onClick={confirmDelete}
                disabled={deletingId !== null}
              >
                {deletingId !== null ? <Loader2 className="size-4 animate-spin mr-2" /> : <Trash2 className="size-4 mr-2" />}
                Delete
              </Button>
            </div>
          </div>
        </>
      )}
    </div>

  )
}
