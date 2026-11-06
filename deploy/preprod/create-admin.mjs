import { randomBytes } from "node:crypto"
import { writeFileSync } from "node:fs"
import bcrypt from "bcryptjs"
import { PrismaClient } from "@prisma/client"

const phone = process.env.ADMIN_PHONE || ""
const credPath = process.env.ADMIN_CREDENTIALS_PATH || "/etc/wagesse/preprod-admin.credentials"

if (!/^[0-9]{8,15}$/.test(phone)) {
  console.error("ADMIN_PHONE requis : 8 à 15 chiffres, sans espace.")
  process.exit(1)
}

const prisma = new PrismaClient()

try {
  const existing = await prisma.user.findUnique({ where: { phone }, select: { id: true, role: true } })
  if (existing) {
    console.log(`Compte ${phone} déjà présent (${existing.role}). Mot de passe inchangé.`)
    process.exit(0)
  }

  const password = randomBytes(18).toString("base64url")
  await prisma.user.create({
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
  writeFileSync(credPath, `phone=${phone}\npassword=${password}\n`, { mode: 0o600 })
  console.log(`Compte administrateur créé. Identifiants dans ${credPath} (droits 600).`)
} finally {
  await prisma.$disconnect()
}
