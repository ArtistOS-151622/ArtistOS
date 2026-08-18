import { Quote, Star } from "lucide-react"

type TestimonialCardProps = {
  name: string
  role: string
  location: string
  text: string
  highlight: string
  accent: string
}

/**
 * A single testimonial card: rating, pull-quote, outcome highlight, and author.
 * Used in the Testimonials slider section.
 */
export function TestimonialCard({
  name,
  role,
  location,
  text,
  highlight,
  accent,
}: TestimonialCardProps) {
  return (
    <article className="flex h-full flex-col rounded-[1.5rem] border border-[#edf0fa] bg-white p-7 shadow-sm shadow-[#aeb5d2]/15 transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-[#aeb5d2]/20">
      <div className="flex items-center justify-between">
        <div className="flex text-[#ffcc36]">
          {Array.from({ length: 5 }).map((_, index) => (
            <Star key={index} className="size-4 fill-current" />
          ))}
        </div>
        <Quote className="size-7 shrink-0 opacity-15" style={{ color: accent }} />
      </div>

      <p className="mt-5 flex-1 leading-7 text-[#555972]">{text}</p>

      <p
        className="mt-5 inline-flex w-fit rounded-full px-3.5 py-1.5 text-xs font-bold"
        style={{ backgroundColor: `${accent}14`, color: accent }}
      >
        {highlight}
      </p>

      <div className="mt-6 flex items-center gap-3 border-t border-[#f0f1f8] pt-5">
        <div
          className="flex size-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
          style={{ backgroundColor: accent }}
        >
          {name
            .split(" ")
            .map((part) => part.charAt(0))
            .join("")
            .slice(0, 2)}
        </div>
        <div className="min-w-0">
          <p className="truncate font-semibold text-[#232542]">{name}</p>
          <p className="truncate text-sm text-[#777b95]">
            {role} · {location}
          </p>
        </div>
      </div>
    </article>
  )
}
