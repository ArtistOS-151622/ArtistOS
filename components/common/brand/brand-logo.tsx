import Link from "next/link"
import Image from "next/image"

import { cn } from "@/lib/utils"

type BrandLogoProps = {
  href?: string
  className?: string
  imageClassName?: string
  priority?: boolean
}

export function BrandLogo({
  href = "/",
  className,
  imageClassName,
  priority = false,
}: BrandLogoProps) {
  return (
    <Link
      href={href}
      className={cn("inline-flex items-center", className)}
      aria-label="ArtistOS home"
      suppressHydrationWarning
    >
      <Image
        src="/brand/artistos.svg"
        alt="ArtistOS"
        width={1186}
        height={487}
        priority={priority}
        className={cn("h-12 w-auto object-contain", imageClassName)}
      />
    </Link>
  )
}

export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex size-12 items-center justify-center rounded-2xl bg-white shadow-sm",
        className
      )}
    >
      <Image
        src="/brand/artistos-sort.svg"
        alt="ArtistOS"
        width={64}
        height={64}
        className="size-9 object-contain"
      />
    </span>
  )
}
