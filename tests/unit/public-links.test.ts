import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import path from "node:path"
import test from "node:test"

const root = path.resolve(import.meta.dirname, "../..")

test("les pages publiques ne proposent pas le WhatsApp fictif ni un espace fermé", () => {
  const contact = readFileSync(path.join(root, "app/contact/page.tsx"), "utf8")
  const footer = readFileSync(path.join(root, "components/Footer.tsx"), "utf8")
  const readme = readFileSync(path.join(root, "README.md"), "utf8")
  assert.equal(contact.includes("226xxxxxxxxxxx"), false)
  assert.match(contact, /whatsappReady/)
  assert.equal(footer.includes("/dashboard/"), false)
  assert.equal(readme.includes("226xxxxxxxxxxx"), false)
  assert.equal(readme.includes("photo + GPS"), false)
})
