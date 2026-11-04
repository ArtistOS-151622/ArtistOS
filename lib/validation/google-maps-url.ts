const GOOGLE_HOST_PATTERN = /^(?:[a-z0-9-]+\.)*google\.(?:[a-z]{2,3}|com\.[a-z]{2}|co\.[a-z]{2})$/i

export const GOOGLE_MAPS_URL_ERROR = "Enter a valid HTTPS Google Maps link."

export function isGoogleMapsUrl(value: string): boolean {
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
