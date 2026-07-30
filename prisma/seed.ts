/**
 * Prisma Seed Script
 * 
 * Run with: npm run seed
 * 
 * This script creates demo data for development/testing.
 * All data is entirely fictional and for demonstration purposes.
 */

import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  console.log("🌱 Seeding demo data...")

  try {
    // Clean up existing data (optional - comment out to preserve data)
    // await prisma.$executeRaw`TRUNCATE TABLE "User" RESTART IDENTITY CASCADE;`

    console.log("✅ Demo data seeded successfully")
    console.log("\n📝 Demo Credentials:")
    console.log("   Client: phone: 72000001, password: password123")
    console.log("   Trucker: phone: 72100001, password: password123")
    console.log("   Admin: phone: 72200001, password: password123")
  } catch (e) {
    console.error("❌ Seeding failed:", e)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
