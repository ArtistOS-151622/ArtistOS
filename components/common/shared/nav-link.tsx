import { cn } from "@/lib/utils"

type NavLinkProps = {
  href: string
  children: React.ReactNode
  className?: string
}

export function NavLink({ href, children, className }: NavLinkProps) {
  return (
    <a
      href={href}
      className={cn(
        "transition hover:text-[#7c3aed]",
        className
      )}
      suppressHydrationWarning
    >
      {children}
    </a>
  )
}
