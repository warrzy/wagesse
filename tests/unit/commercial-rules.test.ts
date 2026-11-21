import assert from "node:assert/strict"
import test from "node:test"
import {
  contactsReleased,
  parseQuoteCreditCost,
  paymentApprovalAllowedForRole,
  purchaseAllowedForRole,
} from "../../lib/commercial-rules"

test("seul un transporteur peut acheter des crédits", () => {
  assert.equal(purchaseAllowedForRole("TRUCKER"), true)
  assert.equal(purchaseAllowedForRole("CLIENT"), false)
  assert.equal(purchaseAllowedForRole("ADMIN"), false)
  assert.equal(purchaseAllowedForRole("SUPER_ADMIN"), false)
  assert.equal(purchaseAllowedForRole(null), false)
})

test("seul le super administrateur valide un règlement", () => {
  assert.equal(paymentApprovalAllowedForRole("SUPER_ADMIN"), true)
  assert.equal(paymentApprovalAllowedForRole("ADMIN"), false)
  assert.equal(paymentApprovalAllowedForRole("TRUCKER"), false)
  assert.equal(paymentApprovalAllowedForRole("CLIENT"), false)
})

test("les coordonnées suivent l'acceptation du devis", () => {
  assert.equal(contactsReleased("PENDING"), false)
  assert.equal(contactsReleased("REJECTED"), false)
  assert.equal(contactsReleased("WITHDRAWN"), false)
  assert.equal(contactsReleased("ACCEPTED"), true)
})

test("le coût d'un devis reste un entier serveur borné", () => {
  assert.equal(parseQuoteCreditCost(1), 1)
  assert.equal(parseQuoteCreditCost({ credits: 3 }), 3)
  assert.equal(parseQuoteCreditCost("2"), 2)
  assert.equal(parseQuoteCreditCost(0), null)
  assert.equal(parseQuoteCreditCost(-1), null)
  assert.equal(parseQuoteCreditCost(1.5), null)
  assert.equal(parseQuoteCreditCost(101), null)
  assert.equal(parseQuoteCreditCost("beaucoup"), null)
})
