import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()
await prisma.creditPack.upsert({
  where: { code: "CI" },
  update: { isActive: true, credits: 5, priceXof: 1000 },
  create: { code: "CI", title: "Pack de test", priceXof: 1000, credits: 5, isActive: true, sortOrder: 1 },
})
await prisma.$disconnect()
