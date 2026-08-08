import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"
export const revalidate = 0

export async function GET() {
  const db = prisma as any

  try {
    if (!db?.subscriptionPlan?.findMany) {
      console.error("[GET /api/subscription/plans] subscriptionPlan model not available (missing Prisma migration?)")
      return NextResponse.json(
        { success: false, error: "Subscription plans not available" },
        { status: 500 }
      )
    }

    const plans = await db.subscriptionPlan.findMany({
      where: {
        isActive: true,
        isPublished: true,
        isVisible: true,
        archivedAt: null,
      },
      orderBy: { sortOrder: "asc" },
    })
    if (!plans.length) {
      console.error("[GET /api/subscription/plans] No active coded plans found in DB")
      return NextResponse.json(
        { success: true, data: [] },
        { status: 200 }
      )
    }
    const shaped = (plans || []).map((p: any) => ({
      id: p.id,
      code: p.code ?? null,
      name: p.name,
      tier: p.tier,
      monthlyPrice: p.monthlyPrice,
      currency: p.currency,
      monthlyCredits: p.monthlyCredits,
      unlockCostCredits: p.unlockCostCredits,
      monthlyBoosts: p.monthlyBoosts,
      cycleDays: p.cycleDays,
      sortOrder: p.sortOrder,
      badge: p.badge ?? null,
      benefits: p.benefits,
      features: p.features,
      isActive: p.isActive,
    }))

    return NextResponse.json(
      { success: true, data: shaped },
      { headers: { "Cache-Control": "no-store" } }
    )
  } catch (e: any) {
    console.error("[GET /api/subscription/plans]", e)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}
