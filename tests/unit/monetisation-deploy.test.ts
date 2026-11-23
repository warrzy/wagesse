import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

function source(relative: string): string {
  return readFileSync(new URL(`../../${relative}`, import.meta.url), "utf8")
}

test("le déploiement isolé n'accepte que la migration relue et la base de préproduction", () => {
  const deploy = source("deploy/preprod/deploy-monetisation.sh")
  const designate = source("deploy/preprod/designate-super-admin.sh")
  const runner = source("deploy/preprod/run-step.sh")
  assert.match(deploy, /7a2a9719cddf354bb66914107b53c748f92bffda/)
  assert.match(deploy, /47b47f7994fd4ea5a52c61a267883e4c4b9f72b5a9632a75aa7c2df3720a37c8/)
  assert.match(deploy, /4fa3db1c17eb10549bc1069a5cd9e694e60bbbe2bee0a3ae0b2581451f8bb70a/)
  assert.match(deploy, /assert_preprod_database/)
  assert.match(deploy, /restore-check\.sh/)
  assert.match(deploy, /wagesse-preprod\.service/)
  assert.equal(deploy.includes("migrate reset"), false)
  assert.equal(deploy.includes("DROP DATABASE"), false)
  assert.equal(deploy.includes("/opt/wagesse-prod/app"), true)
  assert.match(deploy, /Refus de toucher la production/)
  assert.match(designate, /role = 'ADMIN'/)
  assert.match(designate, /role = 'SUPER_ADMIN'/)
  assert.match(designate, /Aucun rôle n'est modifié/)
  assert.equal(designate.includes("UPDATE User"), true)
  assert.equal(designate.includes("WHERE role <>"), false)
  assert.match(runner, /deploy-monetisation\.sh/)
  assert.match(runner, /designate-super-admin\.sh/)
})
