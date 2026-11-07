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
  it("stays disabled unless the preproduction flag is exactly true", () => {
    assert.equal(preprodTestPhoneVerifyEnabled({}), false)
    assert.equal(preprodTestPhoneVerifyEnabled({ NODE_ENV: "production" }), false)
    assert.equal(preprodTestPhoneVerifyEnabled({ PREPROD_TEST_PHONE_VERIFY: "false" }), false)
    assert.equal(preprodTestPhoneVerifyEnabled({ PREPROD_TEST_PHONE_VERIFY: "true" }), true)
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
