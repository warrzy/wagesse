import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import test from "node:test"

const root = path.resolve(import.meta.dirname, "../..")
const shell = path.join(root, "deploy/preprod/rotate-recette-secrets.sh")
const accounts = path.join(root, "deploy/preprod/rotate-recette-accounts.mjs")

test("bcryptjs est une dépendance applicative et le script ESM est copié dans l'application", () => {
  const pkg = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"))
  assert.equal(typeof pkg.dependencies.bcryptjs, "string")
  const source = readFileSync(shell, "utf8")
  assert.match(source, /RUNTIME="\$\{APP\}\/rotate-recette-accounts\.mjs"/)
  assert.doesNotMatch(source, /NODE_PATH=/)
  const probe = source.indexOf("probe_rotation_imports")
  const database = source.indexOf('source "$ENV_FILE"')
  assert.ok(probe > 0 && probe < database)
  const program = readFileSync(accounts, "utf8")
  const importAt = program.indexOf('import bcrypt from "bcryptjs"')
  const updateAt = program.indexOf("prisma.user.update")
  assert.ok(importAt >= 0 && importAt < updateAt)
  assert.match(program, /await restore\(\)/)
})

test("un import ESM trouve bcryptjs dans l'application et pas via NODE_PATH", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "wagesse-esm-"))
  try {
    const app = path.join(dir, "app")
    mkdirSync(path.join(app, "node_modules"), { recursive: true })
    symlinkSync(path.join(root, "node_modules/bcryptjs"), path.join(app, "node_modules/bcryptjs"))
    const body = 'import bcrypt from "bcryptjs"\nif (typeof bcrypt.hash !== "function") process.exit(1)\n'
    writeFileSync(path.join(app, "inside.mjs"), body, { mode: 0o600 })
    writeFileSync(path.join(dir, "outside.mjs"), body, { mode: 0o600 })

    execFileSync(process.execPath, [path.join(app, "inside.mjs")], { stdio: "pipe" })

    let failed = false
    try {
      execFileSync(process.execPath, [path.join(dir, "outside.mjs")], {
        stdio: "pipe",
        env: { ...process.env, NODE_PATH: path.join(app, "node_modules") },
      })
    } catch (error) {
      failed = true
      const stderr = String((error as { stderr?: Buffer }).stderr || "")
      assert.match(stderr, /ERR_MODULE_NOT_FOUND/)
    }
    assert.equal(failed, true)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})
