import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { clearAuthAttempts, recordAuthFailure, assertAuthAttemptAllowed } from "../../lib/auth"
import { phoneVerificationMisconfigured, phoneVerificationRequired, phoneVerificationStatus } from "../../lib/phone-policy"
import { passwordSchema } from "../../lib/validations"

test("le mode simple n'exige pas le SMS et ne se laisse pas activer sans fournisseur", () => {
  const previous = { ...process.env }
  process.env.PHONE_VERIFICATION_REQUIRED = "false"
  assert.equal(phoneVerificationRequired(), false)
  assert.equal(phoneVerificationMisconfigured(), false)

  delete process.env.PHONE_VERIFICATION_REQUIRED
  assert.equal(phoneVerificationRequired(), false)

  process.env.PHONE_VERIFICATION_REQUIRED = "true"
  const runtimeEnv = process.env as { NODE_ENV?: string }
  runtimeEnv.NODE_ENV = "production"
  process.env.SMS_PROVIDER = "http"
  delete process.env.SMS_HTTP_URL
  delete process.env.SMS_HTTP_KEY
  delete process.env.SMS_ALLOW_SIMULATE
  assert.equal(phoneVerificationStatus().misconfigured, true)

  process.env.SMS_HTTP_URL = "https://sms.example.invalid/send"
  process.env.SMS_HTTP_KEY = "placeholder"
  assert.equal(phoneVerificationMisconfigured(), false)

  for (const key of Object.keys(process.env)) {
    if (!(key in previous)) delete process.env[key]
  }
  Object.assign(process.env, previous)
})

test("un mot de passe nouveau contient une lettre et un chiffre", () => {
  assert.equal(passwordSchema.safeParse("password123").success, true)
  assert.equal(passwordSchema.safeParse("motdepasse").success, false)
  assert.equal(passwordSchema.safeParse("12345678").success, false)
  assert.equal(passwordSchema.safeParse("abc123").success, false)
})

test("les tentatives répétées sont limitées sans journaliser le secret", () => {
  clearAuthAttempts()
  for (let i = 0; i < 5; i += 1) recordAuthFailure("login", "78009999")
  assert.equal(assertAuthAttemptAllowed("login", "78009999").ok, false)
  assert.equal(assertAuthAttemptAllowed("login", "78009998").ok, true)
  clearAuthAttempts()
})

test("l'interface lit le drapeau serveur et ne marque pas les téléphones vérifiés", () => {
  const notice = readFileSync(new URL("../../components/PhoneNotice.tsx", import.meta.url), "utf8")
  const signup = readFileSync(new URL("../../app/api/auth/signup/route.ts", import.meta.url), "utf8")
  const gate = readFileSync(new URL("../../lib/api-auth.ts", import.meta.url), "utf8")
  assert.match(notice, /\/api\/auth\/phone-verification/)
  assert.equal(signup.includes("phoneVerified: new Date"), false)
  assert.equal(gate.includes("phoneVerified: new Date"), false)
  assert.match(gate, /phoneVerificationRequired/)
})
