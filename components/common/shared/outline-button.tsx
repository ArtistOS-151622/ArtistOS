import { cn } from "@/lib/utils"

type OutlineButtonProps = {
  href?: string
  onClick?: () => void
  children: React.ReactNode
  className?: string
  type?: "button" | "submit" | "reset"
}

/**
 * Secondary / ghost CTA button — white border, transparent background.
 * Used for secondary actions next to a PrimaryButton.
 * Renders as an <a> when `href` is provided, otherwise a <button>.
 */
export function OutlineButton({
  href,
  onClick,
  children,
  className,
  type = "button",
}: OutlineButtonProps) {
  const base =
    "inline-flex h-10 items-center justify-center rounded-md border border-white/60 px-5 text-sm font-semibold text-white transition hover:bg-white/10"

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
