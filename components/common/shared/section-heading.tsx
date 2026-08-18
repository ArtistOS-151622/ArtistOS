import { cn } from "@/lib/utils"

type SectionHeadingProps = {
  eyebrow?: string
  title: string
  description?: string
  className?: string
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  className,
}: SectionHeadingProps) {
  return (
    <div className={cn("mx-auto text-center", className)}>
      {eyebrow ? (
        <p className="text-sm font-semibold text-primary">{eyebrow}</p>
      ) : null}
      <h2 className="mt-3 text-4xl font-semibold tracking-tight text-[#282a47] sm:text-5xl">
        {title}
      </h2>
      {description ? (
        <p className="mt-5 leading-7 text-[#666a82]">{description}</p>
      ) : null}
    </div>
  )
}
