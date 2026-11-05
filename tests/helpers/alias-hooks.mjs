// Test-only module resolution for node --test:
// - "@/..." path alias (tsconfig paths): tries ".ts", ".tsx" and "/index.ts"
// - extensionless package subpaths such as "next/server" -> "next/server.js"
import { existsSync } from "node:fs"
import { fileURLToPath, pathToFileURL } from "node:url"

const root = new URL("../../", import.meta.url)

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    const base = fileURLToPath(new URL(specifier.slice(2), root))
    for (const candidate of [base, `${base}.ts`, `${base}.tsx`, `${base}/index.ts`]) {
      if (existsSync(candidate) && !candidate.endsWith("/")) {
        try {
          return nextResolve(pathToFileURL(candidate).href, context)
        } catch {
          // try next candidate
        }
      }
    }
  }
  try {
    return await nextResolve(specifier, context)
  } catch (error) {
    // Packages like "next/server" are imported without an extension; ESM needs one
    if (error?.code === "ERR_MODULE_NOT_FOUND" && !specifier.startsWith(".") && !/\.[cm]?js$/.test(specifier)) {
      return nextResolve(`${specifier}.js`, context)
    }
    throw error
  }
}
