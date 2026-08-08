import { NextRequest, NextResponse } from "next/server"
import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { getAuthContext, unauthorized } from "@/lib/api-auth"

function isAdmin(role: string | null | undefined) {
  return role === "ADMIN" || role === "SUPER_ADMIN"
}

function toInt(s: string | null, fallback: number) {
  const n = parseInt(s || "", 10)
  return Number.isFinite(n) ? n : fallback
}

export async function GET(request: NextRequest) {
  try {
    const auth = getAuthContext(request)
    if (!auth) return unauthorized()
    if (!isAdmin(auth.role)) return unauthorized("Forbidden")

    const { searchParams } = new URL(request.url)

    const page = Math.max(toInt(searchParams.get("page"), 1), 1)
    const pageSize = Math.min(Math.max(toInt(searchParams.get("pageSize"), 20), 5), 100)
    const skip = (page - 1) * pageSize

    const q = (searchParams.get("q") || "").trim()
    const tier = (searchParams.get("tier") || "").trim()
    const isActiveRaw = (searchParams.get("isActive") || "").trim()
    const isPublishedRaw = (searchParams.get("isPublished") || "").trim()
    const isVisibleRaw = (searchParams.get("isVisible") || "").trim()
    const archivedRaw = (searchParams.get("archived") || "").trim()
    const sort = (searchParams.get("sort") || "sortOrder_asc").trim()

    const where: any = {}

    // By default, hide archived plans in admin list
    if (!archivedRaw) {
      where.archivedAt = null
    } else {
      if (archivedRaw === "true") where.archivedAt = { not: null }
      if (archivedRaw === "false") where.archivedAt = null
    }

    if (tier) where.tier = tier
    if (isActiveRaw) {
      if (isActiveRaw === "true") where.isActive = true
      if (isActiveRaw === "false") where.isActive = false
    }

    if (isPublishedRaw) {
      if (isPublishedRaw === "true") where.isPublished = true
      if (isPublishedRaw === "false") where.isPublished = false
    }

    if (isVisibleRaw) {
      if (isVisibleRaw === "true") where.isVisible = true
      if (isVisibleRaw === "false") where.isVisible = false
    }

    if (q) {
      where.OR = [
        { id: { contains: q } },
        { code: { contains: q } },
        { name: { contains: q } },
        { tier: { contains: q } },
      ]
    }

    const orderBy: any = (() => {
      const [field, dir] = sort.split("_")
      const direction = dir === "asc" ? "asc" : "desc"

      if (field === "name") return { name: direction }
      if (field === "tier") return { tier: direction }
      if (field === "monthlyPrice") return { monthlyPrice: direction }
      if (field === "monthlyCredits") return { monthlyCredits: direction }
      if (field === "updatedAt") return { updatedAt: direction }
      return { sortOrder: direction }
    })()

    const select = {
      id: true,
      code: true,
      name: true,
      tier: true,
      description: true,
      monthlyPrice: true,
      annualPrice: true,
      currency: true,
      trialDays: true,
      monthlyCredits: true,
      unlockCostCredits: true,
      monthlyBoosts: true,
      cycleDays: true,
      benefits: true,
      features: true,
      platformCommissionRate: true,
      isActive: true,
      isPublished: true,
      isVisible: true,
      badge: true,
      archivedAt: true,
      sortOrder: true,
      maxVehicles: true,
      maxRequests: true,
      maxProposals: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { subscriptions: true } },
    } satisfies Prisma.SubscriptionPlanSelect

    const [total, items] = await Promise.all([
      prisma.subscriptionPlan.count({ where }),
      prisma.subscriptionPlan.findMany({
        where,
        orderBy,
        skip,
        take: pageSize,
        select,
      }),
    ])

    return NextResponse.json({
      success: true,
      data: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
        items,
      },
    })
  } catch (error) {
    console.error("[GET /api/admin/abonnements]", error)
    return NextResponse.json(
      { success: false, error: "Internal server error", code: "SERVER_ERROR" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = getAuthContext(request)
    if (!auth) return unauthorized()
    if (!isAdmin(auth.role)) return unauthorized("Forbidden")

    const body = await request.json()

    const data: any = {
      code: body?.code ?? null,
      name: String(body?.name || "").trim(),
      tier: String(body?.tier || "").trim(),
      description: body?.description ?? null,
      monthlyPrice: Number(body?.monthlyPrice ?? 0),
      annualPrice: body?.annualPrice === null || body?.annualPrice === undefined ? null : Number(body?.annualPrice),
      currency: String(body?.currency || "XOF"),
      trialDays: Number(body?.trialDays ?? 0),
      monthlyCredits: Number(body?.monthlyCredits ?? 0),
      unlockCostCredits: Number(body?.unlockCostCredits ?? 1),
      monthlyBoosts: Number(body?.monthlyBoosts ?? 0),
      cycleDays: Number(body?.cycleDays ?? 30),
      benefits: body?.benefits ?? [],
      features: body?.features ?? [],
      platformCommissionRate: body?.platformCommissionRate === undefined ? 0.1 : Number(body?.platformCommissionRate),
      sortOrder: Number(body?.sortOrder ?? 0),
      maxVehicles: Number(body?.maxVehicles ?? 1),
      maxRequests: body?.maxRequests === undefined ? null : body?.maxRequests === null ? null : Number(body?.maxRequests),
      maxProposals: body?.maxProposals === undefined ? null : body?.maxProposals === null ? null : Number(body?.maxProposals),
      isActive: body?.isActive === undefined ? true : Boolean(body?.isActive),
      isPublished: body?.isPublished === undefined ? false : Boolean(body?.isPublished),
      isVisible: body?.isVisible === undefined ? true : Boolean(body?.isVisible),
      badge: body?.badge === undefined ? null : body?.badge === null ? null : String(body?.badge),
      archivedAt: null,
    }

    if (!data.name) {
      return NextResponse.json({ success: false, error: "name manquant" }, { status: 400 })
    }
    if (!data.tier) {
      return NextResponse.json({ success: false, error: "tier manquant" }, { status: 400 })
    }
    if (!Number.isFinite(data.monthlyPrice) || data.monthlyPrice < 0) {
      return NextResponse.json({ success: false, error: "monthlyPrice invalide" }, { status: 400 })
    }

    const created = await prisma.subscriptionPlan.create({
      data,
      select: {
        id: true,
        code: true,
        name: true,
        tier: true,
        monthlyPrice: true,
        currency: true,
        isActive: true,
        isPublished: true,
        isVisible: true,
        badge: true,
        archivedAt: true,
        sortOrder: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({ success: true, data: created })
  } catch (error: any) {
    console.error("[POST /api/admin/abonnements]", error)
    return NextResponse.json(
      { success: false, error: error?.message || "Internal server error", code: "SERVER_ERROR" },
      { status: 500 }
    )
  }
}
