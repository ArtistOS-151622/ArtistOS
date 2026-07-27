"use client"

/**
 * Hero email-capture CTA form.
 * A pill-shaped container with an email input on the left and
 * a "Try for Free" primary button on the right.
 */
export function EmailCtaForm() {
  return (
    <form className="mt-7 flex max-w-md rounded-sm bg-[#f3f5ff] p-2">
      <label htmlFor="hero-email" className="sr-only">
        Email address
      </label>
      <input
        id="hero-email"
        type="email"
        placeholder="Enter your email"
        className="min-w-0 flex-1 bg-transparent px-3 text-sm text-[#232542] outline-none placeholder:text-[#898daa]"
      />
      <button
        type="button"
        className="inline-flex h-10 items-center justify-center rounded-md bg-[#7c3aed] px-5 text-sm font-semibold text-white shadow-lg shadow-[#7c3aed]/20 transition hover:bg-[#6d28d9]"
      >
        Try for Free
      </button>
    </form>
  )
}
