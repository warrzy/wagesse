export type PaymentMode = "MANUAL" | "PAYDUNYA" | "PROVIDER"

const DEFAULT_INSTRUCTIONS =
  "Effectuez le règlement hors plateforme en indiquant la référence de la commande. Un administrateur vérifie le paiement, puis les crédits ou le forfait sont attribués. Tant que la demande est en attente, rien n'est crédité."

export function getPaymentMode(env: NodeJS.ProcessEnv = process.env): PaymentMode {
  const raw = (env.PAYMENT_MODE || "MANUAL").trim().toUpperCase()
  if (raw === "PAYDUNYA") {
    if (env.NODE_ENV === "production" && env.PAYDUNYA_ENABLED !== "true") {
      return "MANUAL"
    }
    return "PAYDUNYA"
  }
  if (raw === "PROVIDER" || raw === "ORANGE" || raw === "ORANGE_MONEY") {
    return "PROVIDER"
  }
  return "MANUAL"
}

export function manualPaymentInstructions(env: NodeJS.ProcessEnv = process.env): string {
  const custom = env.MANUAL_PAYMENT_INSTRUCTIONS?.trim()
  return custom || DEFAULT_INSTRUCTIONS
}

export function paydunyaAllowed(env: NodeJS.ProcessEnv = process.env): boolean {
  return getPaymentMode(env) === "PAYDUNYA"
}
