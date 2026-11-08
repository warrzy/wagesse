import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import test from "node:test"

const script = path.resolve(import.meta.dirname, "../../deploy/production/assert-env.mjs")

function run(contents: string): { status: number; output: string } {
  const dir = mkdtempSync(path.join(tmpdir(), "wagesse-env-"))
  const file = path.join(dir, "production.env")
  writeFileSync(file, contents, { mode: 0o600 })
  try {
    const output = execFileSync(process.execPath, [script, file], { encoding: "utf8" })
    return { status: 0, output }
  } catch (error) {
    const failed = error as { status?: number; stderr?: string; stdout?: string }
    return { status: failed.status || 1, output: `${failed.stdout || ""}${failed.stderr || ""}` }
  }
}

test("la production refuse le mécanisme de recette et exige un mode SMS explicite", () => {
  const simple = run(`NODE_ENV=production
WAGESSE_DEPLOYMENT=production
DATABASE_URL=mysql://app:placeholder@127.0.0.1:3306/wagesse
PHONE_VERIFICATION_REQUIRED=false
`)
  assert.equal(simple.status, 0)
  assert.equal(simple.output.includes("mysql://"), false)

  const verified = run(`NODE_ENV=production
WAGESSE_DEPLOYMENT=production
DATABASE_URL=mysql://app:placeholder@127.0.0.1:3306/wagesse
PHONE_VERIFICATION_REQUIRED=true
SMS_PROVIDER=http
SMS_HTTP_URL=https://sms.example.invalid/send
SMS_HTTP_KEY=placeholder
`)
  assert.equal(verified.status, 0)

  const smsMissing = run(`NODE_ENV=production
WAGESSE_DEPLOYMENT=production
DATABASE_URL=mysql://app:placeholder@127.0.0.1:3306/wagesse
PHONE_VERIFICATION_REQUIRED=true
SMS_PROVIDER=http
`)
  assert.equal(smsMissing.status, 1)
  assert.match(smsMissing.output, /sms-http-absent/)

  const copied = run(`NODE_ENV=production
WAGESSE_DEPLOYMENT=preprod
PREPROD_TEST_PHONE_VERIFY=true
DATABASE_URL=mysql://app:placeholder@127.0.0.1:3306/wagesse_preprod
OTP_DEBUG_RETURN=true
SMS_ALLOW_SIMULATE=true
SMS_PROVIDER=simulate
`)
  assert.equal(copied.status, 1)
  assert.match(copied.output, /verification-fictive/)
  assert.match(copied.output, /base-preprod/)
  assert.match(copied.output, /verification-telephone-absente/)
  assert.equal(copied.output.includes("placeholder"), false)
  assert.equal(copied.output.includes("mysql://"), false)
})
