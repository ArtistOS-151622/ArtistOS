"use client"

import { useEffect, useState } from "react"
import { useHeaderContext } from "@/components/common/dashboard/dashboard-header-context"
import { Loader2, X, User, Phone, MapPin, Mail, Calendar, HardDrive, IndianRupee, Briefcase, FileDigit, CalendarCheck, Crown, BadgeCheck, Clock } from "lucide-react"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
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
  const [toggling, setToggling] = useState(false)

  const toggleTestUser = async (user: UserData) => {
    try {
      setToggling(true)
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: user.id, is_test_user: !user.profile.is_test_user })
      })
      if (res.ok) {
        const { user: updated } = await res.json()
        setUsers(prev => prev.map(u => u.id === user.id ? { ...u, profile: { ...u.profile, is_test_user: updated.is_test_user } } : u))
        setSelectedUser(prev => prev && prev.id === user.id ? { ...prev, profile: { ...prev.profile, is_test_user: updated.is_test_user } } : prev)
      }
    } catch (e) {
      console.error("Failed to toggle test user", e)
    } finally {
      setToggling(false)
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
                <th className="px-6 py-4 font-medium">Test User</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-slate-500">
                    No registered users found.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="transition-colors hover:bg-slate-50/50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900 flex items-center gap-2">
                        {user.profile.artist_name}
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
                          checked={user.profile.is_test_user}
                          onCheckedChange={() => toggleTestUser(user)}
                          disabled={toggling}
                        />
                        {toggling && <Loader2 className="size-3 animate-spin text-slate-400" />}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button 
                        variant="secondary" 
                        size="sm" 
                        className="rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-900"
                        onClick={() => setSelectedUser(user)}
                      >
                        View Details
                      </Button>
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
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  {selectedUser.profile.artist_name}
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
                      {selectedUser.subscription.current_period_end && (
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500">Expires</span>
                          <span className="font-medium text-slate-900">{format(new Date(selectedUser.subscription.current_period_end), 'MMM d, yyyy')}</span>
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

            </div>
          </>
        )}
      </div>

    </div>
  )
}
