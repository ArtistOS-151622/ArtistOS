import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ArtistOS",
    short_name: "ArtistOS",
    description:
      "Booking, CRM, portfolio, marketing, payment, and dashboard app for beauty artists.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#faf5ff",
    theme_color: "#7c3aed",
    icons: [
      {
        src: "/icons/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  }
}
