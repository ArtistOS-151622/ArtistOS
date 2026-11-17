import { z } from "zod"

const GOOGLE_HOST_PATTERN = /^(?:[a-z0-9-]+\.)*google\.(?:[a-z]{2,3}|com\.[a-z]{2}|co\.[a-z]{2})$/i

export const GOOGLE_MAPS_URL_ERROR = "Enter a valid HTTPS Google Maps link."
const REQUIRED_FIELDS_ERROR = "Artist name, studio name, and address are required"

/** HTTPS Google Maps link: maps.google.<tld>, google.<tld>/maps..., maps.app.goo.gl or goo.gl/maps. Same rule as the frontend. */
export function isGoogleMapsUrl(value) {
  try {
    const url = new URL(value.trim())
    const hostname = url.hostname.toLowerCase()

    if (url.protocol !== "https:") return false
    if (hostname === "maps.app.goo.gl") return url.pathname.length > 1
    if (hostname === "goo.gl") return url.pathname.toLowerCase().startsWith("/maps/")
    if (!GOOGLE_HOST_PATTERN.test(hostname)) return false

    return hostname.startsWith("maps.google.") || url.pathname.toLowerCase().startsWith("/maps")
  } catch {
    return false
  }
}

// Any truthy value passes, like the Next.js route (no trimming).
const requiredValue = z.unknown().optional().refine(Boolean, { message: REQUIRED_FIELDS_ERROR })

export const updateProfileSchema = {
  body: z.object({
    artist_name: requiredValue,
    studio_name: requiredValue,
    address: requiredValue,
    // Left undefined when absent so the column isn't touched.
    email: z.unknown().optional(),
    // .optional() before .transform(): zod 4 otherwise rejects a missing key.
    google_maps_url: z
      .unknown()
      .optional()
      .transform((value) => (typeof value === "string" ? value.trim() : "") || null)
      .refine((value) => value === null || isGoogleMapsUrl(value), { message: GOOGLE_MAPS_URL_ERROR }),
    // `phone` is deliberately not accepted: it can't be changed here.
  }),
}
