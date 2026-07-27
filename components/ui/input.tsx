import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

// ── Standard Input ────────────────────────────────────────────────────────────
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        // Layout & shape
        "h-9 w-full min-w-0 rounded-lg border border-slate-200/80 px-3 py-1",
        // Base appearance — white with a soft drop shadow for depth
        "bg-white text-[15px] text-foreground placeholder:text-slate-400",
        "shadow-sm shadow-slate-100",
        // Smooth transition on all visual properties
        "transition-all duration-200 outline-none",
        // Focus — lavender background tint + purple border + glow shadow (no ring)
        "focus-visible:bg-[#faf8ff] focus-visible:border-[#7c3aed]",
        "focus-visible:shadow-[0_0_0_4px_rgba(124,58,237,0.10),0_1px_3px_rgba(0,0,0,0.06)]",
        // Disabled
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-slate-50",
        // Invalid
        "aria-invalid:border-red-400 aria-invalid:shadow-[0_0_0_4px_rgba(239,68,68,0.10)]",
        // File input
        "file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
        className
      )}
      {...props}
    />
  )
}

// ── Phone Input ───────────────────────────────────────────────────────────────
// Renders a +91 country badge + numeric input inside a shared 36px wrapper.
// The wrapper carries focus-within styles so it behaves like a single input.
type PhoneInputProps = Omit<React.ComponentProps<"input">, "type"> & {
  countryCode?: string
}

function PhoneInput({
  className,
  countryCode = "+91",
  ...props
}: PhoneInputProps) {
  return (
    <div
      className={cn(
        "flex h-9 items-center gap-2 rounded-lg border border-slate-200/80 bg-white px-3 shadow-sm",
        "transition-all duration-200",
        // Mirror the Input focus glow on the wrapper when the inner input is focused
        "focus-within:border-[#7c3aed] focus-within:bg-[#faf8ff]",
        "focus-within:shadow-[0_0_0_4px_rgba(124,58,237,0.10),0_1px_3px_rgba(0,0,0,0.06)]"
      )}
    >
      <span className="shrink-0 rounded bg-[#f3e8ff] px-1.5 py-0.5 text-xs font-semibold text-[#7c3aed]">
        {countryCode}
      </span>
      <InputPrimitive
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        data-slot="input"
        className={cn(
          "h-full w-full border-0 bg-transparent p-0 outline-none",
          "text-[15px] font-semibold tracking-[0.1em] text-foreground",
          "placeholder:font-normal placeholder:tracking-normal placeholder:text-slate-400",
          "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...props}
      />
    </div>
  )
}

export { Input, PhoneInput }
