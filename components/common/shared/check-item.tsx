import { CheckCircle2 } from "lucide-react"

import { cn } from "@/lib/utils"

type CheckItemProps = {
  text: string
  className?: string
  /** Class applied to the CheckCircle2 icon. Defaults to brand green. */
  iconClassName?: string
}

/**
 * A single checklist item: a green CheckCircle2 icon followed by text.
 * Used in BusinessSection, SyncSection, and the auth form feature list.
 */
export function CheckItem({ text, className, iconClassName }: CheckItemProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 text-sm font-semibold text-[#3b3f62]",
        className
      )}
    >
      <CheckCircle2 className={cn("size-4 text-[#58c49f]", iconClassName)} />
      {text}
    </div>
  )
}
