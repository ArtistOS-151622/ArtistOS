"use client"

import { usePathname } from "next/navigation"
import { useRouter } from "next/navigation"

// Pages where we DON'T block actions (billing, profile, support are always accessible)
const EXEMPT_PATHS = ["/billing", "/profile", "/support"]

type Props = {
  isReadOnly: boolean
}

export function ReadOnlyOverlay({ isReadOnly }: Props) {
  const pathname = usePathname() ?? ""
  const router = useRouter()

  if (!isReadOnly) return null

  // Don't block on exempt pages
  const isExempt = EXEMPT_PATHS.some((p) => pathname.includes(p))
  if (isExempt) return null

  return (
    <div className="fixed top-0 left-0 right-0 bg-red-600 text-white z-[9000] px-4 py-2 text-center text-sm font-medium shadow-md flex items-center justify-center gap-2">
      Your subscription has expired. You are in read-only mode.
      <button
        onClick={() => router.push("/billing")}
        className="underline font-bold hover:text-red-100 transition-colors"
      >
        Upgrade now
      </button>
    </div>
  )
}
