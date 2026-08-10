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
    <div
      className="absolute inset-0 z-[9000] cursor-not-allowed"
      style={{ pointerEvents: "all" }}
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        // Redirect to billing so user understands what to do
        router.push("/billing")
      }}
      title="Your free trial has ended. Please upgrade to continue."
    >
    </div>
  )
}
