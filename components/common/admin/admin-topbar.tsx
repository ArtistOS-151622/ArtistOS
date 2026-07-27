"use client"

import { useHeaderContext } from "@/components/common/dashboard/dashboard-header-context"
import { Shield } from "lucide-react"

export function AdminTopbar() {
  const { title, actionsSlot } = useHeaderContext()

  return (
    <header className="flex h-14 items-center justify-between gap-4 rounded-[1.5rem] lg:rounded-[2rem] border border-slate-100 bg-white px-4 lg:px-6 shadow-sm">
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex items-center justify-center size-8 rounded-full bg-red-100 text-red-600 shrink-0">
          <Shield className="size-4" />
        </div>
        <h1 className="text-lg lg:text-xl font-bold tracking-tight text-slate-900 truncate">
          {title || "Admin Panel"}
        </h1>
      </div>
      
      {actionsSlot && (
        <div className="flex items-center gap-3 shrink-0">
          {actionsSlot}
        </div>
      )}
    </header>
  )
}
