"use client"

import { useEffect, useState } from "react"
import { useHeaderContext } from "@/components/common/dashboard/dashboard-header-context"
import { Loader2, X, Search, User, Receipt, ShieldCheck, Mail, Phone, Database, Filter, Calendar } from "lucide-react"
import { format } from "date-fns"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

type PurchaseHistory = {
  id: number
  storage_bytes: number
  base_amount: number
  amount: number
  rp_order_id: string | null
  rp_payment_id: string | null
  rp_subscription_id: string | null
  payment_method: string | null
  quantity: number
  status: string
  created_at: string
  storage_plans: {
    name: string
  } | null
}

type UserStorageData = {
  id: number
  artist: {
    name: string
    studio: string
    phone: string
    email: string
  }
  storage: {
    free: number
    purchased: number
    used: number
  }
  status: string
  total_spent: number
  history: PurchaseHistory[]
}

const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(amount)
}

export default function AdminStoragePage() {
  const { setTitle } = useHeaderContext()
  const [users, setUsers] = useState<UserStorageData[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState<UserStorageData | null>(null)
  
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  useEffect(() => {
    setTitle("Storage Subscriptions")
    
    const fetchUsers = async () => {
      try {
        const res = await fetch("/api/admin/storage")
        if (res.ok) {
          const data = await res.json()
          setUsers(data)
        }
      } catch (e) {
        console.error("Failed to fetch storage data", e)
      } finally {
        setLoading(false)
      }
    }
    
    fetchUsers()
  }, [setTitle])

  const filteredUsers = users.filter(u => {
    const matchesSearch = 
      u.artist?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.artist?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.artist?.studio?.toLowerCase().includes(searchTerm.toLowerCase())
      
    const matchesStatus = statusFilter === "all" || u.status.toLowerCase() === statusFilter.toLowerCase()
    
    return matchesSearch && matchesStatus
  })

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-slate-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6 relative overflow-x-hidden">
      
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search artists, studios, emails..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-10 pl-9 pr-4 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all shadow-sm"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <DropdownMenu>
            <DropdownMenuTrigger className={cn(buttonVariants({ variant: "outline" }), "h-10 rounded-xl px-3 flex gap-2 border-slate-200 shadow-sm text-slate-700 w-full sm:w-auto justify-between font-normal bg-white")}>
              <div className="flex items-center gap-2">
                <Filter className="size-4 text-slate-400" />
                <span>
                  {statusFilter === "all" ? "All Statuses" : 
                   statusFilter === "active" ? "Active (Bought Plan)" : 
                   "Pending (No Purchases)"}
                </span>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-xl">
              <DropdownMenuRadioGroup value={statusFilter} onValueChange={setStatusFilter}>
                <DropdownMenuRadioItem value="all" className="rounded-lg">All Statuses</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="active" className="rounded-lg">Active (Bought Plan)</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="pending" className="rounded-lg">Pending (No Purchases)</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="overflow-hidden rounded-[2rem] border border-slate-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="border-b border-slate-100 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-6 py-4 font-medium">Artist / Studio</th>
                <th className="px-6 py-4 font-medium">Storage Quota</th>
                <th className="px-6 py-4 font-medium">Total Spent</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                    No matching users found.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="transition-colors hover:bg-slate-50/50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">{user.artist?.name || 'Unknown Artist'}</div>
                      <div className="text-slate-500">{user.artist?.studio || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">{formatBytes(user.storage.free + user.storage.purchased)}</div>
                      <div className="text-slate-500 text-xs">{formatBytes(user.storage.used)} used</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">{formatCurrency(user.total_spent)}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className={cn(
                        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize",
                        user.status === 'active' ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                      )}>
                        {user.status}
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
                <h2 className="text-lg font-bold text-slate-900">Purchase History</h2>
                <p className="text-sm text-slate-500">{selectedUser.artist.name}</p>
              </div>
              <Button size="icon" variant="ghost" onClick={() => setSelectedUser(null)} className="rounded-full hover:bg-slate-200">
                <X className="size-5 text-slate-500" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar pb-24">
              
              {/* Artist Section */}
              <section className="space-y-4">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <User className="size-4" /> Billed To
                </h3>
                <div className="grid gap-4 rounded-2xl border border-slate-100 bg-slate-50/50 p-4 text-sm">
                  <div className="grid grid-cols-3 gap-2">
                    <span className="text-slate-500 flex items-center gap-2"><User className="size-3.5"/> Name</span>
                    <span className="col-span-2 font-medium text-slate-900">{selectedUser.artist.name} ({selectedUser.artist.studio})</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <span className="text-slate-500 flex items-center gap-2"><Phone className="size-3.5"/> Phone</span>
                    <span className="col-span-2 font-medium text-slate-900">{selectedUser.artist.phone}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <span className="text-slate-500 flex items-center gap-2"><Mail className="size-3.5"/> Email</span>
                    <span className="col-span-2 font-medium text-slate-900">{selectedUser.artist.email || "N/A"}</span>
                  </div>
                </div>
              </section>

              {/* Purchase History */}
              <section className="space-y-4">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-purple-500 flex items-center gap-2">
                  <Receipt className="size-4" /> Successful Transactions
                </h3>
                
                {selectedUser.history.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-slate-500 bg-slate-50/50">
                    <Receipt className="size-8 mx-auto mb-2 opacity-50" />
                    This user has not purchased any storage plans yet.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {selectedUser.history.map((purchase) => (
                      <div key={purchase.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                        <div className="flex justify-between items-start border-b border-slate-100 pb-4">
                          <div>
                            <h4 className="font-bold text-slate-900 text-base">{purchase.storage_plans?.name || 'Custom Plan'}</h4>
                            <div className="flex items-center gap-2 text-slate-500 text-xs mt-1">
                              <Calendar className="size-3.5" />
                              {format(new Date(purchase.created_at), "PPP 'at' p")}
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-emerald-600 text-lg">{formatCurrency(purchase.amount)}</span>
                            <div className="text-xs text-slate-400 mt-0.5 uppercase tracking-wider font-semibold">
                              {purchase.payment_method || 'N/A'}
                            </div>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-slate-500 block text-xs uppercase tracking-wider mb-1">Storage Added</span>
                            <span className="font-medium flex items-center gap-1.5"><Database className="size-3.5 text-blue-500"/> {formatBytes(purchase.storage_bytes)} (Qty: {purchase.quantity})</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block text-xs uppercase tracking-wider mb-1">Status</span>
                            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold capitalize bg-emerald-50 text-emerald-600">
                              {purchase.status}
                            </span>
                          </div>
                        </div>

                        <div className="rounded-xl bg-slate-50 p-3 space-y-1.5 text-xs font-mono mt-2">
                          <div className="flex justify-between">
                            <span className="text-slate-400 font-sans">Order ID:</span>
                            <span className="text-slate-700 select-all">{purchase.rp_order_id || 'N/A'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400 font-sans">Payment ID:</span>
                            <span className="text-slate-700 select-all">{purchase.rp_payment_id || 'N/A'}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

            </div>
          </>
        )}
      </div>

    </div>
  )
}
