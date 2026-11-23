import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { classifyIdentifier, phoneLookupCandidates } from "../../lib/account-identity"
import { passwordResetDecision } from "../../lib/password-reset-policy"
import { recoveryChannel } from "../../lib/recovery-policy"
import { sendAccountEmail, smtpConfigured } from "../../lib/mail"
import { maskContactUser, REDACTED_CONTACT } from "../../lib/contact-privacy"
import { generateTemporaryPassword } from "../../lib/temporary-password"

test("un identifiant est soit un téléphone, soit un e-mail, jamais les deux", () => {
  assert.deepEqual(classifyIdentifier(" 70 11 22 33 "), { kind: "phone", phone: "70112233" })
  assert.deepEqual(classifyIdentifier("Ada@Wagesse.Test"), { kind: "email", email: "ada@wagesse.test" })
  assert.equal(classifyIdentifier("pas-un-identifiant"), null)
  assert.equal(classifyIdentifier("70112233@wagesse.test")?.kind, "email")
  assert.deepEqual(phoneLookupCandidates("70112233").sort(), ["22670112233", "70112233"])
})

test("le canal de récupération par défaut est l'assistance administrateur", () => {
  assert.equal(recoveryChannel({} as NodeJS.ProcessEnv), "admin")
  assert.equal(recoveryChannel({ ACCOUNT_RECOVERY_CHANNEL: "sms" } as unknown as NodeJS.ProcessEnv), "sms")
  assert.equal(recoveryChannel({ ACCOUNT_RECOVERY_CHANNEL: "inconnu" } as unknown as NodeJS.ProcessEnv), "admin")
})

test("les coordonnées masquées ne conservent aucun chiffre", () => {
  const hidden = maskContactUser({ phone: "70112233", email: "70112233@wagesse.test", firstName: "Awa" }, true)
  assert.equal(hidden.phone, REDACTED_CONTACT)
  assert.equal(hidden.email, REDACTED_CONTACT)
  assert.equal(JSON.stringify(hidden).includes("70112233"), false)
  assert.equal(maskContactUser({ phone: "70112233", email: "a@wagesse.test" }, false).phone, "70112233")
})

test("un administrateur ordinaire ne réinitialise pas un super administrateur", () => {
  const base = {
    confirm: true,
    identityDoubt: false,
    identityMethod: "IN_PERSON",
    identityNote: "Pièce présentée au bureau",
  }
  assert.equal(passwordResetDecision({ ...base, actorRole: "CLIENT", targetRole: "CLIENT" }).ok, false)
  assert.equal(passwordResetDecision({ ...base, actorRole: "ADMIN", targetRole: "CLIENT", identityDoubt: true }).ok, false)
  assert.equal(passwordResetDecision({ ...base, actorRole: "ADMIN", targetRole: "SUPER_ADMIN" }).ok, false)
  const allowed = passwordResetDecision({ ...base, actorRole: "ADMIN", targetRole: "TRUCKER" })
  assert.equal(allowed.ok, true)
  const reinforced = passwordResetDecision({
    ...base,
    actorRole: "SUPER_ADMIN",
    targetRole: "SUPER_ADMIN",
    confirmationPhrase: "REINITIALISER-SUPER-ADMIN",
  })
  assert.equal(reinforced.ok, true)
})

test("le SMTP désactivé n'envoie ni ne simule de message", async () => {
  assert.equal(smtpConfigured({} as NodeJS.ProcessEnv), false)
  const result = await sendAccountEmail(
    { to: "a@wagesse.test", subject: "test", text: "sans secret" },
    { NODE_ENV: "production", SMTP_ALLOW_SIMULATE: "true" } as unknown as NodeJS.ProcessEnv
  )
  assert.deepEqual(result, { delivered: false, simulated: false })
})

test("le mot de passe temporaire n'est pas écrit par les journaux applicatifs", () => {
  const password = generateTemporaryPassword()
  assert.equal(password.length, 16)
  assert.match(password, /[A-Za-z]/)
  assert.match(password, /[0-9]/)
  const source = readFileSync(new URL("../../app/api/admin/mots-de-passe/route.ts", import.meta.url), "utf8")
  assert.equal(source.includes("console.log"), false)
  assert.equal(source.includes("temporaryPassword,"), true)
  const audit = source.slice(source.indexOf("writeAudit"), source.indexOf("return NextResponse.json"))
  assert.equal(audit.includes("temporaryPassword"), false)
})
