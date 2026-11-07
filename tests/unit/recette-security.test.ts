import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { describe, it } from "node:test"
import { securityHeaders } from "../../lib/security-headers.js"
import { isFictionalRecetteAccount, preprodTestPhoneVerifyEnabled } from "../../lib/recette-phone"

describe("security headers", () => {
  it("sets the headers that the live site was missing", () => {
    const keys = securityHeaders.map((header) => header.key)
    assert.deepEqual(keys, [
      "X-Content-Type-Options",
      "X-Frame-Options",
      "Referrer-Policy",
      "Permissions-Policy",
      "Strict-Transport-Security",
    ])
    assert.equal(securityHeaders.find((header) => header.key === "X-Frame-Options")?.value, "DENY")
    const config = readFileSync(new URL("../../next.config.js", import.meta.url), "utf8")
    assert.match(config, /poweredByHeader:\s*false/)
  })
})

describe("fictional phone verification", () => {
  it("stays disabled outside the preproduction database", () => {
    const enabled: NodeJS.ProcessEnv = {
      NODE_ENV: "test",
      WAGESSE_DEPLOYMENT: "preprod",
      PREPROD_TEST_PHONE_VERIFY: "true",
      DATABASE_URL: "mysql://user:secret@127.0.0.1:3306/wagesse_preprod",
    }
    assert.equal(preprodTestPhoneVerifyEnabled({ NODE_ENV: "test" }), false)
    assert.equal(preprodTestPhoneVerifyEnabled({ ...enabled, WAGESSE_DEPLOYMENT: "production" }), false)
    assert.equal(preprodTestPhoneVerifyEnabled({ ...enabled, WAGESSE_DEPLOYMENT: undefined }), false)
    assert.equal(preprodTestPhoneVerifyEnabled({ ...enabled, DATABASE_URL: "mysql://user:secret@127.0.0.1:3306/wagesse" }), false)
    assert.equal(preprodTestPhoneVerifyEnabled(enabled), true)
  })

  it("accepts only a reserved fictional client or trucker", () => {
    const fictional = {
      phone: "78001021",
      firstName: "Recette",
      lastName: "ClienteA",
      role: "CLIENT",
    }
    assert.equal(isFictionalRecetteAccount(fictional), true)
    assert.equal(isFictionalRecetteAccount({ ...fictional, role: "ADMIN" }), false)
    assert.equal(isFictionalRecetteAccount({ ...fictional, phone: "70000000" }), false)
    assert.equal(isFictionalRecetteAccount({ ...fictional, firstName: "Awa", lastName: "Kaboré" }), false)
  })

  it("does not ship a fixed code or a public bypass", () => {
    const source = readFileSync(
      new URL("../../app/api/admin/recette/verify-phone/route.ts", import.meta.url),
      "utf8"
    )
    assert.doesNotMatch(source, /OTP|debugOtp|123456|SMS_ALLOW_SIMULATE/)
    assert.match(source, /preprodTestPhoneVerifyEnabled/)
    assert.match(source, /isAdminRole/)
  })
})
