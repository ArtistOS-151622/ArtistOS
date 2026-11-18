// Test-only module resolution for node --test:
// - "@/..." path alias (tsconfig paths): tries ".ts", ".tsx" and "/index.ts"
// - extensionless package subpaths such as "next/server" -> "next/server.js"
import { statSync } from "node:fs"
import { fileURLToPath, pathToFileURL } from "node:url"

const root = new URL("../../", import.meta.url)

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    const base = fileURLToPath(new URL(specifier.slice(2), root))
    for (const candidate of [base, `${base}.ts`, `${base}.tsx`, `${base}/index.ts`]) {
      // Files only: "@/lib/api" is a directory, which ESM can't import; its index.ts is.
      if (statSync(candidate, { throwIfNoEntry: false })?.isFile()) {
        return nextResolve(pathToFileURL(candidate).href, context)
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
