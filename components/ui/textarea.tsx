import * as React from "react"
import { cn } from "@/lib/utils"

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[60px] w-full rounded-lg border border-slate-200/80 bg-white px-3 py-2 text-sm shadow-sm transition-all duration-200 outline-none placeholder:text-slate-400 focus-visible:bg-[#faf8ff] focus-visible:border-[#7c3aed] focus-visible:shadow-[0_0_0_4px_rgba(124,58,237,0.10),0_1px_3px_rgba(0,0,0,0.06)] disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-slate-50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }
