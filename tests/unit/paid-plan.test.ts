import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import path from "node:path"
import test from "node:test"
import { payablePlanCode } from "../../deploy/preprod/paid-plan.mjs"

const root = path.resolve(import.meta.dirname, "../..")

test("le cycle ignore le forfait gratuit publié en premier", () => {
  const catalog = [
    { code: "FREE", monthlyPrice: 0, sortOrder: 0 },
    { code: "PRO", monthlyPrice: 5000, sortOrder: 10 },
    { code: "BUSINESS", monthlyPrice: 15000, sortOrder: 20 },
  ]
  assert.equal(payablePlanCode(catalog), "PRO")
  assert.equal(payablePlanCode([{ code: "FREE", monthlyPrice: "0.00" }]), null)
  assert.equal(payablePlanCode([{ code: "PRO", monthlyPrice: "5000.00" }]), "PRO")
  assert.equal(payablePlanCode([{ code: "", monthlyPrice: 5000 }, { monthlyPrice: 5000 }]), null)
  const cycle = readFileSync(path.join(root, "deploy/preprod/auth-simple-cycle.mjs"), "utf8")
  assert.match(cycle, /payablePlanCode\(plans\.json\.data\)/)
  assert.equal(cycle.includes("find((item) => item.code)"), false)
})
