import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ArtistOS — Business Software for artists",
    short_name: "ArtistOS",
    description:
      "ArtistOS is India's #1 all-in-one business app for artists. Manage bookings, clients CRM, portfolio gallery, payment tracking, and WhatsApp campaigns — built for nail artists, mehendi artists, bridal makeup artists, salon owners, and beauty freelancers.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#faf5ff",
    theme_color: "#7c3aed",
    categories: ["business", "productivity", "beauty", "lifestyle"],
    lang: "en-IN",
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

