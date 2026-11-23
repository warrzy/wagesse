import { PrismaClient } from "@prisma/client"

export const CREDIT_MIGRATION = "20261121190000_quote_submission_credit"
export const ACCESS_MIGRATION = "20261123160000_account_access"
const REQUIRED = ["SELECT", "INSERT", "UPDATE", "DELETE", "CREATE", "ALTER", "INDEX"]

function field(row, name) {
  const key = Object.keys(row).find((item) => item.toLowerCase() === name.toLowerCase())
  return key === undefined ? undefined : row[key]
}

export function missingPrivileges(grantText, database) {
  const lines = String(grantText).split("\n")
  const relevant = lines.filter((line) => {
    return (
      line.includes(`ON \`${database}\`.*`) ||
      line.includes(`ON ${database}.*`) ||
      /\bON \*\.\*/.test(line)
    )
  })
  if (relevant.some((line) => /\bALL PRIVILEGES\b/.test(line))) return []
  return REQUIRED.filter((privilege) => !relevant.some((line) => new RegExp(`\\b${privilege}\\b`).test(line)))
}

export function creditSchemaApplied(roleEnum, transactionEnum) {
  return String(roleEnum).includes("SUPER_ADMIN") || String(transactionEnum).includes("QUOTE_SUBMISSION")
}

export function accessSchemaApplied(columnNames, tableNames) {
  return columnNames.includes("tokenVersion") || tableNames.includes("PasswordAssistanceRequest")
}

function classify(error) {
  const text = `${error?.code || ""} ${error?.errorCode || ""} ${error?.message || ""}`
  if (text.includes("P1000")) return "AUTHENTICATION_FAILED"
  if (text.includes("P1001")) return "DATABASE_UNREACHABLE"
  if (text.includes("P1010")) return "DATABASE_ACCESS_DENIED"
  const code = text.match(/P\d{4}/)
  if (code) return `PRISMA_${code[0]}`
  return "DATABASE_COMMAND_FAILED"
}

async function readFacts(prisma) {
  const grants = await prisma.$queryRawUnsafe("SHOW GRANTS FOR CURRENT_USER()")
  const grantText = grants.map((row) => Object.values(row).join(" ")).join("\n")
  const current = await prisma.$queryRawUnsafe("SELECT DATABASE() AS current_database")
  const database = String(field(current[0], "current_database") || "")
  const migrations = await prisma.$queryRawUnsafe(
    "SELECT migration_name, finished_at, rolled_back_at FROM _prisma_migrations WHERE migration_name IN ('20261121190000_quote_submission_credit', '20261123160000_account_access')"
  )
  const columns = await prisma.$queryRawUnsafe(
    "SELECT COLUMN_NAME AS column_name, COLUMN_TYPE AS column_type FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND ((TABLE_NAME = 'User' AND COLUMN_NAME IN ('role', 'tokenVersion', 'passwordMustChange', 'temporaryPasswordExpiresAt')) OR (TABLE_NAME = 'CreditTransaction' AND COLUMN_NAME = 'type'))"
  )
  const tables = await prisma.$queryRawUnsafe(
    "SELECT TABLE_NAME AS table_name FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'PasswordAssistanceRequest'"
  )
  return { grantText, database, migrations, columns, tables }
}

function columnType(columns, name) {
  const row = columns.find((item) => field(item, "column_name") === name)
  return row ? String(field(row, "column_type") || "") : ""
}

function appliedFor(name, columns, tables) {
  const columnNames = columns.map((item) => String(field(item, "column_name") || ""))
  const tableNames = tables.map((item) => String(field(item, "table_name") || ""))
  if (name === CREDIT_MIGRATION) return creditSchemaApplied(columnType(columns, "role"), columnType(columns, "type"))
  if (name === ACCESS_MIGRATION) return accessSchemaApplied(columnNames, tableNames)
  return false
}

async function main() {
  const command = process.argv[2]
  if (!["privileges", "failed", "verify"].includes(command)) {
    console.log("PREFLIGHT_COMMAND_INVALID")
    process.exit(1)
  }
  const prisma = new PrismaClient({ log: [] })
  let exitCode = 0
  try {
    const facts = await readFacts(prisma)
    const missing = missingPrivileges(facts.grantText, facts.database)
    if (command === "privileges") {
      if (!/^[A-Za-z0-9_]+$/.test(facts.database)) {
        console.log("DATABASE_NAME_INVALID")
        exitCode = 1
      } else if (missing.length) {
        console.log(`PRIVILEGE_MISSING ${missing.join(",")}`)
        exitCode = 2
      } else {
        console.log("PRIVILEGES_OK")
      }
    }
    if (command === "failed") {
      const failed = facts.migrations.filter((row) => field(row, "finished_at") == null && field(row, "rolled_back_at") == null)
      if (failed.length === 0) console.log("FAILED_NONE")
      for (const row of failed) {
        const name = String(field(row, "migration_name"))
        const applied = appliedFor(name, facts.columns, facts.tables) ? "yes" : "no"
        console.log(`FAILED ${name} schema_applied=${applied}`)
      }
    }
    if (command === "verify") {
      const finished = new Set(
        facts.migrations
          .filter((row) => field(row, "finished_at") != null && field(row, "rolled_back_at") == null)
          .map((row) => String(field(row, "migration_name")))
      )
      const columnNames = facts.columns.map((item) => String(field(item, "column_name") || ""))
      const tableNames = facts.tables.map((item) => String(field(item, "table_name") || ""))
      const missingParts = []
      if (!finished.has(CREDIT_MIGRATION)) missingParts.push(CREDIT_MIGRATION)
      if (!finished.has(ACCESS_MIGRATION)) missingParts.push(ACCESS_MIGRATION)
      for (const name of ["tokenVersion", "passwordMustChange", "temporaryPasswordExpiresAt"]) {
        if (!columnNames.includes(name)) missingParts.push(name)
      }
      if (!tableNames.includes("PasswordAssistanceRequest")) missingParts.push("PasswordAssistanceRequest")
      if (!columnType(facts.columns, "role").includes("SUPER_ADMIN")) missingParts.push("SUPER_ADMIN")
      if (!columnType(facts.columns, "type").includes("QUOTE_SUBMISSION")) missingParts.push("QUOTE_SUBMISSION")
      if (missingParts.length) {
        console.log(`VERIFY_MISSING ${missingParts.join(",")}`)
        exitCode = 3
      } else {
        console.log("VERIFY_OK")
      }
    }
  } catch (error) {
    console.log(classify(error))
    exitCode = 1
  } finally {
    await prisma.$disconnect().catch(() => {})
  }
  process.exit(exitCode)
}

if (process.argv[1]?.endsWith("migration-preflight.mjs")) {
  main()
}
