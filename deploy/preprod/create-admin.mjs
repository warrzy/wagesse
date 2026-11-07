import { randomBytes } from "node:crypto"
import { writeFileSync } from "node:fs"
import bcrypt from "bcryptjs"
import { PrismaClient } from "@prisma/client"

if (typeof process.getuid === "function" && process.getuid() === 0) {
  console.error("La création du compte administrateur ne s'exécute pas en root.")
  process.exit(1)
}

const phone = process.env.ADMIN_PHONE || ""
const credPath = process.env.ADMIN_CREDENTIALS_PATH || ""

if (!/^[0-9]{8,15}$/.test(phone)) {
  console.error("Numéro administrateur requis : 8 à 15 chiffres, sans espace.")
  process.exit(1)
}

if (!credPath.startsWith("/")) {
  console.error("Chemin des identifiants administrateur absent.")
  process.exit(1)
}

const prisma = new PrismaClient()

try {
  const existing = await prisma.user.findUnique({ where: { phone }, select: { id: true, role: true } })
  if (existing) {
    console.log("Compte administrateur déjà présent. Mot de passe inchangé.")
    process.exit(0)
  }

  const password = randomBytes(18).toString("base64url")
  const created = await prisma.user.create({
    data: {
      email: `${phone}@wagesse.local`,
      phone,
      password: await bcrypt.hash(password, 12),
      firstName: "Admin",
      lastName: "Préproduction",
      role: "ADMIN",
      status: "ACTIVE",
      phoneVerified: new Date(),
    },
  })

  try {
    writeFileSync(credPath, `phone=${phone}\npassword=${password}\n`, { mode: 0o600, flag: "wx" })
  } catch {
    await prisma.user.delete({ where: { id: created.id } }).catch(() => {})
    console.error("Impossible d'enregistrer les identifiants. Compte non conservé.")
    process.exit(1)
  }

  console.log("Compte administrateur créé. Identifiants enregistrés hors du journal.")
} catch {
  console.error("Création du compte administrateur impossible.")
  process.exit(1)
} finally {
  await prisma.$disconnect()
}
