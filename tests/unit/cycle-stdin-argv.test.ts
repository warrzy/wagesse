import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import test from "node:test"

const root = path.resolve(import.meta.dirname, "../..")
const broken = `
const fs = require("fs")
try {
  fs.readFileSync(process.argv[1], "utf8")
  console.log("OPENED")
} catch (error) {
  console.log(error.code + " " + error.path)
}
`
const fixedArg = `
const fs = require("fs")
const body = JSON.parse(fs.readFileSync(process.argv[2], "utf8"))
if (!body.data || body.data.required !== false || body.data.misconfigured !== false) process.exit(1)
console.log("ok")
`

function policyFile(): string {
  const dir = mkdtempSync(path.join(tmpdir(), "cycle-policy-"))
  const file = path.join(dir, "policy.json")
  writeFileSync(file, JSON.stringify({ success: true, data: { required: false, configured: false, misconfigured: false } }))
  return file
}

function runNode(binary: string, file: string, source: string): string {
  return execFileSync(binary, ["-", file], { input: source, encoding: "utf8" }).trim()
}

test("node - lit argv[1] comme un tiret et provoque ENOENT", () => {
  const file = policyFile()
  const output = runNode(process.execPath, file, broken)
  assert.equal(output, "ENOENT -")
  assert.equal(runNode(process.execPath, file, fixedArg), "ok")
})

test("node -e laisse le fichier dans argv[1]", () => {
  const file = policyFile()
  const output = execFileSync(process.execPath, ["-e", "console.log(process.argv[1])", file], { encoding: "utf8" }).trim()
  assert.equal(output, file)
})

test("le cycle de recette valide la politique avec Python, pas avec node -", () => {
  const cycle = readFileSync(path.join(root, "deploy/preprod/auth-simple-cycle.sh"), "utf8")
  const executable = cycle.split("\n").filter((line) => !line.trim().startsWith("#")).join("\n")
  assert.equal(executable.includes("node -"), false)
  assert.equal(executable.includes("process.argv[1]"), false)
  assert.match(executable, /python3 "\$DIR\/check-phone-policy.py" "\$policy_file"/)
  assert.match(readFileSync(path.join(root, "deploy/preprod/auth-simple-cycle.mjs"), "utf8"), /readFileSync\(process\.argv\[2\]/)
  const file = policyFile()
  execFileSync("python3", [path.join(root, "deploy/preprod/check-phone-policy.py"), file], { encoding: "utf8" })
})
