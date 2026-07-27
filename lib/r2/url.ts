export function getPublicUrl(storagePath: string, updatedAt?: string | Date): string {
  const base = process.env.R2_PUBLIC_URL?.replace(/\/$/, "")
  if (!base) return storagePath

  const url = `${base}/${storagePath}`
  if (!updatedAt) return url

  const ts =
    typeof updatedAt === "string"
      ? new Date(updatedAt).getTime()
      : updatedAt.getTime()

  const separator = url.includes("?") ? "&" : "?"
  return `${url}${separator}v=${ts}`
}
