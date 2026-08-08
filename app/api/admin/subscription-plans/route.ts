import { NextRequest, NextResponse } from "next/server"
import { getAuthContext, unauthorized } from "@/lib/api-auth"
import { prisma } from "@/lib/prisma"

function forbid() {
  return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
}

export async function GET(request: NextRequest) {
  const auth = getAuthContext(request)
  if (!auth) return unauthorized()
  if (auth.role !== "ADMIN") return forbid()

  const db = prisma as any
  const plans = await db.subscriptionPlan.findMany({ orderBy: { sortOrder: "asc" } })
  return NextResponse.json({ success: true, data: plans })
}

export async function PUT(request: NextRequest) {
  try {
    const auth = getAuthContext(request)
    if (!auth) return unauthorized()
    if (auth.role !== "ADMIN") return forbid()

    const body = await request.json()
    const plans = Array.isArray(body?.plans) ? body.plans : null
    if (!plans) {
      return NextResponse.json({ success: false, error: "plans manquant" }, { status: 400 })
    }

    const db = prisma as any

    const updated = []
    for (const p of plans) {
      const id = String(p.id || "")
      if (!id) continue

      const data: any = {}
      if (p.name !== undefined) data.name = String(p.name)
      if (p.monthlyPrice !== undefined) data.monthlyPrice = Number(p.monthlyPrice)
      if (p.monthlyCredits !== undefined) data.monthlyCredits = Number(p.monthlyCredits)
      if (p.unlockCostCredits !== undefined) data.unlockCostCredits = Number(p.unlockCostCredits)
      if (p.monthlyBoosts !== undefined) data.monthlyBoosts = Number(p.monthlyBoosts)
      if (p.benefits !== undefined) data.benefits = p.benefits
      if (p.isActive !== undefined) data.isActive = Boolean(p.isActive)
      if (p.sortOrder !== undefined) data.sortOrder = Number(p.sortOrder)

      const u = await db.subscriptionPlan.update({ where: { id }, data })
      updated.push(u)
    }

    return NextResponse.json({ success: true, data: updated })
  } catch (e: any) {
    console.error("[PUT /api/admin/subscription-plans]", e)
    return NextResponse.json({ success: false, error: e.message || "Internal server error" }, { status: 500 })
  }
}
