import type { MetadataRoute } from "next"

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.artistos.in"
  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/login",
          "/signup",
          "/portfolio/",
          "/privacy-policy",
          "/terms-and-conditions",
          "/cancellation-and-refund",
          "/contact",
          "/help-and-support",
        ],
        disallow: [
          "/api/",
          "/(dashboard)/",
          "/admin/",
          "/maintenance/",
          "/_next/",
        ],
      },
      // Allow AI crawlers to index public content for GEO
      {
        userAgent: "GPTBot",
        allow: ["/"],
        disallow: ["/api/", "/(dashboard)/", "/admin/"],
      },
      {
        userAgent: "ChatGPT-User",
        allow: ["/"],
        disallow: ["/api/", "/(dashboard)/", "/admin/"],
      },
      {
        userAgent: "Google-Extended",
        allow: ["/"],
        disallow: ["/api/", "/(dashboard)/", "/admin/"],
      },
      {
        userAgent: "Anthropic",
        allow: ["/"],
        disallow: ["/api/", "/(dashboard)/", "/admin/"],
      },
      {
        userAgent: "ClaudeBot",
        allow: ["/"],
        disallow: ["/api/", "/(dashboard)/", "/admin/"],
      },
      {
        userAgent: "PerplexityBot",
        allow: ["/"],
        disallow: ["/api/", "/(dashboard)/", "/admin/"],
      },
      {
        userAgent: "Bytespider",
        allow: ["/"],
        disallow: ["/api/", "/(dashboard)/", "/admin/"],
      },
      {
        userAgent: "CCBot",
        allow: ["/"],
        disallow: ["/api/", "/(dashboard)/", "/admin/"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  }
}
