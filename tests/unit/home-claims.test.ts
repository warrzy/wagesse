import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import path from "node:path"
import test from "node:test"

const root = path.resolve(import.meta.dirname, "../..")
const files = [
  "app/page.tsx",
  "components/Hero.tsx",
  "components/Footer.tsx",
  "components/Header.tsx",
  "components/TruckOfferCard.tsx",
  "components/QuickSearchCard.tsx",
]

const banned = ["24/7", "4,8", "Siège social", "Aïcha", "Suivi GPS", "Assurance livraison", "Camionneurs vérifiés", "Abidjan", "Cotonou", "Niamey"]

test("l'accueil ne reprend pas les affirmations non vérifiées", () => {
  for (const relative of files) {
    const text = readFileSync(path.join(root, relative), "utf8")
    for (const phrase of banned) {
      assert.equal(text.includes(phrase), false, `${relative} contient « ${phrase} »`)
    }
  }
  const home = readFileSync(path.join(root, "app/page.tsx"), "utf8")
  assert.match(home, /Paiement manuel/)
  assert.match(home, /Le client confirme la fin/)
  assert.equal(home.includes("GPS"), false)
  assert.match(home, /francs CFA|FCFA/)
  const images = readFileSync(path.join(root, "lib/marketplace-images.ts"), "utf8")
  assert.match(images, /Pexels License/)
  assert.match(images, /https:\/\/www\.pexels\.com\/license\//)
})
