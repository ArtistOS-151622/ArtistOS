import { config } from "#src/config/env.js"

/**
 * Public URL for an R2 object. `updatedAt` adds a `v=<ms>` cache-buster.
 * Without R2_PUBLIC_URL the storage path is returned unchanged.
 */
export function getPublicUrl(storagePath, updatedAt) {
  const base = config.r2.publicUrl?.replace(/\/$/, "")
  if (!base) return storagePath

  const url = `${base}/${storagePath}`
  if (!updatedAt) return url

  const ts = typeof updatedAt === "string" ? new Date(updatedAt).getTime() : updatedAt.getTime()
  const separator = url.includes("?") ? "&" : "?"
  return `${url}${separator}v=${ts}`
}
