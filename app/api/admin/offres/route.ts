import { NextRequest, NextResponse } from "next/server"
import type { QuoteStatus } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { getAuthContext, unauthorized } from "@/lib/api-auth"

function isAdmin(role: string | null | undefined) {
  return role === "ADMIN" || role === "SUPER_ADMIN"
}

function asBool(v: string | null) {
  if (v === null) return null
  if (v === "true" || v === "1") return true
  if (v === "false" || v === "0") return false
  return null
}

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if (!auth) return unauthorized()
    if (!isAdmin(auth.role)) return unauthorized("Forbidden")

    const { searchParams } = new URL(request.url)

    const page = Math.max(parseInt(searchParams.get("page") || "1", 10), 1)
    const pageSize = Math.min(Math.max(parseInt(searchParams.get("pageSize") || "20", 10), 5), 100)
    const skip = (page - 1) * pageSize

    const q = (searchParams.get("q") || "").trim()
    const status = (searchParams.get("status") || "").trim()
    const requestId = (searchParams.get("requestId") || "").trim()
    const truckerId = (searchParams.get("truckerId") || "").trim()
    const customerId = (searchParams.get("customerId") || "").trim()

    const createdFrom = (searchParams.get("createdFrom") || "").trim()
    const createdTo = (searchParams.get("createdTo") || "").trim()

    const accepted = asBool(searchParams.get("accepted"))

    const sort = (searchParams.get("sort") || "createdAt_desc").trim()

    const where: any = {}

    if (status) where.status = status
    if (requestId) where.requestId = requestId
    if (truckerId) where.truckerId = truckerId
    if (customerId) where.request = { customerId }

    if (accepted === true) where.status = "ACCEPTED"
    if (accepted === false) where.status = { not: "ACCEPTED" }

    if (createdFrom || createdTo) {
      where.createdAt = {}
      if (createdFrom) where.createdAt.gte = new Date(createdFrom)
      if (createdTo) {
        const d = new Date(createdTo)
        d.setHours(23, 59, 59, 999)
        where.createdAt.lte = d
      }
    }

    if (q) {
      where.OR = [
        { id: { contains: q } },
        { requestId: { contains: q } },
        {
          request: {
            OR: [
              { pickupCity: { contains: q } },
              { dropoffCity: { contains: q } },
              { customer: { user: { phone: { contains: q } } } },
              { customer: { user: { email: { contains: q } } } },
              { customer: { user: { firstName: { contains: q } } } },
              { customer: { user: { lastName: { contains: q } } } },
            ],
          },
        },
        {
          trucker: {
            user: {
              OR: [
                { phone: { contains: q } },
                { email: { contains: q } },
                { firstName: { contains: q } },
                { lastName: { contains: q } },
              ],
            },
          },
        },
      ]
    }

    const orderBy: any[] = []
    if (sort === "createdAt_asc") orderBy.push({ createdAt: "asc" })
    else if (sort === "price_desc") orderBy.push({ totalPrice: "desc" })
    else if (sort === "price_asc") orderBy.push({ totalPrice: "asc" })
    else if (sort === "status_asc") orderBy.push({ status: "asc" })
    else if (sort === "status_desc") orderBy.push({ status: "desc" })
    else orderBy.push({ createdAt: "desc" })

    orderBy.push({ id: "desc" })

    const [total, items, truckers] = await Promise.all([
      prisma.quote.count({ where }),
      prisma.quote.findMany({
        where,
        orderBy,
        skip,
        take: pageSize,
        select: {
          id: true,
          requestId: true,
          truckerId: true,
          createdAt: true,
          status: true,
          totalPrice: true,
          currencyCode: true,
          proposedDate: true,
          vehicle: { select: { id: true, licensePlate: true, capacityTonnes: true, isOperational: true } },
          request: {
            select: {
              id: true,
              pickupCity: true,
              dropoffCity: true,
              customerId: true,
              customer: {
                select: {
                  id: true,
                  user: { select: { id: true, firstName: true, lastName: true, phone: true, email: true } },
                },
              },
            },
          },
          trucker: {
            select: {
              id: true,
              verificationStatus: true,
              user: { select: { id: true, firstName: true, lastName: true, phone: true, email: true } },
            },
          },
          missions: {
            select: { id: true, status: true, createdAt: true, missionReference: true },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      }),
      prisma.truckerProfile.findMany({
        orderBy: { createdAt: "desc" },
        take: 50,
        select: {
          id: true,
          user: { select: { firstName: true, lastName: true, phone: true } },
        },
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
        filters: {
          truckers,
        },
      },
    })
  } catch (error) {
    console.error("[GET /api/admin/offres]", error)
    return NextResponse.json(
      { success: false, error: "Internal server error", code: "SERVER_ERROR" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if (!auth) return unauthorized()
    if (!isAdmin(auth.role)) return unauthorized("Forbidden")

    const body = await request.json()

    const requestId = String(body?.requestId || "").trim()
    const truckerId = String(body?.truckerId || "").trim()

    if (!requestId) {
      return NextResponse.json({ success: false, error: "requestId manquant" }, { status: 400 })
    }
    if (!truckerId) {
      return NextResponse.json({ success: false, error: "truckerId manquant" }, { status: 400 })
    }

    const totalPrice = Number(body?.totalPrice ?? 0)
    if (!Number.isFinite(totalPrice) || totalPrice <= 0) {
      return NextResponse.json({ success: false, error: "totalPrice invalide" }, { status: 400 })
    }

    const proposedDate = body?.proposedDate ? new Date(body.proposedDate) : null
    const validUntil = body?.validUntil ? new Date(body.validUntil) : null
    if (!proposedDate || Number.isNaN(proposedDate.getTime())) {
      return NextResponse.json({ success: false, error: "proposedDate invalide" }, { status: 400 })
    }
    if (!validUntil || Number.isNaN(validUntil.getTime())) {
      return NextResponse.json({ success: false, error: "validUntil invalide" }, { status: 400 })
    }

    const created = await prisma.quote.create({
      data: {
        requestId,
        truckerId,
        vehicleId: body?.vehicleId ? String(body.vehicleId) : null,
        materialId: body?.materialId ? String(body.materialId) : null,
        totalPrice,
        pricePerTrip: body?.pricePerTrip === undefined || body?.pricePerTrip === null ? null : Number(body.pricePerTrip),
        numberOfTrips: Number(body?.numberOfTrips ?? 1),
        currencyCode: String(body?.currencyCode || "XOF"),
        proposedDate,
        estimatedDuration: body?.estimatedDuration ? String(body.estimatedDuration) : null,
        validUntil,
        comments: body?.comments ? String(body.comments) : null,
        specialConditions: body?.specialConditions ? String(body.specialConditions) : null,
        status: String(body?.status || "PENDING") as QuoteStatus,
      },
      select: {
        id: true,
        requestId: true,
        truckerId: true,
        status: true,
        totalPrice: true,
        currencyCode: true,
        proposedDate: true,
        validUntil: true,
        createdAt: true,
      },
    })

    return NextResponse.json({ success: true, data: created })
  } catch (error: any) {
    console.error("[POST /api/admin/offres]", error)
    return NextResponse.json(
      { success: false, error: error?.message || "Internal server error", code: "SERVER_ERROR" },
      { status: 500 }
    )
  }
}
