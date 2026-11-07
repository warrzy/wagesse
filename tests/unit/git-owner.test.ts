import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { readFileSync } from "node:fs"
import path from "node:path"
import test from "node:test"

const root = path.resolve(import.meta.dirname, "../..")

function source(relative: string): string {
  return readFileSync(path.join(root, relative), "utf8")
}

test("les scripts de recette ne lancent pas git en root sur le dépôt applicatif", () => {
  const checked = [
    "deploy/preprod/preflight.sh",
    "deploy/preprod/apply-recette-fixes.sh",
    "deploy/preprod/run-step.sh",
    "deploy/preprod/lib.sh",
    "deploy/preprod/rotate-recette-secrets.sh",
  ]
  for (const relative of checked) {
    const text = source(relative)
    assert.equal(text.includes("safe.directory"), false, relative)
    if (relative.endsWith("/lib.sh")) continue
    const raw = text
      .split("\n")
      .filter((line) => !line.trim().startsWith("#"))
      .filter((line) => /\bgit\b/.test(line))
      .filter((line) => !line.includes("git_in"))
      .filter((line) => !line.includes(".git"))
    assert.deepEqual(raw, [], `${relative} contient encore git hors git_in : ${raw.join(" | ")}`)
  }
  const lib = source("deploy/preprod/lib.sh")
  assert.match(lib, /runuser -u "\$owner"/)
  assert.match(lib, /git -C "\$repo"/)
  assert.equal(source("deploy/preprod/run-step.sh").includes("git "), false)
})

test("root est refusé sur un dépôt appartenant à wagesse, git_in lit le commit", () => {
  const output = execFileSync("sudo", ["-n", "bash", path.join(root, "tests/unit/git-owner-as-root.sh"), root], {
    encoding: "utf8",
  })
  assert.match(output, /root refusé, wagesse accepté, commit [0-9a-f]{40}/)
})
