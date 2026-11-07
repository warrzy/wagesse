import { randomBytes } from "node:crypto"
import bcrypt from "bcryptjs"
import { PrismaClient } from "@prisma/client"

const fictionalPhones = ["78001021", "78001022", "78002021", "78002022"]
const recetteAdminPhone = "78003021"
const prisma = new PrismaClient()

function password() {
  return randomBytes(18).toString("base64url")
}

try {
  const before = await prisma.user.findMany({
    where: { role: "ADMIN", phone: { not: recetteAdminPhone } },
    select: { id: true, password: true },
  })

  const accounts = []
  for (const phone of fictionalPhones) {
    const user = await prisma.user.findUnique({ where: { phone } })
    if (!user) {
      console.error(`Compte fictif absent : ${phone}`)
      process.exit(1)
    }
    if (user.role === "ADMIN" || user.role === "SUPER_ADMIN") {
      console.error("Refus de modifier un administrateur existant.")
      process.exit(1)
    }
    const nextPassword = password()
    await prisma.user.update({
      where: { id: user.id },
      data: { password: await bcrypt.hash(nextPassword, 12) },
    })
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
    process.exit(1)
  }
  if (!reserved) {
    const nextPassword = password()
    await prisma.user.create({
      data: {
        email: `${recetteAdminPhone}@wagesse.local`,
        phone: recetteAdminPhone,
        password: await bcrypt.hash(nextPassword, 12),
        firstName: "Recette",
        lastName: "Admin",
        role: "ADMIN",
        status: "ACTIVE",
        phoneVerified: new Date(),
      },
    })
    accounts.push({
      phone: recetteAdminPhone,
      role: "ADMIN",
      firstName: "Recette",
      lastName: "Admin",
      password: nextPassword,
    })
  } else {
    accounts.push({
      phone: recetteAdminPhone,
      role: "ADMIN",
      firstName: reserved.firstName,
      lastName: reserved.lastName,
      password: null,
      note: "mot de passe inchangé",
    })
  }

  const after = await prisma.user.findMany({
    where: { id: { in: before.map((user) => user.id) } },
    select: { id: true, password: true },
  })
  const untouched = before.every((user) => after.find((item) => item.id === user.id)?.password === user.password)
  if (!untouched) {
    console.error("Un administrateur existant a été modifié. Arrêt.")
    process.exit(1)
  }

  process.stdout.write(JSON.stringify({ accounts }))
} catch {
  console.error("Rotation des comptes de recette impossible.")
  process.exit(1)
} finally {
  await prisma.$disconnect()
}
