"use client"

import { useEffect, useState } from "react"
import { useHeaderContext } from "@/components/common/dashboard/dashboard-header-context"
import { Loader2, X, User, Phone, MapPin, Mail, Calendar, HardDrive, IndianRupee, Briefcase, FileDigit, CalendarCheck, Crown, BadgeCheck, Clock, Trash2, AlertTriangle, KeyRound, ShieldAlert, Send } from "lucide-react"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

type UserData = {
  id: number
  profile: {
    artist_name: string
    studio_name: string
    phone: string
    email: string
    address: string
    created_at: string
    updated_at: string
    is_test_user: boolean
    is_free_user: boolean
  }
  customers: {
    total: number
  }
  bookings: {
    total: number
    pending: number
    confirmed: number
    completed: number
    cancelled: number
    last_booking_date: string | null
  }
  financials: {
    total_revenue: number
    total_expenses: number
    net_profit: number
    services_offered: number
  }
  storage: {
    free_quota: number
    purchased_quota: number
    used: number
    active_plans: number
    total_spent: number
  }
  subscription: {
    status: string
    plan_name: string
    amount_inr: number
    billing_period: string
    current_period_start: string
    current_period_end: string | null
    next_billing_at: string | null
    days_left: number | null
  } | null
}

const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount)
}

