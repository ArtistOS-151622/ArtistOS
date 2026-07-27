import { cn } from "@/lib/utils"

type PrimaryButtonProps = {
  href?: string
  onClick?: () => void
  children: React.ReactNode
  className?: string
  type?: "button" | "submit" | "reset"
}

/**
 * Brand primary CTA button — purple, rounded-md, h-11.
 * Renders as an <a> when `href` is provided, otherwise a <button>.
 */
export function PrimaryButton({
  href,
  onClick,
  children,
  className,
  type = "button",
}: PrimaryButtonProps) {
  const base =
    "inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[#7c3aed] px-5 text-sm font-semibold text-white shadow-lg shadow-[#7c3aed]/20 transition hover:bg-[#6d28d9]"

  if (href) {
    return (
      <a href={href} className={cn(base, className)} suppressHydrationWarning>
        {children}
      </a>
    )
  }

  return (
    <button type={type} onClick={onClick} className={cn(base, className)}>
      {children}
    </button>
  )
}
