/**
 * Prisma Seed Script
 *
 * Run with: npm run seed
 *
 * This script creates reference data and demo accounts for development/testing.
 * All data is entirely fictional and for demonstration purposes.
 */

import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"
import { MATERIAL_TYPES, TRUCK_TYPES, SUBSCRIPTION_TIERS } from "../lib/config"

const prisma = new PrismaClient()

async function main() {
  console.log("🌱 Seeding demo data...")

  try {
    // Reference data: materials
    for (const material of MATERIAL_TYPES) {
      await prisma.material.upsert({
        where: { name: material.name },
        update: {},
        create: {
          name: material.name,
          category: material.category,
          density: material.density,
        },
      })
    }

    // Reference data: truck types
    for (const truckType of TRUCK_TYPES) {
      await prisma.truckType.upsert({
        where: { name: truckType.name },
        update: {},
        create: {
          name: truckType.name,
          minCapacity: truckType.minCapacity,
          maxCapacity: truckType.maxCapacity,
        },
      })
    }

    // Reference data: subscription plans
    try {
      // Deactivate legacy plans (previous seed versions) that don't have a code.
      // This avoids duplicates in the UI while keeping historical rows.
      await (prisma as any).subscriptionPlan.updateMany({
        where: { code: null },
        data: { isActive: false },
      })

      const plans = [
        {
          code: "FREE" as const,
          name: "FREE",
          tier: "free",
          monthlyPrice: 0,
          annualPrice: null,
          currency: "XOF",
          trialDays: 0,
          monthlyCredits: 0,
          unlockCostCredits: 1,
          monthlyBoosts: 0,
          cycleDays: 30,
          benefits: [
            "Publication gratuite des demandes/offres",
            "Consultation des offres",
            "0 crédit mensuel",
            "Achat de crédits à la carte",
            "Tarif normal de déblocage",
            "Fonctionnalités essentielles",
          ],
          features: [],
          maxVehicles: 1,
          maxRequests: null,
          maxProposals: null,
          platformCommissionRate: 0.1,
          sortOrder: 0,
          badge: null,
          isPublished: true,
          isVisible: true,
          isActive: true,
        },
        {
          code: "PRO" as const,
          name: "PRO",
          tier: "pro",
          monthlyPrice: 5000,
          annualPrice: null,
          currency: "XOF",
          trialDays: 0,
          monthlyCredits: 10,
          unlockCostCredits: 1,
          monthlyBoosts: 2,
          cycleDays: 30,
          benefits: [
            "10 crédits/mois (jusqu’à 10 contacts)",
            "2 boosts/mois",
            "Badge PRO",
            "Meilleure visibilité",
            "Historique complet",
            "Support prioritaire",
          ],
          features: [],
          maxVehicles: 1,
          maxRequests: null,
          maxProposals: null,
          platformCommissionRate: 0.1,
          sortOrder: 10,
          badge: "Le plus populaire",
          isPublished: true,
          isVisible: true,
          isActive: true,
        },
        {
          code: "BUSINESS" as const,
          name: "BUSINESS",
          tier: "business",
          monthlyPrice: 15000,
          annualPrice: null,
          currency: "XOF",
          trialDays: 0,
          monthlyCredits: 35,
          unlockCostCredits: 1,
          monthlyBoosts: 10,
          cycleDays: 30,
          benefits: [
            "35 crédits/mois (jusqu’à 35 contacts)",
            "10 boosts/mois",
            "Badge BUSINESS",
            "Priorité supérieure dans les résultats",
            "Statistiques avancées",
            "Historique complet",
            "Support prioritaire",
            "Fonctionnalités destinées aux utilisateurs à fort volume",
          ],
          features: [],
          maxVehicles: 1,
          maxRequests: null,
          maxProposals: null,
          platformCommissionRate: 0.1,
          sortOrder: 20,
          badge: "Pour les professionnels",
          isPublished: true,
          isVisible: true,
          isActive: true,
        },
      ]

      for (const p of plans) {
        // Prefer upsert by code when available (new schema)
        if ((prisma as any).subscriptionPlan?.upsert) {
          try {
            await (prisma as any).subscriptionPlan.upsert({
              where: { code: p.code },
              update: {
                name: p.name,
                tier: p.tier,
                monthlyPrice: p.monthlyPrice,
                annualPrice: p.annualPrice,
                currency: p.currency,
                trialDays: p.trialDays,
                monthlyCredits: p.monthlyCredits,
                unlockCostCredits: p.unlockCostCredits,
                monthlyBoosts: p.monthlyBoosts,
                cycleDays: p.cycleDays,
                benefits: p.benefits,
                features: p.features,
                maxVehicles: p.maxVehicles,
                maxRequests: p.maxRequests,
                maxProposals: p.maxProposals,
                platformCommissionRate: p.platformCommissionRate,
                sortOrder: p.sortOrder,
                badge: (p as any).badge ?? null,
                isPublished: (p as any).isPublished ?? true,
                isVisible: (p as any).isVisible ?? true,
                isActive: p.isActive,
              },
              create: {
                code: p.code,
                name: p.name,
                tier: p.tier,
                monthlyPrice: p.monthlyPrice,
                annualPrice: p.annualPrice,
                currency: p.currency,
                trialDays: p.trialDays,
                monthlyCredits: p.monthlyCredits,
                unlockCostCredits: p.unlockCostCredits,
                monthlyBoosts: p.monthlyBoosts,
                cycleDays: p.cycleDays,
                benefits: p.benefits,
                features: p.features,
                maxVehicles: p.maxVehicles,
                maxRequests: p.maxRequests,
                maxProposals: p.maxProposals,
                platformCommissionRate: p.platformCommissionRate,
                sortOrder: p.sortOrder,
                badge: (p as any).badge ?? null,
                isPublished: (p as any).isPublished ?? true,
                isVisible: (p as any).isVisible ?? true,
                isActive: p.isActive,
              },
            })
            continue
          } catch {
            // Fall through to name-based upsert for older schema versions
          }
        }

        const existingByName = await prisma.subscriptionPlan.findFirst({
          where: { name: p.name },
          select: { id: true },
        })
        if (existingByName) {
          await prisma.subscriptionPlan.update({
            where: { id: existingByName.id },
            data: {
              tier: p.tier,
              monthlyPrice: p.monthlyPrice,
              annualPrice: p.annualPrice ?? undefined,
              currency: p.currency,
              trialDays: p.trialDays,
              maxVehicles: p.maxVehicles,
              maxRequests: p.maxRequests ?? undefined,
              maxProposals: p.maxProposals ?? undefined,
              features: p.features,
              platformCommissionRate: p.platformCommissionRate,
              isActive: p.isActive,
            } as any,
          })
        } else {
          await prisma.subscriptionPlan.create({
            data: {
              name: p.name,
              tier: p.tier,
              monthlyPrice: p.monthlyPrice,
              annualPrice: p.annualPrice ?? undefined,
              currency: p.currency,
              trialDays: p.trialDays,
              maxVehicles: p.maxVehicles,
              maxRequests: p.maxRequests ?? undefined,
              maxProposals: p.maxProposals ?? undefined,
              features: p.features,
              platformCommissionRate: p.platformCommissionRate,
              isActive: p.isActive,
            } as any,
          })
        }
      }
    } catch (e) {
      // Keep backward compatibility with the old SUBSCRIPTION_TIERS seed
      for (const [tier, plan] of Object.entries(SUBSCRIPTION_TIERS)) {
        const existingByName = await prisma.subscriptionPlan.findFirst({
          where: { name: plan.name },
          select: { id: true },
        })
        if (existingByName) continue
        await prisma.subscriptionPlan.create({
          data: {
            name: plan.name,
            tier,
            monthlyPrice: plan.monthlyPrice,
            annualPrice: plan.annualPrice,
            maxVehicles: plan.maxVehicles ?? 1,
            maxRequests: plan.maxRequests,
            platformCommissionRate: plan.platformCommissionRate,
            features: plan.features,
          } as any,
        })
      }
    }

    // Reference data: credit packs
    try {
      const creditPacks = [
        {
          code: "PACK_DECOUVERTE",
          title: "Pack Découverte",
          priceXof: 1000,
          credits: 1,
          badge: null,
          sortOrder: 0,
          isActive: true,
        },
        {
          code: "PACK_ESSENTIEL",
          title: "Pack Essentiel",
          priceXof: 2500,
          credits: 3,
          badge: "Pour commencer",
          sortOrder: 10,
          isActive: true,
        },
        {
          code: "PACK_PRO",
          title: "Pack Pro",
          priceXof: 5000,
          credits: 7,
          badge: "Le plus populaire",
          sortOrder: 20,
          isActive: true,
        },
        {
          code: "PACK_BUSINESS",
          title: "Pack Business",
          priceXof: 10000,
          credits: 16,
          badge: "Meilleure valeur",
          sortOrder: 30,
          isActive: true,
        },
      ]

      for (const p of creditPacks) {
        await prisma.creditPack.upsert({
          where: { code: p.code },
          update: {
            title: p.title,
            priceXof: p.priceXof,
            credits: p.credits,
            badge: p.badge,
            sortOrder: p.sortOrder,
            isActive: p.isActive,
          },
          create: {
            code: p.code,
            title: p.title,
            priceXof: p.priceXof,
            credits: p.credits,
            badge: p.badge,
            sortOrder: p.sortOrder,
            isActive: p.isActive,
          },
        })
      }
    } catch (e) {
      console.error("[seed] credit packs seed failed", e)
    }

    if (process.env.SEED_DEMO_ACCOUNTS === "false") {
      console.log("SEED_DEMO_ACCOUNTS=false : référentiel chargé, comptes de démonstration ignorés")
      return
    }

    // Demo accounts — développement et tests uniquement.
    const passwordHash = await bcrypt.hash("password123", 10)

    const client = await prisma.user.upsert({
      where: { phone: "72000001" },
      update: {},
      create: {
        email: "72000001@wagesse.local",
        phone: "72000001",
        password: passwordHash,
        firstName: "Adama",
        lastName: "Client",
        role: "CLIENT",
        phoneVerified: new Date(),
      },
    })
    await prisma.customerProfile.upsert({
      where: { userId: client.id },
      update: {},
      create: { userId: client.id, city: "Ouagadougou" },
    })

    const trucker = await prisma.user.upsert({
      where: { phone: "72100001" },
      update: {},
      create: {
        email: "72100001@wagesse.local",
        phone: "72100001",
        password: passwordHash,
        firstName: "Ibrahim",
        lastName: "Camionneur",
        role: "TRUCKER",
        phoneVerified: new Date(),
      },
    })
    const truckerProfile = await prisma.truckerProfile.upsert({
      where: { userId: trucker.id },
      update: {},
      create: {
        userId: trucker.id,
        city: "Ouagadougou",
        truckerType: "INDEPENDENT_DRIVER",
      },
    })
    await prisma.vehicle.upsert({
      where: { licensePlate: "BF 001 LM" },
      update: {},
      create: {
        truckerId: truckerProfile.id,
        licensePlate: "BF 001 LM",
        brand: "Isuzu",
        model: "FVR",
        year: 2019,
        vehicleType: "DUMP_TRUCK_3_AXLES",
        capacityTonnes: 20,
      },
    })

    await prisma.user.upsert({
      where: { phone: "72200001" },
      update: {},
      create: {
        email: "72200001@wagesse.local",
        phone: "72200001",
        password: passwordHash,
        firstName: "Admin",
        lastName: "Wagesse",
        role: "ADMIN",
        phoneVerified: new Date(),
      },
    })

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
