import type { MetadataRoute } from "next"

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://artistos.in"

  // Use a fixed date for stable sitemap diffing by search engines
  const lastMod = new Date("2026-08-26")

  return [
    {
      url: baseUrl,
      lastModified: lastMod,
      changeFrequency: "weekly",
      priority: 1.0,
      alternates: {
        languages: { "en-IN": baseUrl },
      },
    },
    {
      url: `${baseUrl}/signup`,
      lastModified: lastMod,
      changeFrequency: "monthly",
      priority: 0.9,
      alternates: {
        languages: { "en-IN": `${baseUrl}/signup` },
      },
    },
    {
      url: `${baseUrl}/login`,
      lastModified: lastMod,
      changeFrequency: "monthly",
      priority: 0.6,
      alternates: {
        languages: { "en-IN": `${baseUrl}/login` },
      },
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: lastMod,
      changeFrequency: "monthly",
      priority: 0.7,
      alternates: {
        languages: { "en-IN": `${baseUrl}/contact` },
      },
    },
    {
      url: `${baseUrl}/help-and-support`,
      lastModified: lastMod,
      changeFrequency: "monthly",
      priority: 0.7,
      alternates: {
        languages: { "en-IN": `${baseUrl}/help-and-support` },
      },
    },
    {
      url: `${baseUrl}/privacy-policy`,
      lastModified: lastMod,
      changeFrequency: "monthly",
      priority: 0.5,
      alternates: {
        languages: { "en-IN": `${baseUrl}/privacy-policy` },
      },
    },
    {
      url: `${baseUrl}/terms-and-conditions`,
      lastModified: lastMod,
      changeFrequency: "monthly",
      priority: 0.5,
      alternates: {
        languages: { "en-IN": `${baseUrl}/terms-and-conditions` },
      },
    },
    {
      url: `${baseUrl}/cancellation-and-refund`,
      lastModified: lastMod,
      changeFrequency: "monthly",
      priority: 0.5,
      alternates: {
        languages: { "en-IN": `${baseUrl}/cancellation-and-refund` },
      },
    },
  ]
}
