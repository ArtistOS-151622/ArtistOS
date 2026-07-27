"use client"

import { useEffect, useState } from "react"
import { useHeaderContext } from "@/components/common/dashboard/dashboard-header-context"
import { UsersRound, CreditCard, HardDrive, Loader2, ArrowRight } from "lucide-react"
import { Button, buttonVariants } from "@/components/ui/button"
import Link from "next/link"

type Stats = {
  users: number
  payments: number
  storagePurchases: number
}

export default function AdminOverview() {
  const { setTitle } = useHeaderContext()
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setTitle("Platform Overview")

    const fetchStats = async () => {
      try {
        const res = await fetch("/api/admin/stats")
        if (res.ok) {
          const data = await res.json()
          setStats(data)
        }
      } catch (e) {
        console.error("Failed to fetch stats", e)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [setTitle])

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-slate-400" />
      </div>
    )
  }

  const statCards = [
    {
      title: "Total Registered Artists",
      value: stats?.users || 0,
      icon: UsersRound,
      color: "text-blue-600",
      bg: "bg-blue-50",
      border: "border-blue-100",
      href: "/admin/users"
    },
    {
      title: "Total Payments Processed",
      value: stats?.payments || 0,
      icon: CreditCard,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      border: "border-emerald-100",
      href: "/admin/payments"
    },
    {
      title: "Storage Subscriptions",
      value: stats?.storagePurchases || 0,
      icon: HardDrive,
      color: "text-purple-600",
      bg: "bg-purple-50",
      border: "border-purple-100",
      href: "/admin/storage"
    }
  ]

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        {statCards.map((card, idx) => (
          <div key={idx} className={`relative flex flex-col justify-between overflow-hidden rounded-[2rem] border bg-white p-6 shadow-sm ${card.border}`}>
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-500">{card.title}</p>
                <p className="text-4xl font-bold text-slate-900">{card.value}</p>
              </div>
              <div className={`flex size-12 items-center justify-center rounded-2xl ${card.bg} ${card.color}`}>
                <card.icon className="size-6" />
              </div>
            </div>
            <div className="mt-6">
              <Link 
                href={card.href}
                className={buttonVariants({ variant: "ghost", className: "w-full justify-between rounded-xl px-0 hover:bg-transparent hover:text-slate-900" })}
              >
                View Details
                <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
