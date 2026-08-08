import { NextRequest, NextResponse } from "next/server"
import type { MissionStatus } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { getAuthContext, unauthorized } from "@/lib/api-auth"
import { generateReference } from "@/lib/auth"

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
    const auth = getAuthContext(request)
    if (!auth) return unauthorized()
    if (!isAdmin(auth.role)) return unauthorized("Forbidden")

    const { searchParams } = new URL(request.url)

    const page = Math.max(parseInt(searchParams.get("page") || "1", 10), 1)
    const pageSize = Math.min(Math.max(parseInt(searchParams.get("pageSize") || "20", 10), 5), 100)
    const skip = (page - 1) * pageSize

    const q = (searchParams.get("q") || "").trim()
    const status = (searchParams.get("status") || "").trim()
    const customerId = (searchParams.get("customerId") || "").trim()
    const truckerId = (searchParams.get("truckerId") || "").trim()

    const scheduledFrom = (searchParams.get("scheduledFrom") || "").trim()
    const scheduledTo = (searchParams.get("scheduledTo") || "").trim()

    const hasPayment = asBool(searchParams.get("hasPayment"))

    const sort = (searchParams.get("sort") || "createdAt_desc").trim()

    const where: any = {}

    if (status) where.status = status
    if (customerId) where.customerId = customerId
    if (truckerId) where.truckerId = truckerId

    if (scheduledFrom || scheduledTo) {
      where.scheduledDate = {}
      if (scheduledFrom) where.scheduledDate.gte = new Date(scheduledFrom)
      if (scheduledTo) {
        const d = new Date(scheduledTo)
        d.setHours(23, 59, 59, 999)
        where.scheduledDate.lte = d
      }
    }

    if (hasPayment === true) where.paymentId = { not: null }
    if (hasPayment === false) where.paymentId = null

    if (q) {
      where.OR = [
        { id: { contains: q } },
        { missionReference: { contains: q } },
        { requestId: { contains: q } },
        { vehicle: { licensePlate: { contains: q } } },
        { request: { pickupCity: { contains: q } } },
        { request: { dropoffCity: { contains: q } } },
        { customer: { user: { phone: { contains: q } } } },
        { trucker: { user: { phone: { contains: q } } } },
        { customer: { user: { email: { contains: q } } } },
        { trucker: { user: { email: { contains: q } } } },
      ]
    }

    const orderBy: any[] = []
    if (sort === "scheduled_asc") orderBy.push({ scheduledDate: "asc" })
    else if (sort === "scheduled_desc") orderBy.push({ scheduledDate: "desc" })
    else if (sort === "status_asc") orderBy.push({ status: "asc" })
    else if (sort === "status_desc") orderBy.push({ status: "desc" })
    else if (sort === "createdAt_asc") orderBy.push({ createdAt: "asc" })
    else orderBy.push({ createdAt: "desc" })

    orderBy.push({ id: "desc" })

    const [total, items, truckers] = await Promise.all([
      prisma.mission.count({ where }),
      prisma.mission.findMany({
        where,
        orderBy,
        skip,
        take: pageSize,
        select: {
          id: true,
          missionReference: true,
          status: true,
          createdAt: true,
          scheduledDate: true,
          startDate: true,
          endDate: true,
          contractPrice: true,
          contractCurrency: true,
          requestId: true,
          customer: {
            select: { id: true, user: { select: { id: true, firstName: true, lastName: true, phone: true, email: true } } },
          },
          trucker: {
            select: { id: true, verificationStatus: true, user: { select: { id: true, firstName: true, lastName: true, phone: true, email: true } } },
          },
          vehicle: { select: { id: true, licensePlate: true, capacityTonnes: true, isOperational: true } },
          request: {
            select: {
              id: true,
              pickupCity: true,
              dropoffCity: true,
              quantity: true,
              unit: true,
              materialDescription: true,
              material: { select: { id: true, name: true } },
              status: true,
            },
          },
          payment: {
            select: {
              id: true,
              reference: true,
              status: true,
              type: true,
              amount: true,
              currency: true,
              providerName: true,
              initiatedAt: true,
              confirmedAt: true,
            },
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
    console.error("[GET /api/admin/transports]", error)
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

    const requestId = String(body?.requestId || "").trim()
    const truckerId = String(body?.truckerId || "").trim()
    const vehicleId = String(body?.vehicleId || "").trim()

    if (!requestId) {
      return NextResponse.json({ success: false, error: "requestId manquant" }, { status: 400 })
    }
    if (!truckerId) {
      return NextResponse.json({ success: false, error: "truckerId manquant" }, { status: 400 })
    }
    if (!vehicleId) {
      return NextResponse.json({ success: false, error: "vehicleId manquant" }, { status: 400 })
    }

    const contractPrice = Number(body?.contractPrice ?? 0)
    if (!Number.isFinite(contractPrice) || contractPrice <= 0) {
      return NextResponse.json({ success: false, error: "contractPrice invalide" }, { status: 400 })
    }

    const scheduledDate = body?.scheduledDate ? new Date(body.scheduledDate) : null
    if (!scheduledDate || Number.isNaN(scheduledDate.getTime())) {
      return NextResponse.json({ success: false, error: "scheduledDate invalide" }, { status: 400 })
    }

    const req = await prisma.transportRequest.findUnique({
      where: { id: requestId },
      select: {
        id: true,
        customerId: true,
        pickupCity: true,
        pickupSector: true,
        dropoffCity: true,
        dropoffSector: true,
        materialDescription: true,
        quantity: true,
        unit: true,
        currencyCode: true,
      },
    })

    if (!req) {
      return NextResponse.json({ success: false, error: "Annonce introuvable" }, { status: 404 })
    }

    const pickupLocation = [req.pickupCity, req.pickupSector].filter(Boolean).join(", ")
    const dropoffLocation = [req.dropoffCity, req.dropoffSector].filter(Boolean).join(", ")

    const platformCommissionRate = body?.platformCommissionRate === undefined || body?.platformCommissionRate === null
      ? 0.1
      : Number(body.platformCommissionRate)

    const platformCommission = body?.platformCommission === undefined || body?.platformCommission === null
      ? contractPrice * platformCommissionRate
      : Number(body.platformCommission)

    const status = String(body?.status || "DRAFT") as MissionStatus

    const created = await prisma.mission.create({
      data: {
        requestId,
        customerId: req.customerId,
        truckerId,
        vehicleId,
        missionReference: generateReference("MIS"),
        contractMaterial: req.materialDescription,
        contractQuantity: req.quantity,
        contractUnit: req.unit,
        contractPrice,
        contractCurrency: String(body?.contractCurrency || req.currencyCode || "XOF"),
        scheduledDate,
        pickupLocation,
        dropoffLocation,
        status,
        platformCommissionRate,
        platformCommission,
        statusHistory: {
          create: {
            previousStatus: null,
            newStatus: status,
            reason: "ADMIN_CREATE",
            changedBy: auth.userId,
          },
        },
      },
      select: {
        id: true,
        missionReference: true,
        status: true,
        scheduledDate: true,
        contractPrice: true,
        contractCurrency: true,
        requestId: true,
        customerId: true,
        truckerId: true,
        vehicleId: true,
        createdAt: true,
      },
    })

    return NextResponse.json({ success: true, data: created })
  } catch (error: any) {
    console.error("[POST /api/admin/transports]", error)
    return NextResponse.json(
      { success: false, error: error?.message || "Internal server error", code: "SERVER_ERROR" },
      { status: 500 }
    )
  }
}
