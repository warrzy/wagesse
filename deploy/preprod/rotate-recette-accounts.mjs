import { randomBytes } from "node:crypto"
import bcrypt from "bcryptjs"
import { PrismaClient } from "@prisma/client"

// Ces imports échouent avant toute connexion. Aucun hachage n'est alors modifié.

const fictionalPhones = ["78001021", "78001022", "78002021", "78002022"]
const recetteAdminPhone = "78003021"
const prisma = new PrismaClient()
const reverted = []
let createdAdminId = null

function makePassword() {
  return randomBytes(18).toString("base64url")
}

async function distinctPassword(chosen, admins) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const candidate = makePassword()
    if (chosen.has(candidate)) continue
    let clashes = false
    for (const admin of admins) {
      if (await bcrypt.compare(candidate, admin.password)) clashes = true
    }
    if (!clashes) return candidate
  }
  throw new Error("password")
}

async function replacePassword(user, nextPassword) {
  const previous = user.password
  const nextHash = await bcrypt.hash(nextPassword, 12)
  if (nextHash === previous || (await bcrypt.compare(nextPassword, previous))) {
    throw new Error("unchanged")
  }
  await prisma.user.update({ where: { id: user.id }, data: { password: nextHash } })
  reverted.push({ id: user.id, previous })
  const stored = await prisma.user.findUnique({ where: { id: user.id }, select: { password: true } })
  if (!stored || stored.password === previous || !(await bcrypt.compare(nextPassword, stored.password))) {
    throw new Error("not-replaced")
  }
}

async function restore() {
  for (const item of reverted) {
    await prisma.user.update({ where: { id: item.id }, data: { password: item.previous } })
  }
  if (createdAdminId) {
    await prisma.user.delete({ where: { id: createdAdminId } })
  }
}

try {
  const databaseName = new URL(process.env.DATABASE_URL || "").pathname.replace(/^\//, "")
  if (databaseName !== "wagesse_preprod") {
    console.error("Base refusée.")
    throw new Error("database")
  }

  const before = await prisma.user.findMany({
    where: { role: "ADMIN", phone: { not: recetteAdminPhone } },
    select: { id: true, phone: true, password: true },
  })
  if (before.some((user) => fictionalPhones.includes(user.phone) || user.phone === recetteAdminPhone)) {
    console.error("Refus de modifier un administrateur existant.")
    throw new Error("existing-admin")
  }

  const chosen = new Set()
  const accounts = []
  for (const phone of fictionalPhones) {
    const user = await prisma.user.findUnique({ where: { phone } })
    if (!user || user.role === "ADMIN" || user.role === "SUPER_ADMIN") {
      console.error(`Compte fictif refusé : ${phone}`)
      throw new Error("account")
    }
    const nextPassword = await distinctPassword(chosen, before)
    chosen.add(nextPassword)
    await replacePassword(user, nextPassword)
    accounts.push({
      phone,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      password: nextPassword,
    })
  }

  const reserved = await prisma.user.findUnique({ where: { phone: recetteAdminPhone } })
  if (reserved && reserved.role !== "ADMIN") {
    console.error("Le numéro réservé à l'administrateur de recette est déjà utilisé.")
    throw new Error("reserved")
  }
  const adminPassword = await distinctPassword(chosen, before)
  chosen.add(adminPassword)
  if (!reserved) {
    const created = await prisma.user.create({
      data: {
        email: `${recetteAdminPhone}@wagesse.local`,
        phone: recetteAdminPhone,
        password: await bcrypt.hash(adminPassword, 12),
        firstName: "Recette",
        lastName: "Admin",
        role: "ADMIN",
        status: "ACTIVE",
        phoneVerified: new Date(),
      },
    })
    createdAdminId = created.id
    const stored = await prisma.user.findUnique({ where: { id: created.id }, select: { password: true, role: true } })
    if (!stored || stored.role !== "ADMIN" || !(await bcrypt.compare(adminPassword, stored.password))) {
      throw new Error("admin")
    }
  } else {
    await replacePassword(reserved, adminPassword)
  }
  accounts.push({
    phone: recetteAdminPhone,
    role: "ADMIN",
    firstName: "Recette",
    lastName: "Admin",
    password: adminPassword,
  })

  const after = await prisma.user.findMany({
    where: { id: { in: before.map((user) => user.id) } },
    select: { id: true, password: true },
  })
  const untouched = before.every((user) => after.find((item) => item.id === user.id)?.password === user.password)
  if (!untouched || new Set(accounts.map((account) => account.password)).size !== 5) {
    throw new Error("distinct")
  }

  process.stdout.write(JSON.stringify({
    replaced: fictionalPhones.length,
    existingAdminsUnchanged: true,
    existingAdminCount: before.length,
    accounts,
  }))
  createdAdminId = null
} catch {
  try {
    await restore()
  } catch {
    console.error("Restauration des hachages incomplète.")
    process.exit(1)
  }
  console.error("Rotation annulée. Anciens hachages restaurés.")
  process.exit(1)
} finally {
  await prisma.$disconnect()
}
