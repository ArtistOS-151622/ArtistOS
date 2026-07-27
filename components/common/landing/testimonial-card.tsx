import { Star } from "lucide-react"

type TestimonialCardProps = {
  name: string
  role: string
  text: string
}

/**
 * A single testimonial card with star rating, verified badge, quote, and author.
 * Used in the Testimonials marquee section.
 */
export function TestimonialCard({ name, role, text }: TestimonialCardProps) {
  return (
    <article className="w-[340px] shrink-0 rounded-2xl border border-[#edf0fa] bg-white p-6 shadow-sm shadow-[#aeb5d2]/15 sm:w-[420px]">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex text-[#ffcc36]">
          {Array.from({ length: 5 }).map((_, index) => (
            <Star key={index} className="size-4 fill-current" />
          ))}
        </div>
        <span className="rounded-full bg-[#f3e8ff] px-3 py-1 text-xs font-semibold text-[#7c3aed]">
          Verified
        </span>
      </div>

      <p className="min-h-28 leading-7 text-[#555972]">{text}</p>

      <div className="mt-6 flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-full bg-[#7c3aed] text-sm font-semibold text-white">
          {name.charAt(0)}
        </div>
        <div>
          <p className="font-semibold">{name}</p>
          <p className="text-sm text-[#777b95]">{role}</p>
        </div>
      </div>
    </article>
  )
}
