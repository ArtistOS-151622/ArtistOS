"use client"

import { useEffect } from "react"

/**
 * Plays the scroll-reveal animations defined in `globals.css`.
 *
 * Every element carrying a `data-reveal="<variant>"` attribute starts hidden.
 * Once it scrolls into view this sets `data-revealed="true"`, which triggers the
 * matching keyframes. Elements are unobserved after revealing so they animate once.
 *
 * A MutationObserver picks up elements that mount later (e.g. the pricing cards,
 * which only render once SWR resolves), so they animate too instead of staying hidden.
 *
 * Call from a client component that wraps the animated markup (e.g. the landing page).
 */
export function useScrollReveal() {
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches

    const reveal = (el: Element) => el.setAttribute("data-revealed", "true")

    // No IntersectionObserver (or motion is unwanted): show everything, now and later.
    if (prefersReducedMotion || typeof IntersectionObserver === "undefined") {
      const showAll = () => document.querySelectorAll("[data-reveal]").forEach(reveal)
      showAll()
      const mutationObserver = new MutationObserver(showAll)
      mutationObserver.observe(document.body, { childList: true, subtree: true })
      return () => mutationObserver.disconnect()
    }

    const intersectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          reveal(entry.target)
          intersectionObserver.unobserve(entry.target)
        })
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    )

    const register = (el: Element) => {
      if (el.hasAttribute("data-revealed")) return

      const rect = el.getBoundingClientRect()

      // Display:none at this breakpoint (e.g. the desktop-only pricing grid on mobile).
      // Reveal it outright so it is never stuck invisible if it later becomes visible.
      if (rect.height === 0 && rect.width === 0) {
        reveal(el)
        return
      }

      // Anything already on screen reveals right away rather than waiting for a scroll.
      if (rect.top < window.innerHeight && rect.bottom > 0) {
        reveal(el)
        return
      }

      intersectionObserver.observe(el)
    }

    const scan = () => document.querySelectorAll("[data-reveal]").forEach(register)

    scan()

    // Catch elements rendered after mount (async data, breakpoint switches).
    const mutationObserver = new MutationObserver(scan)
    mutationObserver.observe(document.body, { childList: true, subtree: true })

    return () => {
      intersectionObserver.disconnect()
      mutationObserver.disconnect()
    }
  }, [])
}