export default function AdminUsersPage() {
  const { setTitle } = useHeaderContext()
  const [users, setUsers] = useState<UserData[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null)
  const [togglingKey, setTogglingKey] = useState<string | null>(null)
  const [deleteTargetUser, setDeleteTargetUser] = useState<UserData | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [adminOtp, setAdminOtp] = useState("")
  const [otpSent, setOtpSent] = useState(false)
  const [sendingOtp, setSendingOtp] = useState(false)
  const [otpCooldown, setOtpCooldown] = useState(0)

  useEffect(() => {
    if (otpCooldown <= 0) return
    const timer = setInterval(() => {
      setOtpCooldown((prev) => Math.max(0, prev - 1))
    }, 1000)
    return () => clearInterval(timer)
  }, [otpCooldown])

  const openDeleteModal = (user: UserData) => {
    setDeleteTargetUser(user)
    setAdminOtp("")
    setOtpSent(false)
    setOtpCooldown(0)
  }

  const handleSendAdminOtp = async () => {
    try {
      setSendingOtp(true)
      const res = await fetch("/api/admin/users/delete-otp", {
        method: "POST"
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to send security OTP")
      }
      setOtpSent(true)
      setOtpCooldown(30)
      toast.success(data.message || "Security OTP sent to Admin WhatsApp (+91 9313202075)")
    } catch (err) {
      console.error("Send OTP error:", err)
      toast.error(err instanceof Error ? err.message : "Failed to send security OTP")
    } finally {
      setSendingOtp(false)
    }
  }

  const handleDeleteUser = async () => {
    if (!deleteTargetUser) return
    if (!adminOtp || adminOtp.length !== 6) {
      toast.error("Please enter the 6-digit OTP sent to admin WhatsApp (+91 9313202075)")
      return
    }

    const id = deleteTargetUser.id
    try {
      setDeletingId(id)
      const res = await fetch(`/api/admin/users`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, otp: adminOtp })
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to delete artist")
      }
      toast.success(`Artist "${deleteTargetUser.profile.artist_name}" and all records deleted successfully`)
      setUsers(prev => prev.filter(u => u.id !== id))
      if (selectedUser?.id === id) {
        setSelectedUser(null)
      }
      setDeleteTargetUser(null)
      setAdminOtp("")
      setOtpSent(false)
    } catch (err) {
      console.error("Delete user error:", err)
      toast.error(err instanceof Error ? err.message : "Failed to delete artist")
    } finally {
      setDeletingId(null)
    }
  }

  const toggleUserField = async (user: UserData, field: "is_free_user" | "is_test_user") => {
    const key = `${user.id}-${field}`
    try {
      setTogglingKey(key)
      const newValue = !user.profile[field]
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: user.id, [field]: newValue })
      })
      if (res.ok) {
        const { user: updated } = await res.json()
        setUsers(prev => prev.map(u => u.id === user.id ? { ...u, profile: { ...u.profile, [field]: updated[field] } } : u))
        setSelectedUser(prev => prev && prev.id === user.id ? { ...prev, profile: { ...prev.profile, [field]: updated[field] } } : prev)
      }
    } catch (e) {
      console.error(`Failed to toggle ${field}`, e)
    } finally {
      setTogglingKey(null)
    }
  }

  useEffect(() => {
    setTitle("Registered Artists")
    
    const fetchUsers = async () => {
      try {
        const res = await fetch("/api/admin/users")
        if (res.ok) {
          const data = await res.json()
          setUsers(data)
        }
      } catch (e) {
        console.error("Failed to fetch users", e)
      } finally {
        setLoading(false)
      }
    }
    
    fetchUsers()
  }, [setTitle])

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-slate-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6 relative overflow-x-hidden">
      <div className="overflow-hidden rounded-[2rem] border border-slate-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="border-b border-slate-100 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-6 py-4 font-medium">Artist / Studio</th>
                <th className="px-6 py-4 font-medium">Contact</th>
                <th className="px-6 py-4 font-medium">Plan</th>
                <th className="px-6 py-4 font-medium">Customers</th>
                <th className="px-6 py-4 font-medium">Net Profit</th>
                <th className="px-6 py-4 font-medium">Joined Date</th>
                <th className="px-6 py-4 font-medium">Free User</th>
                <th className="px-6 py-4 font-medium">Test User</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center text-slate-500">
                    No registered users found.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="transition-colors hover:bg-slate-50/50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900 flex items-center gap-2">
                        {user.profile.artist_name}
                        {user.profile.is_free_user && (
                          <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-emerald-800 uppercase">Free Account</span>
                        )}
                        {user.profile.is_test_user && (
                          <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-amber-800 uppercase">Test Account</span>
                        )}
                      </div>
                      <div className="text-slate-500">{user.profile.studio_name}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-slate-900">{user.profile.phone}</div>
                      <div className="text-slate-500">{user.profile.email || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4">
                      {user.subscription ? (
                        <div className="space-y-1">
                          <div className="inline-flex items-center gap-1.5 rounded-full bg-purple-50 border border-purple-200 px-2.5 py-0.5 text-xs font-semibold text-purple-700">
                            <Crown className="size-3" />
                            {user.subscription.plan_name}
                          </div>
                          {user.subscription.days_left !== null && (
                            <div className="text-xs text-slate-400">{user.subscription.days_left}d left</div>
                          )}
                        </div>
                      ) : (
                        <div className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-500">
                          Free Trial
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-600">
                        {user.customers.total} customers
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className={cn("font-medium", user.financials.net_profit >= 0 ? "text-emerald-600" : "text-red-600")}>
                        {formatCurrency(user.financials.net_profit)}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {format(new Date(user.profile.created_at), "MMM d, yyyy")}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Switch 
                          checked={user.profile.is_free_user}
                          onCheckedChange={() => toggleUserField(user, "is_free_user")}
                          disabled={togglingKey !== null}
                        />
                        {togglingKey === `${user.id}-is_free_user` && <Loader2 className="size-3 animate-spin text-slate-400" />}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Switch 
                          checked={user.profile.is_test_user}
                          onCheckedChange={() => toggleUserField(user, "is_test_user")}
                          disabled={togglingKey !== null}
                        />
                        {togglingKey === `${user.id}-is_test_user` && <Loader2 className="size-3 animate-spin text-slate-400" />}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button 
                          variant="secondary" 
                          size="sm" 
                          className="rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-900"
                          onClick={() => setSelectedUser(user)}
                        >
                          View Details
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="rounded-xl text-red-500 hover:bg-red-50 hover:text-red-700 h-9 px-2.5"
                          title="Delete Artist"
                          onClick={(e) => {
                            e.stopPropagation()
                            openDeleteModal(user)
                          }}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Overlay Backdrop */}
      {selectedUser && (
        <div 
          className="fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-sm transition-opacity"
          onClick={() => setSelectedUser(null)}
        />
      )}

      {/* Slide-out Panel */}
      <div 
        className={cn(
          "fixed inset-y-0 right-0 z-50 w-full max-w-md md:max-w-xl transform bg-white shadow-2xl transition-transform duration-300 ease-in-out flex flex-col",
          selectedUser ? "translate-x-0" : "translate-x-full"
        )}
      >
        {selectedUser && (
          <>
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/50">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 flex-wrap">
                  {selectedUser.profile.artist_name}
                  {selectedUser.profile.is_free_user && (
                    <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-emerald-800 uppercase">Free Account</span>
                  )}
                  {selectedUser.profile.is_test_user && (
                    <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-amber-800 uppercase">Test Account</span>
                  )}
                </h2>
                <p className="text-sm text-slate-500">{selectedUser.profile.studio_name}</p>
              </div>
              <Button size="icon" variant="ghost" onClick={() => setSelectedUser(null)} className="rounded-full hover:bg-slate-200">
                <X className="size-5 text-slate-500" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar pb-24">
              
              {/* Account Privileges / Toggles */}
              <section className="space-y-3">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Account Privileges</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-emerald-50/40 border border-emerald-100">
                    <div>
                      <div className="text-xs font-semibold text-slate-900">Free User</div>
                      <div className="text-[11px] text-slate-500">100MB, full access</div>
                    </div>
                    <Switch 
                      checked={selectedUser.profile.is_free_user}
                      onCheckedChange={() => toggleUserField(selectedUser, "is_free_user")}
                      disabled={togglingKey !== null}
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-amber-50/40 border border-amber-100">
                    <div>
                      <div className="text-xs font-semibold text-slate-900">Test User</div>
                      <div className="text-[11px] text-slate-500">OTP 123456 bypass</div>
                    </div>
                    <Switch 
                      checked={selectedUser.profile.is_test_user}
                      onCheckedChange={() => toggleUserField(selectedUser, "is_test_user")}
                      disabled={togglingKey !== null}
                    />
                  </div>
                </div>
              </section>

              {/* Profile Section */}
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                    <User className="size-4" /> Basic Profile
                  </h3>
                </div>
                <div className="grid gap-4 rounded-2xl border border-slate-100 bg-slate-50/50 p-4 text-sm">
                  <div className="grid grid-cols-3 gap-2">
                    <span className="text-slate-500 flex items-center gap-2"><Phone className="size-3.5"/> Phone</span>
                    <span className="col-span-2 font-medium text-slate-900">{selectedUser.profile.phone}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <span className="text-slate-500 flex items-center gap-2"><Mail className="size-3.5"/> Email</span>
                    <span className="col-span-2 font-medium text-slate-900">{selectedUser.profile.email || "N/A"}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <span className="text-slate-500 flex items-center gap-2"><MapPin className="size-3.5"/> Address</span>
                    <span className="col-span-2 font-medium text-slate-900">{selectedUser.profile.address}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <span className="text-slate-500 flex items-center gap-2"><Calendar className="size-3.5"/> Joined</span>
                    <span className="col-span-2 font-medium text-slate-900">{format(new Date(selectedUser.profile.created_at), "PPP")}</span>
                  </div>
                </div>
              </section>

              {/* Customers & Bookings Section */}
              <section className="space-y-4">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-blue-500 flex items-center gap-2">
                  <CalendarCheck className="size-4" /> Customers & Bookings
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-2xl border border-blue-100 bg-blue-50/30 p-4">
                    <div className="text-xs font-medium text-blue-600 mb-1">Total Customers</div>
                    <div className="text-2xl font-bold text-slate-900">{selectedUser.customers.total}</div>
                  </div>
                  <div className="rounded-2xl border border-blue-100 bg-blue-50/30 p-4">
                    <div className="text-xs font-medium text-blue-600 mb-1">Total Bookings</div>
                    <div className="text-2xl font-bold text-slate-900">{selectedUser.bookings.total}</div>
                  </div>
                </div>
                {selectedUser.bookings.total > 0 && (
                  <div className="rounded-2xl border border-slate-100 p-4 text-sm space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Confirmed</span>
                      <span className="font-semibold text-emerald-600">{selectedUser.bookings.confirmed}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Completed</span>
                      <span className="font-semibold text-blue-600">{selectedUser.bookings.completed}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Pending / Cancelled</span>
                      <span className="font-medium text-slate-900">{selectedUser.bookings.pending} / {selectedUser.bookings.cancelled}</span>
                    </div>
                    {selectedUser.bookings.last_booking_date && (
                      <div className="pt-2 mt-2 border-t border-slate-100 flex justify-between items-center text-xs">
                        <span className="text-slate-400">Latest Booking</span>
                        <span className="text-slate-600">{format(new Date(selectedUser.bookings.last_booking_date), "MMM d, yyyy")}</span>
                      </div>
                    )}
                  </div>
                )}
              </section>

              {/* Financial Health Section */}
              <section className="space-y-4">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-emerald-500 flex items-center gap-2">
                  <IndianRupee className="size-4" /> Financial Health
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50/30 p-4">
                    <div className="text-xs font-medium text-emerald-600 mb-1">Net Profit</div>
                    <div className="text-xl font-bold text-slate-900">{formatCurrency(selectedUser.financials.net_profit)}</div>
                  </div>
                  <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
                    <div className="text-xs font-medium text-slate-500 mb-1 flex items-center gap-1"><Briefcase className="size-3"/> Services Offered</div>
                    <div className="text-xl font-bold text-slate-900">{selectedUser.financials.services_offered}</div>
                  </div>
                </div>
                <div className="flex gap-4 p-4 rounded-2xl bg-slate-50/50 border border-slate-100">
                  <div className="flex-1">
                    <div className="text-xs text-slate-500 mb-1">Total Revenue</div>
                    <div className="font-semibold text-emerald-600">{formatCurrency(selectedUser.financials.total_revenue)}</div>
                  </div>
                  <div className="w-px bg-slate-200" />
                  <div className="flex-1">
                    <div className="text-xs text-slate-500 mb-1">Total Expenses</div>
                    <div className="font-semibold text-red-500">{formatCurrency(selectedUser.financials.total_expenses)}</div>
                  </div>
                </div>
              </section>

              {/* Platform Subscription Section */}
              <section className="space-y-4">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-[#7c3aed] flex items-center gap-2">
                  <Crown className="size-4" /> Platform Subscription
                </h3>
                {selectedUser.subscription ? (
                  <div className="rounded-2xl border border-purple-100 bg-purple-50/30 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-bold text-slate-900 text-base">{selectedUser.subscription.plan_name}</div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          ₹{selectedUser.subscription.amount_inr.toLocaleString('en-IN')}{selectedUser.subscription.billing_period}
                        </div>
                      </div>
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
                        <BadgeCheck className="size-3" /> Active
                      </span>
                    </div>
                    <div className="border-t border-purple-100 pt-3 space-y-2 text-sm">
                      {selectedUser.subscription.days_left !== null && (
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500 flex items-center gap-1.5"><Clock className="size-3.5" /> Days Remaining</span>
                          <span className="font-semibold text-[#7c3aed]">{selectedUser.subscription.days_left} days</span>
                        </div>
                      )}
                      {selectedUser.subscription.current_period_start && (
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500">Started</span>
                          <span className="font-medium text-slate-900">{format(new Date(selectedUser.subscription.current_period_start), 'MMM d, yyyy')}</span>
                        </div>
                      )}
                      {selectedUser.subscription.next_billing_at && (
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500">Next Billing</span>
                          <span className="font-medium text-slate-900">{format(new Date(selectedUser.subscription.next_billing_at), 'MMM d, yyyy')}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4 flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-xl bg-slate-100">
                      <Crown className="size-5 text-slate-400" />
                    </div>
                    <div>
                      <div className="font-semibold text-slate-700 text-sm">Free Trial</div>
                      <div className="text-xs text-slate-400">No active paid subscription</div>
                    </div>
                  </div>
                )}
              </section>

              {/* Storage & Media Section */}
              <section className="space-y-4">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-purple-500 flex items-center gap-2">
                  <HardDrive className="size-4" /> Storage & Media
                </h3>
                <div className="rounded-2xl border border-purple-100 bg-purple-50/30 p-4 space-y-4">
                  <div className="flex justify-between items-end">
                    <div>
                      <div className="text-xs font-medium text-purple-600 mb-1">Storage Usage</div>
                      <div className="text-2xl font-bold text-slate-900">
                        {formatBytes(selectedUser.storage.used)}
                      </div>
                    </div>
                    <div className="text-right text-xs text-slate-500 mb-1">
                      of {formatBytes(selectedUser.storage.free_quota + selectedUser.storage.purchased_quota)}
                    </div>
                  </div>
                  {/* Progress Bar Mock */}
                  <div className="h-2 w-full bg-purple-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-purple-500 transition-all"
                      style={{ 
                        width: `${Math.min(100, (selectedUser.storage.used / Math.max(1, selectedUser.storage.free_quota + selectedUser.storage.purchased_quota)) * 100)}%` 
                      }}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
                    <div className="text-xs font-medium text-slate-500 mb-1">Active Plans</div>
                    <div className="text-lg font-bold text-slate-900">{selectedUser.storage.active_plans}</div>
                  </div>
                  <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
                    <div className="text-xs font-medium text-slate-500 mb-1">Total Spent</div>
                    <div className="text-lg font-bold text-slate-900">{formatCurrency(selectedUser.storage.total_spent)}</div>
                  </div>
                </div>
              </section>

              {/* Danger Zone: Delete Artist */}
              <section className="pt-4 border-t border-slate-100">
                <Button
                  variant="outline"
                  className="w-full h-11 rounded-xl border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-300 font-semibold flex items-center justify-center gap-2"
                  onClick={() => openDeleteModal(selectedUser)}
                >
                  <Trash2 className="size-4" />
                  Delete Artist & All Records
                </Button>
              </section>

            </div>
          </>
        )}
      </div>

      {/* 2FA Delete Confirmation Modal */}
      {deleteTargetUser && (
        <>
          <div
            className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-sm animate-in fade-in"
            onClick={() => {
              if (!deletingId) {
                setDeleteTargetUser(null)
                setAdminOtp("")
                setOtpSent(false)
              }
            }}
          />
          <div className="fixed left-1/2 top-1/2 z-[61] w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-3xl bg-white p-7 shadow-2xl shadow-slate-900/20 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex flex-col items-center text-center">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-red-50 mb-4">
                <ShieldAlert className="size-7 text-red-500" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                Delete Artist & All Records
              </h3>
              <p className="mt-1.5 text-sm text-slate-500 leading-relaxed">
                You are about to permanently delete <span className="font-semibold text-slate-800">{deleteTargetUser.profile.artist_name}</span> ({deleteTargetUser.profile.studio_name}).
              </p>

              <div className="mt-3.5 p-3 rounded-2xl bg-red-50/70 border border-red-100 text-xs text-red-700 text-left w-full space-y-1">
                <div className="font-semibold text-red-800">Permanent data deletion:</div>
                <ul className="list-disc list-inside text-red-600 space-y-0.5">
                  <li>All customers, bookings, and payments</li>
                  <li>All services, courses, and students</li>
                  <li>All portfolio files and photos from cloud storage</li>
                  <li>Subscriptions and billing records</li>
                </ul>
              </div>

              {/* 2FA OTP Step */}
              <div className="mt-5 w-full text-left space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <KeyRound className="size-3.5 text-purple-600" /> Admin Security OTP
                  </label>
                  {otpSent && (
                    <button
                      type="button"
                      onClick={handleSendAdminOtp}
                      disabled={otpCooldown > 0 || sendingOtp}
                      className="text-xs text-[#7c3aed] hover:text-[#6d28d9] font-semibold disabled:text-slate-400"
                    >
                      {otpCooldown > 0 ? `Resend in ${otpCooldown}s` : "Resend OTP"}
                    </button>
                  )}
                </div>

                {!otpSent ? (
                  <Button
                    type="button"
                    onClick={handleSendAdminOtp}
                    disabled={sendingOtp}
                    className="w-full h-11 rounded-xl bg-[#7c3aed] hover:bg-[#6d28d9] text-white font-semibold flex items-center justify-center gap-2 shadow-md shadow-purple-600/20"
                  >
                    {sendingOtp ? (
                      <>
                        <Loader2 className="size-4 animate-spin" /> Sending WhatsApp OTP...
                      </>
                    ) : (
                      <>
                        <Send className="size-4" /> Send OTP to WhatsApp (+91 9313202075)
                      </>
                    )}
                  </Button>
                ) : (
                  <div className="space-y-2">
                    <div className="relative w-full">
                      <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
                      <Input
                        type="text"
                        maxLength={6}
                        placeholder="Enter 6-digit OTP"
                        value={adminOtp}
                        onChange={(e) => setAdminOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        className="pl-10 h-11 text-center font-mono tracking-widest text-base rounded-xl border-slate-200 bg-slate-50 focus:bg-white"
                        autoFocus
                      />
                    </div>
                    <p className="text-[11px] text-slate-500 leading-normal">
                      Security OTP dispatched to <span className="font-semibold text-slate-700">+91 9313202075</span> via WhatsApp.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <Button
                variant="outline"
                className="flex-1 h-11 rounded-xl border-slate-200"
                onClick={() => {
                  setDeleteTargetUser(null)
                  setAdminOtp("")
                  setOtpSent(false)
                }}
                disabled={deletingId !== null}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 h-11 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold shadow-md shadow-red-600/20"
                onClick={handleDeleteUser}
                disabled={!otpSent || adminOtp.length !== 6 || deletingId !== null}
              >
                {deletingId !== null ? (
                  <>
                    <Loader2 className="size-4 animate-spin mr-2" /> Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="size-4 mr-2" /> Verify & Delete
                  </>
                )}
              </Button>
            </div>
          </div>
        </>
      )}

    </div>
  )
}
