import type { Role } from "@prisma/client"

/** Database name from a MySQL URL. Returns null when the URL is absent or unreadable. */
export function databaseName(databaseUrl: string | undefined): string | null {
  if (!databaseUrl) return null
  try {
    const name = new URL(databaseUrl).pathname.replace(/^\//, "")
    return /^[A-Za-z0-9_]+$/.test(name) ? name : null
  } catch {
    return null
  }
}

/**
 * Preproduction only. NODE_ENV is already production on the VPS, so it is not used.
 * Production stays closed unless both markers and the preproduction database are present.
 */
export function preprodTestPhoneVerifyEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  if (env.WAGESSE_DEPLOYMENT !== "preprod") return false
  if (env.PREPROD_TEST_PHONE_VERIFY !== "true") return false
  return databaseName(env.DATABASE_URL) === "wagesse_preprod"
}

/** Hosts that may reach the preproduction recette route. Any other host is refused. */
export function isPreprodRecetteHost(hostHeader: string | null | undefined): boolean {
  const host = (hostHeader || "").split(",")[0].trim().toLowerCase()
  const name = host.startsWith("[") ? host : host.split(":")[0]
  return name === "preprod.wagesse.fr" || name === "127.0.0.1" || name === "localhost"
}

/**
 * The recette route stays closed unless the process is the preproduction
 * deployment and the request host is the preproduction site or its loopback.
 * A copied environment file on wagesse.fr does not open it.
 */
export function recettePhoneVerifyRequestAllowed(
  env: NodeJS.ProcessEnv = process.env,
  hostHeader: string | null | undefined = null
): boolean {
  if (!isPreprodRecetteHost(hostHeader)) return false
  return preprodTestPhoneVerifyEnabled(env)
}

/**
 * A fictional recette account may have its phone marked verified by an administrator.
 * Real numbers, administrators, and any account outside the reserved range are refused.
 */
export function isFictionalRecetteAccount(user: {
  phone: string
  firstName: string | null
  lastName: string | null
  role: Role | string
}): boolean {
  if (user.role === "ADMIN" || user.role === "SUPER_ADMIN") return false
  if (!/^7800[0-9]{4}$/.test(user.phone)) return false
  const name = `${user.firstName || ""} ${user.lastName || ""}`
  return name.includes("Recette")
}
