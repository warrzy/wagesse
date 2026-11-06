import path from "node:path"
import { existsSync } from "node:fs"
import { pathToFileURL } from "node:url"

const root = path.resolve(import.meta.dirname, "..")

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    const base = path.join(root, specifier.slice(2))
    const candidates = [base, `${base}.ts`, `${base}.tsx`, path.join(base, "index.ts"), path.join(base, "index.tsx")]
    const found = candidates.find((candidate) => existsSync(candidate)) || `${base}.ts`
    return nextResolve(pathToFileURL(found).href, context)
  }
  return nextResolve(specifier, context)
}
