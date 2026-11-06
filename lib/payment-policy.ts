export function isOrangeSandboxProvider(env: NodeJS.ProcessEnv = process.env): boolean {
  const provider = (env.PAYMENT_PROVIDER || "orange_money_sandbox").trim()
  return provider === "orange_money_sandbox"
}

/**
 * Le bac à sable Orange Money ne doit jamais attribuer de crédits ou un
 * forfait lorsque l'application tourne en production.
 */
export function sandboxAttributionBlocked(
  env: NodeJS.ProcessEnv = process.env,
  metadata?: { sandbox?: boolean } | null
): boolean {
  if (env.NODE_ENV !== "production") return false
  if (isOrangeSandboxProvider(env)) return true
  return metadata?.sandbox === true
}

export function isPaidPlanPrice(monthlyPrice: unknown): boolean {
  const price = Number(monthlyPrice ?? 0)
  return Number.isFinite(price) && price > 0
}
