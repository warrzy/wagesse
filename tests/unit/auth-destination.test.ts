import assert from "node:assert/strict"
import test from "node:test"
import { destinationAfterAuthentication } from "../../lib/role-routing"

test("la connexion ouvre l'espace du rôle sans bloquer sur le SMS", () => {
  assert.equal(destinationAfterAuthentication("CLIENT"), "/dashboard/client")
  assert.equal(destinationAfterAuthentication("TRUCKER"), "/dashboard/trucker")
  assert.equal(destinationAfterAuthentication("ADMIN"), "/admin")
  assert.equal(destinationAfterAuthentication("OPERATOR"), "/dashboard/client")
})
