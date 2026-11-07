import type { Role } from "@prisma/client"

/** Preproduction only. Never implied by NODE_ENV, which is already production on the VPS. */
export function preprodTestPhoneVerifyEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.PREPROD_TEST_PHONE_VERIFY === "true"
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
