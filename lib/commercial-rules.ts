export const QUOTE_CREDIT_COST_KEY = "trucker.quoteCreditCost"
export const DEFAULT_QUOTE_CREDIT_COST = 1
export const MAX_QUOTE_CREDIT_COST = 100

export function purchaseAllowedForRole(role: string | null | undefined) {
  return role === "TRUCKER"
}

export function paymentApprovalAllowedForRole(role: string | null | undefined) {
  return role === "SUPER_ADMIN"
}

export function contactsReleased(status: string | null | undefined) {
  return status === "ACCEPTED"
}

export function parseQuoteCreditCost(value: unknown): number | null {
  const raw =
    typeof value === "number"
      ? value
      : value && typeof value === "object" && "credits" in value
        ? Number((value as { credits: unknown }).credits)
        : typeof value === "string"
          ? Number(value)
          : Number.NaN
  if (!Number.isInteger(raw) || raw < 1 || raw > MAX_QUOTE_CREDIT_COST) return null
  return raw
}
