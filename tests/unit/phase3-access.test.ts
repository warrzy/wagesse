import assert from "node:assert/strict"
import test from "node:test"
import { missionTransitionAllowed } from "../../lib/mission-transitions"
import { clearSimulatedSms, readSimulatedSms, sendSms, toBurkinaMsisdn } from "../../lib/sms"

test("le numéro burkinabè reçoit l'indicatif 226", () => {
  assert.equal(toBurkinaMsisdn("70112233"), "22670112233")
  assert.equal(toBurkinaMsisdn("22670112233"), "22670112233")
})

test("la simulation SMS conserve le message sans l'écrire dans la console", async () => {
  clearSimulatedSms()
  const code = "654321"
  const logs: string[] = []
  const original = console.log
  console.log = (...args: unknown[]) => {
    logs.push(args.map((item) => String(item)).join(" "))
  }
  try {
    const result = await sendSms("70112233", `WAGESSE : code ${code}`, { NODE_ENV: "test", SMS_PROVIDER: "simulate" } as NodeJS.ProcessEnv)
    assert.equal(result.delivered, true)
    assert.equal(result.simulated, true)
    assert.match(readSimulatedSms("70112233", { NODE_ENV: "test", SMS_PROVIDER: "simulate" } as NodeJS.ProcessEnv) || "", new RegExp(code))
    assert.equal(logs.some((line) => line.includes(code)), false)
  } finally {
    console.log = original
    clearSimulatedSms()
  }
})

test("la simulation SMS est fermée en production", async () => {
  clearSimulatedSms()
  const env = { NODE_ENV: "production", SMS_PROVIDER: "simulate" } as NodeJS.ProcessEnv
  const result = await sendSms("70112233", "WAGESSE : code 111111", env)
  assert.equal(result.delivered, false)
  assert.equal(readSimulatedSms("70112233", env), undefined)
})

test("un fournisseur HTTP en échec n'attribue pas d'envoi", async () => {
  const result = await sendSms(
    "70112233",
    "secret",
    { NODE_ENV: "test", SMS_PROVIDER: "http", SMS_HTTP_URL: "https://sms.example", SMS_HTTP_KEY: "cle" } as NodeJS.ProcessEnv,
    async () => {
      throw new Error("réseau")
    }
  )
  assert.equal(result.delivered, false)
  assert.equal(result.provider, "http")
})

test("une mission suit le parcours affiché", () => {
  assert.equal(missionTransitionAllowed("TRUCKER", "ACCEPTED", "TRUCK_EN_ROUTE_PICKUP"), true)
  assert.equal(missionTransitionAllowed("TRUCKER", "ACCEPTED", "COMPLETED"), false)
  assert.equal(missionTransitionAllowed("CLIENT", "DELIVERED", "PENDING_CONFIRMATION"), false)
  assert.equal(missionTransitionAllowed("TRUCKER", "DELIVERED", "PENDING_CONFIRMATION"), true)
  assert.equal(missionTransitionAllowed("CLIENT", "PENDING_CONFIRMATION", "COMPLETED"), true)
  assert.equal(missionTransitionAllowed("CLIENT", "ACCEPTED", "REFUNDED"), false)
})
