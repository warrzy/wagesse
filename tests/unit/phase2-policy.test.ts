import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import test from "node:test"
import { exposeOtpForTests, storeOTP, verifyOTP } from "../../lib/auth"
import { getPaymentMode } from "../../lib/payment-mode"
import { isPaidPlanPrice, sandboxAttributionBlocked } from "../../lib/payment-policy"
import { paydunyaConfirmationGrants, paydunyaMasterKeyHash, PayDunyaProvider } from "../../lib/paydunya"

test("le bac à sable n'attribue pas en production", () => {
  assert.equal(sandboxAttributionBlocked({ NODE_ENV: "production", PAYMENT_PROVIDER: "orange_money_sandbox" }), true)
  assert.equal(sandboxAttributionBlocked({ NODE_ENV: "development", PAYMENT_PROVIDER: "orange_money_sandbox" }), false)
  assert.equal(
    sandboxAttributionBlocked({ NODE_ENV: "production", PAYMENT_PROVIDER: "orange_money_production" }, { sandbox: true }),
    true
  )
  assert.equal(
    sandboxAttributionBlocked({ NODE_ENV: "production", PAYMENT_PROVIDER: "orange_money_production" }, { sandbox: false }),
    false
  )
})

test("un forfait payant ne s'active pas par le prix nul", () => {
  assert.equal(isPaidPlanPrice(5000), true)
  assert.equal(isPaidPlanPrice(0), false)
  assert.equal(isPaidPlanPrice("0"), false)
})

test("PayDunya reste inactif en production sans drapeau explicite", () => {
  assert.equal(getPaymentMode({ PAYMENT_MODE: "PAYDUNYA", NODE_ENV: "production" } as NodeJS.ProcessEnv), "MANUAL")
  assert.equal(getPaymentMode({ PAYMENT_MODE: "PAYDUNYA", NODE_ENV: "production", PAYDUNYA_ENABLED: "true" } as NodeJS.ProcessEnv), "PAYDUNYA")
  assert.equal(getPaymentMode({} as NodeJS.ProcessEnv), "MANUAL")
})

test("une notification PayDunya incomplète n'autorise pas l'attribution", () => {
  const masterKey = "master-test"
  const hash = paydunyaMasterKeyHash(masterKey)
  assert.equal(paydunyaConfirmationGrants({ masterKey, hash, status: "completed", amount: 1000, expectedAmount: 1000 }), true)
  assert.equal(paydunyaConfirmationGrants({ masterKey, hash, status: "pending", amount: 1000, expectedAmount: 1000 }), false)
  assert.equal(paydunyaConfirmationGrants({ masterKey, hash, status: "completed", amount: 1, expectedAmount: 1000 }), false)
  assert.equal(paydunyaConfirmationGrants({ masterKey, hash: "non", status: "completed", amount: 1000, expectedAmount: 1000 }), false)
  assert.equal(createHash("sha512").update(masterKey).digest("hex"), hash)
})

test("PayDunya ne simule pas un succès sans réponse confirmée", async () => {
  const provider = new PayDunyaProvider(async () => {
    throw new Error("réseau interdit dans ce test")
  }, {
    NODE_ENV: "test",
    PAYDUNYA_MASTER_KEY: "master",
    PAYDUNYA_PRIVATE_KEY: "private",
    PAYDUNYA_TOKEN: "token",
    PAYDUNYA_MODE: "test",
  } as NodeJS.ProcessEnv)
  const verified = await provider.verify("token-test", 1000)
  assert.equal(verified.status, "failed")
  assert.notEqual(verified.status, "success")
})

test("les essais OTP répétés verrouillent le code", () => {
  storeOTP("70000000", "123456", 10)
  for (let i = 0; i < 4; i += 1) {
    assert.equal(verifyOTP("70000000", "000000").ok, false)
  }
  const locked = verifyOTP("70000000", "000000")
  assert.equal(locked.ok, false)
  if (!locked.ok) assert.equal(locked.reason, "locked")
  const replay = verifyOTP("70000000", "123456")
  assert.equal(replay.ok, false)
})

test("le code OTP n'est pas exposé en production", () => {
  const env = process.env as { NODE_ENV?: string; OTP_DEBUG_RETURN?: string }
  const previous = env.NODE_ENV
  const flag = env.OTP_DEBUG_RETURN
  env.NODE_ENV = "production"
  env.OTP_DEBUG_RETURN = "true"
  assert.equal(exposeOtpForTests("123456"), undefined)
  env.NODE_ENV = previous
  env.OTP_DEBUG_RETURN = flag
})
