import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthContext, unauthorized } from "@/lib/api-auth"
import { hashPassword } from "@/lib/auth"

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
    const truckerType = (searchParams.get("truckerType") || "").trim()
    const verificationStatus = (searchParams.get("verificationStatus") || "").trim()
    const isAvailable = asBool(searchParams.get("isAvailable"))
    const organizationId = (searchParams.get("organizationId") || "").trim()

    const createdFrom = (searchParams.get("createdFrom") || "").trim()
    const createdTo = (searchParams.get("createdTo") || "").trim()

    const sort = (searchParams.get("sort") || "createdAt_desc").trim()

    const where: any = {
      deletedAt: null,
    }

    if (truckerType) where.truckerType = truckerType
    if (verificationStatus) where.verificationStatus = verificationStatus
    if (isAvailable !== null) where.isAvailable = isAvailable
    if (organizationId) where.organization = { id: organizationId }

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
        { city: { contains: q } },
        { operatingLicense: { contains: q } },
        { orangeMoneyNumber: { contains: q } },
        { mobileMoneyNumber: { contains: q } },
        { user: { phone: { contains: q } } },
        { user: { email: { contains: q } } },
        { user: { firstName: { contains: q } } },
        { user: { lastName: { contains: q } } },
      ]
    }

    const orderBy: any[] = []
    if (sort === "rating_desc") orderBy.push({ averageRating: "desc" })
    else if (sort === "missions_desc") orderBy.push({ totalMissions: "desc" })
    else if (sort === "available_desc") orderBy.push({ isAvailable: "desc" })
    else if (sort === "createdAt_asc") orderBy.push({ createdAt: "asc" })
    else orderBy.push({ createdAt: "desc" })

    orderBy.push({ id: "desc" })

    const [total, items, organizations] = await Promise.all([
      prisma.truckerProfile.count({ where }),
      prisma.truckerProfile.findMany({
        where,
        orderBy,
        skip,
        take: pageSize,
        select: {
          id: true,
          userId: true,
          truckerType: true,
          city: true,
          verificationStatus: true,
          isAvailable: true,
          averageRating: true,
          totalRatings: true,
          totalMissions: true,
          acceptanceRate: true,
          cancellationRate: true,
          createdAt: true,
          user: { select: { id: true, firstName: true, lastName: true, phone: true, email: true, status: true, role: true, createdAt: true, lastLoginAt: true } },
          organization: { select: { id: true, name: true, city: true } },
          vehicles: {
            select: { id: true, licensePlate: true, vehicleType: true, capacityTonnes: true, isOperational: true },
            orderBy: { createdAt: "desc" },
            take: 3,
          },
          _count: {
            select: {
              vehicles: true,
              documents: true,
              missions: true,
              quotes: true,
              disputes: true,
              ratings: true,
            },
          },
        },
      }),
      prisma.organization.findMany({
        orderBy: { createdAt: "desc" },
        take: 50,
        select: { id: true, name: true, city: true },
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
          organizations,
        },
      },
    })
  } catch (error) {
    console.error("[GET /api/admin/camionneurs]", error)
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

    const body = await request.json().catch(() => null)
    if (!body || typeof body !== "object") {
      return NextResponse.json({ success: false, error: "Payload invalide" }, { status: 400 })
    }

    const email = String((body as any).email || "").trim().toLowerCase()
    const phone = String((body as any).phone || "").trim()
    const password = String((body as any).password || "")
    const firstName = ((body as any).firstName ?? null) === null ? null : String((body as any).firstName || "").trim() || null
    const lastName = ((body as any).lastName ?? null) === null ? null : String((body as any).lastName || "").trim() || null

    const city = String((body as any).city || "").trim()
    const truckerType = String((body as any).truckerType || "INDEPENDENT_DRIVER").trim()
    const organizationId = String((body as any).organizationId || "").trim() || null

    if (!email || !phone || !password || !city) {
      return NextResponse.json(
        { success: false, error: "Champs requis: email, phone, password, city" },
        { status: 400 }
      )
    }

    if (!/^(?=.*[A-Za-z])(?=.*[0-9]).{8,}$/.test(password)) {
      return NextResponse.json({ success: false, error: "Le mot de passe doit contenir au moins 8 caractères, une lettre et un chiffre" }, { status: 400 })
    }

    const hashed = await hashPassword(password)

    const created = await prisma.truckerProfile.create({
      data: {
        user: {
          create: {
            email,
            phone,
            password: hashed,
            firstName,
            lastName,
            role: "TRUCKER" as any,
            status: "ACTIVE" as any,
          },
        },
        city,
        truckerType: truckerType as any,
        ...(organizationId ? { organization: { connect: { id: organizationId } } } : {}),
      },
      select: {
        id: true,
        userId: true,
        truckerType: true,
        city: true,
        verificationStatus: true,
        isAvailable: true,
        createdAt: true,
        user: { select: { id: true, firstName: true, lastName: true, phone: true, email: true, status: true, role: true, createdAt: true, lastLoginAt: true } },
        organization: { select: { id: true, name: true, city: true } },
      },
    })

    return NextResponse.json({ success: true, data: created })
  } catch (error: any) {
    const msg = String(error?.message || "")
    if (msg.toLowerCase().includes("unique")) {
      return NextResponse.json(
        { success: false, error: "Email ou téléphone déjà utilisé" },
        { status: 409 }
      )
    }

    console.error("[POST /api/admin/camionneurs]", error)
    return NextResponse.json(
      { success: false, error: "Internal server error", code: "SERVER_ERROR" },
      { status: 500 }
    )
  }
}
