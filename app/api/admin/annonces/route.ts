import { NextRequest, NextResponse } from "next/server"
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
    const auth = getAuthContext(request)
    if (!auth) return unauthorized()
    if (!isAdmin(auth.role)) return unauthorized("Forbidden")

    const { searchParams } = new URL(request.url)

    const page = Math.max(parseInt(searchParams.get("page") || "1", 10), 1)
    const pageSize = Math.min(Math.max(parseInt(searchParams.get("pageSize") || "20", 10), 5), 100)
    const skip = (page - 1) * pageSize

    const q = (searchParams.get("q") || "").trim()
    const status = (searchParams.get("status") || "").trim()
    const materialId = (searchParams.get("materialId") || "").trim()
    const customerId = (searchParams.get("customerId") || "").trim()

    const createdFrom = (searchParams.get("createdFrom") || "").trim()
    const createdTo = (searchParams.get("createdTo") || "").trim()

    const hasQuotes = asBool(searchParams.get("hasQuotes"))
    const hasAssigned = asBool(searchParams.get("hasAssigned"))

    const sort = (searchParams.get("sort") || "createdAt_desc").trim()

    const where: any = {
      deletedAt: null,
    }

    if (status) where.status = status
    if (materialId) where.materialId = materialId
    if (customerId) where.customerId = customerId

    if (createdFrom || createdTo) {
      where.createdAt = {}
      if (createdFrom) where.createdAt.gte = new Date(createdFrom)
      if (createdTo) {
        const d = new Date(createdTo)
        d.setHours(23, 59, 59, 999)
        where.createdAt.lte = d
      }
    }

    if (hasQuotes === true) where.quotes = { some: {} }
    if (hasQuotes === false) where.quotes = { none: {} }

    if (hasAssigned === true) where.missions = { some: {} }
    if (hasAssigned === false) where.missions = { none: {} }

    if (q) {
      where.OR = [
        { id: { contains: q } },
        { pickupCity: { contains: q } },
        { dropoffCity: { contains: q } },
        { materialDescription: { contains: q } },
        { material: { name: { contains: q } } },
        {
          customer: {
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
    else if (sort === "quotes_desc") orderBy.push({ quotes: { _count: "desc" } })
    else if (sort === "quotes_asc") orderBy.push({ quotes: { _count: "asc" } })
    else if (sort === "status_asc") orderBy.push({ status: "asc" })
    else if (sort === "status_desc") orderBy.push({ status: "desc" })
    else orderBy.push({ createdAt: "desc" })

    orderBy.push({ id: "desc" })

    const [total, items, materials] = await Promise.all([
      prisma.transportRequest.count({ where }),
      prisma.transportRequest.findMany({
        where,
        orderBy,
        skip,
        take: pageSize,
        select: {
          id: true,
          pickupCity: true,
          dropoffCity: true,
          quantity: true,
          unit: true,
          requestedDate: true,
          createdAt: true,
          status: true,
          materialDescription: true,
          material: { select: { id: true, name: true } },
          customer: {
            select: {
              id: true,
              user: { select: { id: true, firstName: true, lastName: true, phone: true, email: true } },
            },
          },
          _count: { select: { quotes: true } },
          missions: {
            select: {
              id: true,
              status: true,
              trucker: { select: { id: true, user: { select: { id: true, firstName: true, lastName: true, phone: true } } } },
            },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      }),
      prisma.material.findMany({
        orderBy: { name: "asc" },
        select: { id: true, name: true },
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
          materials,
        },
      },
    })
  } catch (error) {
    console.error("[GET /api/admin/annonces]", error)
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

    const customerId = String(body?.customerId || "").trim()
    if (!customerId) {
      return NextResponse.json({ success: false, error: "customerId manquant" }, { status: 400 })
    }

    const data: any = {
      customerId,
      requestType: body?.requestType || "ONE_TIME",
      materialId: body?.materialId ? String(body.materialId) : null,
      materialDescription: body?.materialDescription ? String(body.materialDescription) : null,
      quantity: Number(body?.quantity ?? 0),
      unit: String(body?.unit || "TONNES"),
      pickupCity: String(body?.pickupCity || "").trim(),
      pickupProvince: body?.pickupProvince ? String(body.pickupProvince) : null,
      pickupDistrict: body?.pickupDistrict ? String(body.pickupDistrict) : null,
      pickupSector: body?.pickupSector ? String(body.pickupSector) : null,
      pickupLandmark: body?.pickupLandmark ? String(body.pickupLandmark) : null,
      dropoffCity: String(body?.dropoffCity || "").trim(),
      dropoffProvince: body?.dropoffProvince ? String(body.dropoffProvince) : null,
      dropoffDistrict: body?.dropoffDistrict ? String(body.dropoffDistrict) : null,
      dropoffSector: body?.dropoffSector ? String(body.dropoffSector) : null,
      dropoffLandmark: body?.dropoffLandmark ? String(body.dropoffLandmark) : null,
      requestedDate: body?.requestedDate ? new Date(body.requestedDate) : new Date(),
      urgency: body?.urgency || "STANDARD",
      truckTypePreference: body?.truckTypePreference ? String(body.truckTypePreference) : null,
      minCapacity: body?.minCapacity === undefined || body?.minCapacity === null ? null : Number(body.minCapacity),
      needsDriver: body?.needsDriver === undefined ? false : Boolean(body.needsDriver),
      numberOfTrucks: Number(body?.numberOfTrucks ?? 1),
      numberOfTrips: body?.numberOfTrips === undefined || body?.numberOfTrips === null ? null : Number(body.numberOfTrips),
      budgetEstimate: body?.budgetEstimate === undefined || body?.budgetEstimate === null ? null : Number(body.budgetEstimate),
      currencyCode: String(body?.currencyCode || "XOF"),
      notes: body?.notes ? String(body.notes) : null,
      status: String(body?.status || "DRAFT"),
    }

    if (!data.pickupCity) {
      return NextResponse.json({ success: false, error: "pickupCity manquant" }, { status: 400 })
    }
    if (!data.dropoffCity) {
      return NextResponse.json({ success: false, error: "dropoffCity manquant" }, { status: 400 })
    }
    if (!Number.isFinite(data.quantity) || data.quantity <= 0) {
      return NextResponse.json({ success: false, error: "quantity invalide" }, { status: 400 })
    }

    const created = await prisma.transportRequest.create({
      data,
      select: {
        id: true,
        status: true,
        pickupCity: true,
        dropoffCity: true,
        quantity: true,
        unit: true,
        requestedDate: true,
        createdAt: true,
        customerId: true,
      },
    })

    return NextResponse.json({ success: true, data: created })
  } catch (error: any) {
    console.error("[POST /api/admin/annonces]", error)
    return NextResponse.json(
      { success: false, error: error?.message || "Internal server error", code: "SERVER_ERROR" },
      { status: 500 }
    )
  }
}
