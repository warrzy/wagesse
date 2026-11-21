import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import test from "node:test"

const root = path.resolve(import.meta.dirname, "../..")
const tsc = path.join(root, "node_modules/.bin/tsc")

function source(relative: string): string {
  return readFileSync(path.join(root, relative), "utf8")
}

function dirOfPolicy(): string {
  return mkdtempSync(path.join(tmpdir(), "phone-policy-"))
}

test("le client généré exporte le namespace Prisma du schéma", () => {
  const generated = source("node_modules/.prisma/client/index.d.ts")
  assert.match(generated, /export namespace Prisma \{/)
  assert.match(generated, /SubscriptionPlanSelect/)
  assert.match(source("app/api/admin/abonnements/route.ts"), /import type \{ Prisma \} from "@prisma\/client"/)
  assert.match(source("lib/audit.ts"), /import \{ Prisma \} from "@prisma\/client"/)
  assert.match(source("lib/services/commercial-order-service.ts"), /import \{ Prisma \} from "@prisma\/client"/)
  assert.match(source("app/api/admin/credit-packs/route.ts"), /import type \{ Prisma \} from "@prisma\/client"/)
  execFileSync(tsc, ["--noEmit", "--pretty", "false", "--incremental", "false", "-p", "deploy/preprod/prisma-client-probe.tsconfig.json"], {
    cwd: root,
    encoding: "utf8",
  })
})

test("le déploiement génère le client dans l'application avant la compilation", () => {
  const apply = source("deploy/preprod/apply-recette-fixes.sh")
    .split("\n")
    .filter((line) => !line.trim().startsWith("#"))
    .join("\n")
  const pkg = JSON.parse(source("package.json")) as { scripts: { postinstall: string } }
  assert.equal(pkg.scripts.postinstall, "prisma generate")
  assert.equal(apply.includes("npm --prefix"), false)
  const ci = apply.indexOf("npm ci --no-audit --no-fund")
  const generate = apply.indexOf("npx prisma generate --schema prisma/schema.prisma")
  const probe = apply.indexOf("deploy/preprod/prisma-client-probe.tsconfig.json")
  const build = apply.indexOf("npm run build")
  assert.ok(ci > 0 && generate > ci && probe > generate && build > probe)
  assert.match(apply, /cd "\$1"/)
  assert.match(apply, /secret_filter/)
  const auth = source("deploy/preprod/deploy-auth-simple.sh")
    .split("\n")
    .filter((line) => !line.trim().startsWith("#"))
    .join("\n")
  assert.equal(auth.includes("npm --prefix"), false)
  assert.equal(auth.includes("prisma migrate"), false)
  assert.equal(auth.includes("verify-phone"), false)
  const authCi = auth.indexOf("npm ci --no-audit --no-fund")
  const authGenerate = auth.indexOf("npx prisma generate --schema prisma/schema.prisma")
  const authProbe = auth.indexOf("deploy/preprod/prisma-client-probe.tsconfig.json")
  const authTypecheck = auth.indexOf("npm run typecheck")
  const authBuild = auth.indexOf("npm run build")
  assert.ok(authCi > 0 && authGenerate > authCi && authProbe > authGenerate && authTypecheck > authProbe && authBuild > authTypecheck)
  assert.match(auth, /PHONE_VERIFICATION_REQUIRED=false/)
  assert.match(auth, /systemctl restart wagesse-preprod\.service/)
  assert.equal(auth.includes("systemctl restart nginx"), false)
  assert.match(auth, /627cb4fc0fcd014e8743db2249b1887fe71dd173/)
  assert.match(auth, /d01574087fcbf740e7d9bd5ea4f715a32f7ed113/)
  const cycle = source("deploy/preprod/auth-simple-cycle.sh")
  assert.match(cycle, /git_in "\$APP" rev-parse HEAD/)
  assert.match(cycle, /différent du commit requis/)
  assert.match(cycle, /ne contient pas l'authentification simple/)
  const recipe = source("deploy/preprod/auth-simple-cycle.mjs")
  assert.match(recipe, /\$\{result\.method\} \$\{result\.path\} HTTP 404/)
  assert.match(auth, /python3 "\$DIR\/check-phone-policy.py"/)
  assert.equal(auth.includes("node -"), false)
  assert.match(auth, /POST \/api\/auth\/phone-verification HTTP/)
  assert.match(auth, /"405"/)
  assert.match(auth, /cleanup_diag/)
  assert.match(auth, /Commit effectivement installé/)
  assert.match(source("app/api/auth/phone-verification/route.ts"), /export async function GET/)
  assert.equal(source("app/api/auth/phone-verification/route.ts").includes("export async function POST"), false)
  const accepted = path.join(dirOfPolicy(), "ok.json")
  writeFileSync(accepted, JSON.stringify({ success: true, data: { required: false, configured: false, misconfigured: false } }))
  execFileSync("python3", [path.join(root, "deploy/preprod/check-phone-policy.py"), accepted], { encoding: "utf8" })
  const rejected = path.join(dirOfPolicy(), "secret.json")
  writeFileSync(rejected, JSON.stringify({ data: { required: false, misconfigured: false, note: "password" } }))
  assert.throws(() => execFileSync("python3", [path.join(root, "deploy/preprod/check-phone-policy.py"), rejected], { encoding: "utf8", stdio: "pipe" }))
  const tsconfig = JSON.parse(source("tsconfig.json")) as { include: string[]; exclude?: string[] }
  assert.ok(tsconfig.include.includes("**/*.ts"))
  assert.equal((tsconfig.exclude ?? []).some((item) => item.includes("tests")), false)
})

test("le client factice de postinstall est refusé avant le build", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "prisma-stub-"))
  const client = path.join(dir, "node_modules/@prisma/client")
  const generated = path.join(dir, "node_modules/.prisma/client")
  mkdirSync(client, { recursive: true })
  mkdirSync(path.join(client, "runtime"), { recursive: true })
  mkdirSync(generated, { recursive: true })
  writeFileSync(path.join(client, "runtime/library.d.ts"), "export {}\n")
  writeFileSync(
    path.join(client, "package.json"),
    JSON.stringify({ name: "@prisma/client", version: "0.0.0", types: "default.d.ts" }),
  )
  writeFileSync(path.join(client, "default.d.ts"), "export * from '.prisma/client/default'\n")
  writeFileSync(path.join(generated, "default.d.ts"), source("node_modules/@prisma/client/scripts/default-index.d.ts"))
  writeFileSync(path.join(dir, "prisma-client-probe.ts"), source("deploy/preprod/prisma-client-probe.ts"))
  writeFileSync(path.join(dir, "tsconfig.json"), source("deploy/preprod/prisma-client-probe.tsconfig.json"))
  assert.equal(source("node_modules/@prisma/client/scripts/default-index.d.ts").includes("SubscriptionPlanSelect"), false)
  let failed = false
  try {
    execFileSync(tsc, ["--noEmit", "--pretty", "false", "--incremental", "false", "-p", "tsconfig.json"], {
      cwd: dir,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    })
  } catch (error) {
    failed = true
    const output = `${(error as { stdout?: string }).stdout || ""}\n${(error as { stderr?: string }).stderr || ""}`
    assert.match(output, /SubscriptionPlanSelect|Prisma/)
    assert.equal(output.includes("mysql://"), false)
  }
  assert.equal(failed, true)
})
