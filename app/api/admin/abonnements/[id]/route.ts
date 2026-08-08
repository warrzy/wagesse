import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthContext, unauthorized } from "@/lib/api-auth"

function isAdmin(role: string | null | undefined) {
  return role === "ADMIN" || role === "SUPER_ADMIN"
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = getAuthContext(request)
    if (!auth) return unauthorized()
    if (!isAdmin(auth.role)) return unauthorized("Forbidden")

    const { id } = await params

    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id },
      select: {
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
      },
    })

    if (!plan) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: plan })
  } catch (error) {
    console.error("[GET /api/admin/abonnements/[id]]", error)
    return NextResponse.json(
      { success: false, error: "Internal server error", code: "SERVER_ERROR" },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = getAuthContext(request)
    if (!auth) return unauthorized()
    if (!isAdmin(auth.role)) return unauthorized("Forbidden")

    const { id } = await params
    const body = await request.json()

    const data: any = {}

    if (body?.code !== undefined) data.code = body.code === null ? null : String(body.code)
    if (body?.name !== undefined) data.name = String(body.name)
    if (body?.tier !== undefined) data.tier = String(body.tier)
    if (body?.description !== undefined) data.description = body.description === null ? null : String(body.description)

    if (body?.monthlyPrice !== undefined) data.monthlyPrice = Number(body.monthlyPrice)
    if (body?.annualPrice !== undefined) data.annualPrice = body.annualPrice === null ? null : Number(body.annualPrice)
    if (body?.currency !== undefined) data.currency = String(body.currency)
    if (body?.trialDays !== undefined) data.trialDays = Number(body.trialDays)

    if (body?.monthlyCredits !== undefined) data.monthlyCredits = Number(body.monthlyCredits)
    if (body?.unlockCostCredits !== undefined) data.unlockCostCredits = Number(body.unlockCostCredits)
    if (body?.monthlyBoosts !== undefined) data.monthlyBoosts = Number(body.monthlyBoosts)
    if (body?.cycleDays !== undefined) data.cycleDays = Number(body.cycleDays)

    if (body?.benefits !== undefined) data.benefits = body.benefits
    if (body?.features !== undefined) data.features = body.features

    if (body?.platformCommissionRate !== undefined) data.platformCommissionRate = Number(body.platformCommissionRate)
    if (body?.sortOrder !== undefined) data.sortOrder = Number(body.sortOrder)

    if (body?.maxVehicles !== undefined) data.maxVehicles = Number(body.maxVehicles)
    if (body?.maxRequests !== undefined) data.maxRequests = body.maxRequests === null ? null : Number(body.maxRequests)
    if (body?.maxProposals !== undefined) data.maxProposals = body.maxProposals === null ? null : Number(body.maxProposals)

    if (body?.isActive !== undefined) data.isActive = Boolean(body.isActive)
    if (body?.isPublished !== undefined) data.isPublished = Boolean(body.isPublished)
    if (body?.isVisible !== undefined) data.isVisible = Boolean(body.isVisible)
    if (body?.badge !== undefined) data.badge = body.badge === null ? null : String(body.badge)
    if (body?.archive !== undefined) data.archivedAt = body.archive ? new Date() : null

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ success: false, error: "No changes" }, { status: 400 })
    }

    const updated = await prisma.subscriptionPlan.update({
      where: { id },
      data,
      select: {
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
      },
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error: any) {
    if (error?.code === "P2002") {
      const target = Array.isArray(error?.meta?.target) ? error.meta.target.join(",") : String(error?.meta?.target || "")
      if (target.includes("code") || target.includes("SubscriptionPlan_code_key")) {
        return NextResponse.json(
          { success: false, error: "Ce code est déjà utilisé par un autre plan." },
          { status: 409 }
        )
      }
    }

    console.error("[PATCH /api/admin/abonnements/[id]]", error)
    return NextResponse.json(
      { success: false, error: error?.message || "Internal server error", code: "SERVER_ERROR" },
      { status: 500 }
    )
  }
}
