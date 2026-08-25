"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"

/**
 * Hero email-capture CTA form.
 * A pill-shaped container with an email input on the left and
 * a "Try for Free" primary button on the right.
 */
export function EmailCtaForm() {
  const [email, setEmail] = useState("")
  const [error, setError] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) {
      setError("Please fill out this field.")
      return
    }
    // Handle submission...
  }

  return (
    <div className="relative max-w-md">
      <form onSubmit={handleSubmit} noValidate className="mt-7 flex rounded-sm bg-[#f3f5ff] p-2">
        <label htmlFor="hero-email" className="sr-only">
          Email address
        </label>
        <input
          id="hero-email"
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => {
            if (error) setError("")
            setEmail(e.target.value)
          }}
          className={cn(
            "min-w-0 flex-1 bg-transparent px-3 text-sm text-[#232542] outline-none placeholder:text-[#898daa]",
            error && "placeholder:text-red-400"
          )}
        />
        <button
          type="submit"
          className="inline-flex h-10 items-center justify-center rounded-md bg-[#7c3aed] px-5 text-sm font-semibold text-white shadow-lg shadow-[#7c3aed]/20 transition hover:bg-[#6d28d9]"
        >
          Try for Free
        </button>
      </form>
      {error && (
        <p className="absolute -bottom-6 left-2 text-xs text-red-500">{error}</p>
      )}
    </div>
  )
}
