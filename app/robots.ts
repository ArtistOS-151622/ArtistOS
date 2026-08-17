import type { MetadataRoute } from "next"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/login", "/signup", "/portfolio/"],
        disallow: [
          "/api/",
          "/(dashboard)/",
          "/admin/",
          "/maintenance/",
          "/_next/",
        ],
      },
    ],
    sitemap: "https://artistos.in/sitemap.xml",
    host: "https://artistos.in",
  }
}
