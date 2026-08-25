"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { FloatingInput } from "@/components/common/shared/floating-input"
import { BrandMark } from "@/components/common/brand/brand-logo"
import { ShieldAlert, Loader2 } from "lucide-react"

// Ensure we don't wrap login with AdminShell, so we export a custom layout here or just style it standalone
// Wait, the layout.tsx in app/admin/layout.tsx wraps everything in AdminShell.
// But we don't want AdminShell for login. Let's fix that by making login page absolute positioned and cover the whole screen, or we can move layout down to a (protected) group.
// Easiest is to just cover the screen.

export default function AdminLogin() {
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setFormErrors({})

    if (!password) {
      setFormErrors({ password: "Please fill out this field." })
      setLoading(false)
      return
    }

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      })

      if (res.ok) {
        router.push("/admin")
        router.refresh()
      } else {
        const data = await res.json()
        setError(data.error || "Login failed")
      }
    } catch (err) {
      setError("An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md space-y-8 rounded-[2rem] border border-slate-100 bg-white p-8 shadow-2xl shadow-red-950/5">
        <div className="flex flex-col items-center text-center">
          <BrandMark />
          <div className="mt-6 flex items-center gap-2 text-red-600">
            <ShieldAlert className="size-5" />
            <h1 className="text-xl font-bold tracking-tight">Admin Restricted Area</h1>
          </div>
          <p className="mt-2 text-sm text-slate-500">
            Please enter the administrator password to continue.
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6" noValidate>
          <FloatingInput
            id="password"
            label="Password"
            type="password"
            value={password}
            error={formErrors.password}
            onChange={(e) => {
              if (formErrors.password) setFormErrors({})
              setPassword(e.target.value)
            }}
            required
          />

          {error && (
            <div className="rounded-xl bg-red-50 p-3 text-sm text-red-600 border border-red-100">
              {error}
            </div>
          )}

          <Button 
            type="submit" 
            className="h-12 w-full rounded-xl bg-red-600 hover:bg-red-700" 
            disabled={loading}
          >
            {loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : "Access Dashboard"}
          </Button>
        </form>
      </div>
    </div>
  )
}
