import { SUPER_ADMIN_RESET_PHRASE } from "@/lib/temporary-password"

function isResetAdmin(role: string) {
  return role === "ADMIN" || role === "SUPER_ADMIN"
}

const METHODS = new Set(["IN_PERSON", "PHONE_CALLBACK", "IDENTITY_DOCUMENT"])

export function passwordResetDecision(input: {
  actorRole: string
  targetRole: string
  confirm: boolean
  identityDoubt: boolean
  identityMethod?: string
  identityNote?: string
  confirmationPhrase?: string
}): { ok: true } | { ok: false; status: number; code: string; error: string } {
  if (!isResetAdmin(input.actorRole)) {
    return { ok: false, status: 403, code: "FORBIDDEN", error: "Cette opération est réservée à un administrateur habilité." }
  }
  if (input.identityDoubt) {
    return {
      ok: false,
      status: 409,
      code: "IDENTITY_DOUBT",
      error: "Le compte n'est pas réinitialisé tant que l'identité n'est pas établie.",
    }
  }
  if (input.confirm !== true) {
    return { ok: false, status: 400, code: "CONFIRMATION_REQUIRED", error: "Confirmez explicitement la réinitialisation." }
  }
  if (!input.identityMethod || !METHODS.has(input.identityMethod) || (input.identityNote || "").trim().length < 12) {
    return {
      ok: false,
      status: 400,
      code: "IDENTITY_CHECK_REQUIRED",
      error: "Consignez la méthode et le résultat du contrôle d'identité hors plateforme.",
    }
  }
  if (input.targetRole === "SUPER_ADMIN") {
    if (input.actorRole !== "SUPER_ADMIN") {
      return {
        ok: false,
        status: 403,
        code: "SUPER_ADMIN_RESET_FORBIDDEN",
        error: "Un administrateur ordinaire ne peut pas réinitialiser un super administrateur.",
      }
    }
    if (input.confirmationPhrase !== SUPER_ADMIN_RESET_PHRASE) {
      return {
        ok: false,
        status: 403,
        code: "SUPER_ADMIN_CONFIRMATION_REQUIRED",
        error: "La procédure renforcée du super administrateur est requise.",
      }
    }
  }
  return { ok: true }
}
