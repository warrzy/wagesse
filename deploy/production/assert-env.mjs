import { readFileSync } from "node:fs"

const file = process.argv[2]
if (!file) {
  console.error("Fichier d'environnement requis.")
  process.exit(2)
}

const env = {}
for (const line of readFileSync(file, "utf8").split("\n")) {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith("#")) continue
  const eq = trimmed.indexOf("=")
  if (eq < 1) continue
  env[trimmed.slice(0, eq)] = trimmed.slice(eq + 1).trim()
}

const problems = []
if (env.WAGESSE_DEPLOYMENT === "preprod") problems.push("deploiement-preprod")
if (env.PREPROD_TEST_PHONE_VERIFY === "true") problems.push("verification-fictive")
if ((env.DATABASE_URL || "").includes("/wagesse_preprod")) problems.push("base-preprod")
if (env.OTP_DEBUG_RETURN === "true") problems.push("otp-debug")
if (env.SMS_ALLOW_SIMULATE) problems.push("sms-simulation")
if ((env.SMS_PROVIDER || "").toLowerCase() === "simulate") problems.push("sms-simulate")
if (!env.SMS_HTTP_URL || !env.SMS_HTTP_KEY) problems.push("sms-http-absent")
if (env.NODE_ENV !== "production") problems.push("node-env")

if (problems.length > 0) {
  console.error(`Environnement refusé : ${problems.join(", ")}`)
  process.exit(1)
}

console.log("Mécanisme de recette fermé. SMS HTTP déclaré.")
