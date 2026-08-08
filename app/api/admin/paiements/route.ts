import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthContext, unauthorized } from "@/lib/api-auth"

function isAdmin(role: string | null | undefined) {
  return role === "ADMIN" || role === "SUPER_ADMIN"
}

export async function GET(request: NextRequest) {
  try {
    const auth = getAuthContext(request)
    if (!auth) return unauthorized()
    if (!isAdmin(auth.role)) return unauthorized("Forbidden")

    const { searchParams } = new URL(request.url)

    const page = Math.max(parseInt(searchParams.get("page") || "1", 10), 1)
    const pageSize = Math.min(Math.max(parseInt(searchParams.get("pageSize") || "20", 10), 5), 100)
    const skip = (page - 1) * pageSize

    const q = (searchParams.get("q") || "").trim()
    const status = (searchParams.get("status") || "").trim()
    const type = (searchParams.get("type") || "").trim()
    const providerName = (searchParams.get("providerName") || "").trim()
    const payer = (searchParams.get("payer") || "").trim()
    const customerId = (searchParams.get("customerId") || "").trim()
    const missionId = (searchParams.get("missionId") || "").trim()

    const initiatedFrom = (searchParams.get("initiatedFrom") || "").trim()
    const initiatedTo = (searchParams.get("initiatedTo") || "").trim()

    const sort = (searchParams.get("sort") || "initiatedAt_desc").trim()

    const where: any = {}

    if (status) where.status = status
    if (type) where.type = type
    if (providerName) where.providerName = providerName
    if (payer) where.payer = payer
    if (customerId) where.customerId = customerId
    if (missionId) where.missionId = missionId

    if (initiatedFrom || initiatedTo) {
      where.initiatedAt = {}
      if (initiatedFrom) where.initiatedAt.gte = new Date(initiatedFrom)
      if (initiatedTo) {
        const d = new Date(initiatedTo)
        d.setHours(23, 59, 59, 999)
        where.initiatedAt.lte = d
      }
    }

    if (q) {
      where.OR = [
        { id: { contains: q } },
        { reference: { contains: q } },
        { providerReference: { contains: q } },
        { providerName: { contains: q } },
        { payer: { contains: q } },
        { description: { contains: q } },
        { missionId: { contains: q } },
        { customer: { user: { phone: { contains: q } } } },
        { customer: { user: { email: { contains: q } } } },
        { customer: { user: { firstName: { contains: q } } } },
        { customer: { user: { lastName: { contains: q } } } },
      ]
    }

    const orderBy: any[] = []
    if (sort === "amount_desc") orderBy.push({ amount: "desc" })
    else if (sort === "amount_asc") orderBy.push({ amount: "asc" })
    else if (sort === "confirmedAt_desc") orderBy.push({ confirmedAt: "desc" })
    else if (sort === "confirmedAt_asc") orderBy.push({ confirmedAt: "asc" })
    else if (sort === "status_asc") orderBy.push({ status: "asc" })
    else if (sort === "status_desc") orderBy.push({ status: "desc" })
    else if (sort === "initiatedAt_asc") orderBy.push({ initiatedAt: "asc" })
    else orderBy.push({ initiatedAt: "desc" })

    orderBy.push({ id: "desc" })

    const [total, items] = await Promise.all([
      prisma.payment.count({ where }),
      prisma.payment.findMany({
        where,
        orderBy,
        skip,
        take: pageSize,
        select: {
          id: true,
          payer: true,
          customerId: true,
          amount: true,
          currency: true,
          type: true,
          description: true,
          reference: true,
          providerName: true,
          providerReference: true,
          status: true,
          platformFee: true,
          providerFee: true,
          missionId: true,
          initiatedAt: true,
          confirmedAt: true,
          failedAt: true,
          expiresAt: true,
          lastAttemptAt: true,
          customer: {
            select: {
              id: true,
              user: { select: { id: true, firstName: true, lastName: true, phone: true, email: true } },
            },
          },
          mission: {
            select: { id: true, missionReference: true, status: true, requestId: true, createdAt: true },
          },
          subscriptionPayment: {
            select: { id: true, subscriptionId: true, status: true, paidAt: true },
          },
          _count: {
            select: {
              attempts: true,
              refunds: true,
            },
          },
        },
      }),
    ])

    const payerIds = Array.from(new Set(items.map((p) => p.payer).filter(Boolean)))
    const payerUsers = payerIds.length
      ? await prisma.user.findMany({
          where: { id: { in: payerIds } },
          select: { id: true, firstName: true, lastName: true, phone: true, email: true, role: true, status: true },
        })
      : []

    const payerById: Record<string, any> = {}
    for (const u of payerUsers) payerById[u.id] = u

    const enriched = items.map((p) => ({
      ...p,
      payerUser: payerById[p.payer] || null,
    }))

    return NextResponse.json({
      success: true,
      data: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
        items: enriched,
      },
    })
  } catch (error) {
    console.error("[GET /api/admin/paiements]", error)
    return NextResponse.json(
      { success: false, error: "Internal server error", code: "SERVER_ERROR" },
      { status: 500 }
    )
  }
}
