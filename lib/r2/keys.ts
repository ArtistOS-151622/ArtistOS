import { randomUUID } from "crypto"

export function buildPortfolioObjectKey(
  userId: number,
  folderId: number,
  extension: string
): { key: string; uuid: string } {
  const uuid = randomUUID()
  const ext = extension.replace(/^\./, "").toLowerCase()
  return {
    uuid,
    key: `portfolio/${userId}/${folderId}/${uuid}.${ext}`,
  }
}

export function getExtensionFromFilename(filename: string): string {
  const parts = filename.split(".")
  if (parts.length < 2) return "bin"
  return parts.pop()!.toLowerCase()
}
